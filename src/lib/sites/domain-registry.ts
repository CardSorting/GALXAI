import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { SiteDomainError, requireDomain, siteProjectId, siteSlug, siteUsername, type DomainPlan, type DomainRow } from './domains';

export class SiteDomainRegistry {
  constructor(private readonly pool: Pick<Pool, 'connect'>) {}
  private async transaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect(); let broken = false;
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='3s'");
      const result = await run(client);
      await client.query('COMMIT'); // Lost acknowledgement never starts external work.
      return result;
    } catch (error: any) {
      try { await client.query('ROLLBACK'); } catch { broken = true; }
      if (error instanceof SiteDomainError) throw error;
      if (error?.code === '23505') throw new SiteDomainError('address_unavailable', 409);
      broken = true;
      throw new SiteDomainError('domain_unavailable');
    } finally { client.release(broken); }
  }
  async reserve(userId: string, projectId: string, username: string, appName: string): Promise<DomainRow> {
    siteProjectId(userId); siteProjectId(projectId); siteUsername(username); const base = siteSlug(appName);
    return this.transaction(async client => {
      await client.query('INSERT INTO private.galx_site_namespaces(user_id, username) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, username]);
      const account = (await client.query('SELECT username FROM private.galx_site_namespaces WHERE user_id=$1 FOR UPDATE', [userId])).rows[0];
      requireDomain(account, 'address_unavailable', 409);
      requireDomain(account?.username === username, 'username_conflict', 409);
      const existing = (await client.query<DomainRow>('SELECT * FROM private.galx_site_domains WHERE user_id=$1 AND project_id=$2', [userId, projectId])).rows[0];
      if (existing) return existing; // Renaming a Site never silently changes its address.
      const taken = (await client.query<{ app_slug: string }>('SELECT app_slug FROM private.galx_site_domains WHERE user_id=$1', [userId])).rows;
      requireDomain(taken.length < 20, 'domain_limit_reached', 429);
      let slug = base;
      for (let n = 2; taken.some(row => row.app_slug === slug); n++) slug = `${base.slice(0, 28).replace(/-$/, '')}-${n}`;
      return (await client.query<DomainRow>('INSERT INTO private.galx_site_domains(user_id,username,project_id,app_slug) VALUES ($1,$2,$3,$4) RETURNING *', [userId, username, projectId, slug])).rows[0];
    });
  }
  async get(userId: string, projectId: string): Promise<DomainRow> {
    siteProjectId(userId); siteProjectId(projectId);
    return this.transaction(async client => {
      const row = (await client.query<DomainRow>('SELECT * FROM private.galx_site_domains WHERE user_id=$1 AND project_id=$2', [userId, projectId])).rows[0];
      requireDomain(row, 'domain_not_found', 404); return row;
    });
  }
  /** Issue one attachment attempt. Lost responses recover by Sites listing, never another add. */
  async startAttachment(userId: string, projectId: string): Promise<boolean> {
    return this.transaction(async client => {
      const result = await client.query('UPDATE private.galx_site_domains SET attach_started=true,updated_at=now() WHERE user_id=$1 AND project_id=$2 AND attach_started=false RETURNING id', [userId, projectId]);
      if (result.rowCount) return true;
      requireDomain((await client.query('SELECT 1 FROM private.galx_site_domains WHERE user_id=$1 AND project_id=$2', [userId, projectId])).rowCount, 'domain_not_found', 404);
      return false;
    });
  }
  async claim(userId: string, projectId: string, plan?: DomainPlan): Promise<DomainRow> {
    return this.transaction(async client => {
      const row = (await client.query<DomainRow>('SELECT *,clock_timestamp() AS db_now FROM private.galx_site_domains WHERE user_id=$1 AND project_id=$2 FOR UPDATE', [userId, projectId])).rows[0];
      requireDomain(row, 'domain_not_found', 404);
      const now = (row as DomainRow & { db_now: Date }).db_now.getTime();
      requireDomain(!row.lease_until || row.lease_until.getTime() <= now, 'domain_pending', 409);
      requireDomain(!row.next_check_at || row.next_check_at.getTime() <= now, 'check_later', 429);
      requireDomain(row.plan || plan, 'domain_attachment_required', 409);
      requireDomain(!plan || plan.hostname === row.hostname, 'invalid_domain_records');
      // JSONB key ordering differs from JS ordering: compare at the database.
      if (row.plan && plan) requireDomain((await client.query('SELECT $1::jsonb = $2::jsonb AS same', [row.plan, plan])).rows[0].same, 'domain_conflict', 409);
      return (await client.query<DomainRow>(`UPDATE private.galx_site_domains SET plan=COALESCE(plan,$3::jsonb),
        status='pending',lease_id=$4,lease_until=now()+interval '2 minutes',updated_at=now()
        WHERE user_id=$1 AND project_id=$2 RETURNING *`, [userId, projectId, plan || null, randomUUID()])).rows[0];
    });
  }
  async finish(row: DomainRow, active: boolean, error: string | null): Promise<DomainRow> {
    return this.transaction(async client => {
      const result = await client.query<DomainRow>(`UPDATE private.galx_site_domains SET status=$4,last_error=$5,
        lease_id=null,lease_until=null,next_check_at=now()+interval '30 seconds',updated_at=now()
        WHERE id=$1 AND user_id=$2 AND lease_id=$3 RETURNING *`, [row.id, row.user_id, row.lease_id, active ? 'active' : 'pending', error]);
      requireDomain(result.rows[0], 'domain_pending', 409); return result.rows[0];
    });
  }
}
