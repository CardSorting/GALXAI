/** Private central-management inventory. No credential reads or runtime fallback. */
import { Pool } from 'pg';
import { getPostgresSslConfig } from '../../db/postgres';
import type { GalxRelayPoolId } from '../types';

export const ACCOUNT_AUTHORITY_PROJECT = 'mazhcjisettrzbqhorvp';
export interface RelayPoolInventory {
  pool: GalxRelayPoolId;
  accountClass: 'paid' | 'free';
  workloads: Array<'text' | 'sites' | 'images'>;
  registrationEnabled: boolean;
  installations: number;
  assignments: number;
  savedRegistrations: number;
}
export function assertCentralAccountDatabase(connectionString: string | undefined): void {
  let connection: URL;
  try { connection = new URL(connectionString || ''); } catch { throw Error('Central account database is not configured.'); }
  const direct = connection.hostname === `db.${ACCOUNT_AUTHORITY_PROJECT}.supabase.co`;
  const pooled = connection.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(connection.username).endsWith(`.${ACCOUNT_AUTHORITY_PROJECT}`);
  if (!['postgres:', 'postgresql:'].includes(connection.protocol) || (!direct && !pooled)) {
    throw Error('Account management requires the main GALXAI database.');
  }
}
const SQL = `SELECT p.id,p.account_class,p.workloads,p.registration_enabled,
  (SELECT count(*)::integer FROM private.galx_relay_installations i WHERE i.pool_id=p.id) AS installations,
  (SELECT count(*)::integer FROM private.galx_relay_account_assignments a WHERE a.pool_id=p.id) AS assignments,
  (SELECT count(*)::integer FROM private.galx_relay_registration_operations o WHERE o.pool_id=p.id) AS saved_registrations
  FROM private.galx_relay_pools p WHERE p.id='premium'`;
export function decodeRelayPoolInventory(rows: Record<string, unknown>[]): RelayPoolInventory[] {
  if (rows.length !== 1 || rows[0]?.id !== 'premium') throw Error('Central relay foundation is incomplete.');
  return rows.map(row => {
    const expected = ['text', 'sites', 'images'];
    if (row.id !== 'premium' || row.account_class !== 'paid' || JSON.stringify(row.workloads) !== JSON.stringify(expected)
      || typeof row.registration_enabled !== 'boolean' || ![row.installations,row.assignments,row.saved_registrations].every(n => Number.isSafeInteger(n) && Number(n) >= 0)) {
      throw Error('Invalid central relay inventory.');
    }
    return { pool: row.id, accountClass: row.account_class as 'paid' | 'free', workloads: expected as RelayPoolInventory['workloads'],
      registrationEnabled: row.registration_enabled, installations: row.installations as number,
      assignments: row.assignments as number, savedRegistrations: row.saved_registrations as number };
  });
}
export class RelayAccountInventoryRepository {
  async read(): Promise<RelayPoolInventory[]> {
    const connectionString = process.env.DATABASE_URL;
    assertCentralAccountDatabase(connectionString);
    // Bind a dedicated short-lived connection to the validated URL. A shared
    // process pool could have been initialized with a different database URL.
    const connection = new Pool({ connectionString, ssl: getPostgresSslConfig(), max: 1,
      connectionTimeoutMillis: 5000, statement_timeout: 5000, query_timeout: 6000,
      application_name: 'galx-central-relay-inventory' });
    try { return decodeRelayPoolInventory((await connection.query(SQL)).rows); }
    catch { throw Error('Central relay inventory is unavailable or invalid. No fallback account registry was used.'); }
    finally { await connection.end(); }
  }
}
