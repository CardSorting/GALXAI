import type { Pool, PoolClient } from 'pg';
import { getPostgresPool } from '@/lib/db/postgres';

export interface AccountProfileDto {
  displayName: string | null;
  locale: string;
  timezone: string;
  revision: number;
}

export class AccountProfileConflictError extends Error {
  constructor() {
    super('ACCOUNT_PROFILE_CONFLICT');
    this.name = 'AccountProfileConflictError';
  }
}

export class AccountProfileNotFoundError extends Error {
  constructor() {
    super('ACCOUNT_PROFILE_NOT_FOUND');
    this.name = 'AccountProfileNotFoundError';
  }
}

type AccountProfileDatabase = Pick<Pool, 'query' | 'connect'>;

type ProfileRow = {
  display_name: string | null;
  locale: string;
  timezone: string;
  revision: string | number;
};

/**
 * Server-only account profile projection. It deliberately returns a small
 * product DTO instead of exposing owner keys, profile UUIDs, or classifications.
 */
export class AccountProfileRepository {
  private static instance: AccountProfileRepository | undefined;

  constructor(private readonly database: AccountProfileDatabase | null = getPostgresPool()) {}

  static getInstance(): AccountProfileRepository {
    if (!AccountProfileRepository.instance) {
      AccountProfileRepository.instance = new AccountProfileRepository();
    }
    return AccountProfileRepository.instance;
  }

  private db(): AccountProfileDatabase {
    if (!this.database) throw new Error('ACCOUNT_PROFILE_STORAGE_UNAVAILABLE');
    return this.database;
  }

  private static map(row: ProfileRow, fallbackName?: string): AccountProfileDto {
    return {
      displayName: row.display_name || fallbackName || null,
      locale: row.locale,
      timezone: row.timezone,
      revision: Number(row.revision),
    };
  }

  private async ensure(ownerKey: string, authUserId: string): Promise<void> {
    await this.db().query(
      `SELECT private.galx_ensure_account_profile(
        $1,
        $2::uuid,
        'human'::private.galx_account_class
      ) AS profile_id`,
      [ownerKey, authUserId],
    );
  }

  async get(ownerKey: string, authUserId: string, fallbackName?: string): Promise<AccountProfileDto> {
    let result = await this.db().query<ProfileRow>(
      `SELECT p.display_name, pref.locale, pref.timezone, p.revision
       FROM private.galx_account_profiles AS p
       JOIN private.galx_account_profile_preferences AS pref ON pref.profile_id = p.id
       WHERE p.owner_key = $1
       LIMIT 1`,
      [ownerKey],
    );

    // This is a compatibility repair for accounts created before the registry
    // migration. It remains idempotent and does not make a browser-facing RPC.
    if (!result.rows[0]) {
      await this.ensure(ownerKey, authUserId);
      result = await this.db().query<ProfileRow>(
        `SELECT p.display_name, pref.locale, pref.timezone, p.revision
         FROM private.galx_account_profiles AS p
         JOIN private.galx_account_profile_preferences AS pref ON pref.profile_id = p.id
         WHERE p.owner_key = $1
         LIMIT 1`,
        [ownerKey],
      );
    }

    const row = result.rows[0];
    if (!row) throw new AccountProfileNotFoundError();
    return AccountProfileRepository.map(row, fallbackName);
  }

  async update(input: {
    ownerKey: string;
    expectedRevision: number;
    displayName: string | null;
    locale: string;
    timezone: string;
  }): Promise<AccountProfileDto> {
    const client: PoolClient = await this.db().connect();
    try {
      await client.query("BEGIN; SET LOCAL statement_timeout = '5s'; SET LOCAL lock_timeout = '3s';");
      const current = await client.query<{ id: string; revision: string | number }>(
        `SELECT id, revision
         FROM private.galx_account_profiles
         WHERE owner_key = $1
         FOR UPDATE`,
        [input.ownerKey],
      );
      const profile = current.rows[0];
      if (!profile) throw new AccountProfileNotFoundError();
      if (Number(profile.revision) !== input.expectedRevision) {
        throw new AccountProfileConflictError();
      }

      await client.query(
        `INSERT INTO private.galx_account_profile_preferences (profile_id)
         VALUES ($1)
         ON CONFLICT (profile_id) DO NOTHING`,
        [profile.id],
      );
      await client.query(
        `UPDATE private.galx_account_profiles
         SET display_name = $2, revision = revision + 1
         WHERE id = $1 AND revision = $3`,
        [profile.id, input.displayName, input.expectedRevision],
      );
      await client.query(
        `UPDATE private.galx_account_profile_preferences
         SET locale = $2, timezone = $3, revision = revision + 1
         WHERE profile_id = $1`,
        [profile.id, input.locale, input.timezone],
      );

      const updated = await client.query<ProfileRow>(
        `SELECT p.display_name, pref.locale, pref.timezone, p.revision
         FROM private.galx_account_profiles AS p
         JOIN private.galx_account_profile_preferences AS pref ON pref.profile_id = p.id
         WHERE p.id = $1`,
        [profile.id],
      );
      if (!updated.rows[0]) throw new AccountProfileNotFoundError();
      await client.query('COMMIT');
      return AccountProfileRepository.map(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
