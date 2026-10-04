import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { getPostgresPool } from '@/lib/db/postgres';
import { CONNECT_SCOPE, ConnectError, clientById, validRedirect, type ConnectConfig } from '@/lib/connect/config';
import { NovaError, type NovaAccess, type NovaState } from '@/lib/nova/contract';

export const connectHash = (value: string) => createHash('sha256').update(value).digest('hex');
export const connectSecret = () => randomBytes(32).toString('base64url');
export type ConnectAuthorization = { id: string; client_id: string; redirect_uri: string; resource: string; state: string; challenge: string };
type Grant = { id: string; user_id: string; client_id: string; resource: string; scope: string; revoked_at: Date | null };
export type ConnectTokenDTO = { access_token: string; token_type: 'Bearer'; expires_in: number; refresh_token: string; scope: string };

/** Durable single authority; no cached grants, ambiguous-write replay, or Data API fallback. */
export class ConnectRepository implements NovaAccess {
  constructor(private readonly config: ConnectConfig, private readonly database: Pool | null = getPostgresPool()) {}
  private db(): Pool { if (!this.database) throw new ConnectError('temporarily_unavailable', 503); return this.database; }
  private async transaction<T>(work: (db: PoolClient) => Promise<T>): Promise<T> {
    const db = await this.db().connect();
    let failed = false;
    try {
      await db.query('BEGIN');
      await db.query("SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='2s'; SET LOCAL idle_in_transaction_session_timeout='6s'");
      const result = await work(db);
      await db.query('COMMIT');
      return result;
    } catch (error) {
      try { await db.query('ROLLBACK'); } catch { failed = true; }
      throw error;
    } finally { db.release(failed); }
  }
  async entitled(userId: string): Promise<boolean> {
    const result = await this.db().query('SELECT enabled AND valid_until>clock_timestamp() AS active FROM private.galx_inference_access WHERE user_id=$1', [userId]);
    return result.rows[0]?.active === true;
  }
  async begin(input: Omit<ConnectAuthorization, 'id'>, browserHash: string): Promise<string> {
    return this.transaction(async db => {
      const lock = await db.query("SELECT pg_try_advisory_xact_lock(hashtextextended('galx-connect-start',0)) AS held");
      if (!lock.rows[0].held) throw new ConnectError('temporarily_unavailable', 429);
      await db.query('DELETE FROM private.galx_connect_requests WHERE id IN (SELECT id FROM private.galx_connect_requests WHERE expires_at<now() ORDER BY expires_at LIMIT 200)');
      const count = await db.query('SELECT count(*)::int AS total, count(*) FILTER (WHERE client_id=$1)::int AS client FROM private.galx_connect_requests WHERE created_at>now()-interval \'1 minute\'', [input.client_id]);
      if (count.rows[0].total >= 1000 || count.rows[0].client >= 100) throw new ConnectError('temporarily_unavailable', 429);
      const id = randomUUID();
      await db.query('INSERT INTO private.galx_connect_requests (id,client_id,redirect_uri,resource,state,challenge,browser_hash) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [id, input.client_id, input.redirect_uri, input.resource, input.state, input.challenge, browserHash]);
      return id;
    });
  }
  async authorization(id: string, browserHash: string): Promise<ConnectAuthorization> {
    const result = await this.db().query<ConnectAuthorization>('SELECT id,client_id,redirect_uri,resource,state,challenge FROM private.galx_connect_requests WHERE id=$1 AND browser_hash=$2 AND expires_at>clock_timestamp() AND decided_at IS NULL', [id, browserHash]);
    const row = result.rows[0];
    if (!row || row.resource !== this.config.resource || !validRedirect(clientById(this.config, row.client_id), row.redirect_uri)) throw new ConnectError('invalid_request');
    return row;
  }
  async decide(id: string, browserHash: string, userId: string, allow: boolean): Promise<string> {
    return this.transaction(async db => {
      const result = await db.query<ConnectAuthorization>('SELECT id,client_id,redirect_uri,resource,state,challenge FROM private.galx_connect_requests WHERE id=$1 AND browser_hash=$2 AND expires_at>clock_timestamp() AND decided_at IS NULL FOR UPDATE', [id, browserHash]);
      const request = result.rows[0];
      if (!request || request.resource !== this.config.resource || !validRedirect(clientById(this.config, request.client_id), request.redirect_uri)) throw new ConnectError('invalid_request');
      const redirect = new URL(request.redirect_uri);
      redirect.searchParams.set('state', request.state);
      redirect.searchParams.set('iss', this.config.issuer);
      if (allow) {
        // Serialize creation with re-consent without reactivating an old revoked grant.
        await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`connect:${userId}:${request.client_id}`]);
        const existing = await db.query<Grant>('SELECT id,user_id,client_id,resource,scope,revoked_at FROM private.galx_connect_grants WHERE user_id=$1 AND client_id=$2 AND revoked_at IS NULL FOR UPDATE', [userId, request.client_id]);
        let grant = existing.rows[0];
        if (grant && grant.resource !== request.resource) throw new ConnectError('invalid_target');
        if (!grant) {
          grant = (await db.query<Grant>('INSERT INTO private.galx_connect_grants (id,user_id,client_id,resource) VALUES ($1,$2,$3,$4) RETURNING id,user_id,client_id,resource,scope,revoked_at', [randomUUID(), userId, request.client_id, request.resource])).rows[0];
        }
        const code = connectSecret();
        await db.query('INSERT INTO private.galx_connect_codes (code_hash,grant_id,redirect_uri,challenge) VALUES ($1,$2,$3,$4)', [connectHash(code), grant.id, request.redirect_uri, request.challenge]);
        redirect.searchParams.set('code', code);
      } else redirect.searchParams.set('error', 'access_denied');
      await db.query('UPDATE private.galx_connect_requests SET decided_at=now() WHERE id=$1', [id]);
      return redirect.href;
    });
  }
  private async lockGrant(db: PoolClient, id: string, clientId?: string): Promise<Grant | undefined> {
    const row = (await db.query<Grant>('SELECT id,user_id,client_id,resource,scope,revoked_at FROM private.galx_connect_grants WHERE id=$1 FOR UPDATE', [id])).rows[0];
    return row && !row.revoked_at && row.resource === this.config.resource && row.scope === CONNECT_SCOPE && (!clientId || row.client_id === clientId) ? row : undefined;
  }
  private async issue(db: PoolClient, grantId: string, refreshExpiry?: Date): Promise<ConnectTokenDTO> {
    const access = `galx_connect_at_${connectSecret()}`, refresh = `galx_connect_rt_${connectSecret()}`;
    await db.query('INSERT INTO private.galx_connect_tokens (access_hash,refresh_hash,grant_id,refresh_expires_at) VALUES ($1,$2,$3,COALESCE($4,now()+interval \'30 days\'))', [connectHash(access), connectHash(refresh), grantId, refreshExpiry || null]);
    return { access_token: access, token_type: 'Bearer', expires_in: 300, refresh_token: refresh, scope: CONNECT_SCOPE };
  }
  async exchange(input: { clientId: string; code: string; redirectUri: string; challenge: string }): Promise<ConnectTokenDTO> {
    const result = await this.transaction(async db => {
      const hash = connectHash(input.code);
      const row = (await db.query('SELECT grant_id FROM private.galx_connect_codes WHERE code_hash=$1', [hash])).rows[0];
      if (!row) return null;
      const grant = await this.lockGrant(db, row.grant_id, input.clientId);
      if (!grant) return null;
      const code = (await db.query('SELECT redirect_uri,challenge,consumed_at,expires_at>clock_timestamp() AS active FROM private.galx_connect_codes WHERE code_hash=$1', [hash])).rows[0];
      if (code?.redirect_uri !== input.redirectUri || code.challenge !== input.challenge) return null;
      if (code.consumed_at) {
        await db.query('UPDATE private.galx_connect_grants SET revoked_at=now() WHERE id=$1', [grant.id]);
        return null;
      }
      if (!code.active) return null;
      await db.query('UPDATE private.galx_connect_codes SET consumed_at=now() WHERE code_hash=$1', [hash]);
      return this.issue(db, grant.id);
    });
    if (!result) throw new ConnectError('invalid_grant');
    return result;
  }
  async refresh(refreshToken: string, clientId: string): Promise<ConnectTokenDTO> {
    const result = await this.transaction(async db => {
      const hash = connectHash(refreshToken);
      const row = (await db.query('SELECT grant_id FROM private.galx_connect_tokens WHERE refresh_hash=$1', [hash])).rows[0];
      if (!row) return null;
      const grant = await this.lockGrant(db, row.grant_id, clientId);
      if (!grant) return null;
      const token = (await db.query('SELECT consumed_at,refresh_expires_at,refresh_expires_at>clock_timestamp() AS active FROM private.galx_connect_tokens WHERE refresh_hash=$1', [hash])).rows[0];
      if (!token?.active) return null;
      if (token.consumed_at) {
        // Reuse compromises the connection. Commit revocation before returning invalid_grant.
        await db.query('UPDATE private.galx_connect_grants SET revoked_at=now() WHERE id=$1', [grant.id]);
        return null;
      }
      await db.query('UPDATE private.galx_connect_tokens SET consumed_at=now() WHERE refresh_hash=$1', [hash]);
      return this.issue(db, grant.id, token.refresh_expires_at);
    });
    if (!result) throw new ConnectError('invalid_grant');
    return result;
  }
  async revokeToken(token: string, clientId: string): Promise<void> {
    const hash = connectHash(token);
    await this.db().query('UPDATE private.galx_connect_grants SET revoked_at=COALESCE(revoked_at,now()) WHERE client_id=$1 AND id IN (SELECT grant_id FROM private.galx_connect_tokens WHERE access_hash=$2 OR refresh_hash=$2)', [clientId, hash]);
  }
  async connections(userId: string) {
    const result = await this.db().query<{ id: string; client_id: string; created_at: Date }>('SELECT id,client_id,created_at FROM private.galx_connect_grants WHERE user_id=$1 AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 100', [userId]);
    return result.rows.map(row => ({ id: row.id, application: this.config.clients.find(c => c.id === row.client_id)?.name || 'Unavailable application', permission: 'Use inference', connected_at: row.created_at.toISOString() }));
  }
  async disconnect(id: string, userId: string): Promise<void> {
    // Same row lock as admission/refresh: once committed, no later admission can pass.
    await this.db().query('UPDATE private.galx_connect_grants SET revoked_at=COALESCE(revoked_at,now()) WHERE id=$1 AND user_id=$2', [id, userId]);
  }
  async admit(input: { tokenHash: string; resource: string; origin: string | null; requestKey: string; fingerprint: string }) {
    return this.transaction(async db => {
      const row = (await db.query('SELECT grant_id FROM private.galx_connect_tokens WHERE access_hash=$1', [input.tokenHash])).rows[0];
      if (!row) throw new NovaError('invalid_token', 401);
      const grant = await this.lockGrant(db, row.grant_id);
      if (!grant || grant.resource !== input.resource) throw new NovaError('invalid_token', 401);
      const client = this.config.clients.find(c => c.id === grant.client_id);
      if (!client || (input.origin !== null && !client.origins.includes(input.origin))) throw new NovaError('invalid_token', 401);
      const active = await db.query('SELECT 1 FROM private.galx_connect_tokens WHERE access_hash=$1 AND consumed_at IS NULL AND expires_at>clock_timestamp()', [input.tokenHash]);
      if (!active.rowCount) throw new NovaError('invalid_token', 401);
      const access = await db.query('SELECT enabled AND valid_until>clock_timestamp() AS active FROM private.galx_inference_access WHERE user_id=$1 FOR SHARE', [grant.user_id]);
      if (access.rows[0]?.active !== true) throw new NovaError('inference_access_required', 403);
      const lock = await db.query("SELECT pg_try_advisory_xact_lock(hashtextextended('galx-nova-admission',0)) AS held");
      if (!lock.rows[0].held) throw new NovaError('service_busy', 503);
      const prior = (await db.query('SELECT state,fingerprint FROM private.galx_nova_requests WHERE grant_id=$1 AND request_key=$2', [grant.id, input.requestKey])).rows[0];
      if (prior) throw new NovaError(prior.fingerprint === input.fingerprint ? 'request_already_submitted' : 'invalid_request', 409, prior.state === 'completed' ? 'completed' : prior.state === 'not_accepted' ? 'not_accepted' : 'unknown');
      const capacity = (await db.query(`SELECT count(*) FILTER (WHERE state IN ('running','unknown') AND lease_until>clock_timestamp())::int AS total,
        count(*) FILTER (WHERE user_id=$1 AND state IN ('running','unknown') AND lease_until>clock_timestamp())::int AS owner,
        count(*) FILTER (WHERE user_id=$1 AND created_at>now()-interval '1 minute')::int AS recent
        FROM private.galx_nova_requests WHERE lease_until>now() OR (user_id=$1 AND created_at>now()-interval '1 minute')`, [grant.user_id])).rows[0];
      if (capacity.total >= 64 || capacity.owner >= 2 || capacity.recent >= 12) throw new NovaError('service_busy', 503);
      const id = randomUUID();
      await db.query('INSERT INTO private.galx_nova_requests (id,grant_id,user_id,request_key,fingerprint) VALUES ($1,$2,$3,$4,$5)', [id, grant.id, grant.user_id, input.requestKey, input.fingerprint]);
      return { id, userId: grant.user_id, grantId: grant.id };
    });
  }
  async finish(id: string, state: NovaState): Promise<void> {
    const result = await this.db().query("UPDATE private.galx_nova_requests SET state=$2 WHERE id=$1 AND state='running'", [id, state]);
    if (result.rowCount !== 1) throw new NovaError('outcome_unconfirmed', 503, 'unknown');
  }
}
