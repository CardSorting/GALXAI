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
  /** The committed registry row is the outbox. No network effect in this transaction. */
  async enqueue(userId: string, projectId: string, plan?: DomainPlan): Promise<DomainRow> {
    return this.transaction(async client => {
      const row = (await client.query<DomainRow>('SELECT * FROM private.galx_site_domains WHERE user_id=$1 AND project_id=$2 FOR UPDATE', [userId, projectId])).rows[0];
      requireDomain(row, 'domain_not_found', 404);
      requireDomain(row.plan || plan, 'domain_attachment_required', 409);
      requireDomain(!plan || plan.hostname === row.hostname, 'invalid_domain_records');
      if (row.plan) {
        if (plan) requireDomain((await client.query('SELECT $1::jsonb = $2::jsonb AS same', [row.plan, plan])).rows[0].same, 'domain_conflict', 409);
        return row; // Duplicates cannot reset backoff, steal leases or clear a conflict.
      }
      return (await client.query<DomainRow>(`UPDATE private.galx_site_domains SET plan=$3::jsonb,
        status='pending',next_check_at=now(),updated_at=now() WHERE user_id=$1 AND project_id=$2 RETURNING *`,
      [userId, projectId, plan])).rows[0];
    });
  }
  async claimDue(accountIds: string[], limit = 4, includeManaged = false): Promise<DomainRow[]> {
    requireDomain((accountIds.length > 0 || includeManaged) && accountIds.length <= 50 && Number.isInteger(limit) && limit >= 1 && limit <= 4);
    accountIds.forEach(siteProjectId);
    return this.transaction(async client => (await client.query<DomainRow>(`WITH due AS (
      SELECT d.id FROM private.galx_site_domains d WHERE d.status='pending' AND d.plan IS NOT NULL AND NOT d.automation_stopped
        AND (d.user_id=ANY($1::text[]) OR ($3 AND d.plan->>'kind'='managed' AND EXISTS (
          SELECT 1 FROM private.galx_site_workspaces w WHERE w.id::text=d.project_id AND w.user_id=d.user_id AND w.published_document IS NOT NULL)))
        AND (d.next_check_at IS NULL OR d.next_check_at <= now()) AND (d.lease_until IS NULL OR d.lease_until <= now())
      ORDER BY d.next_check_at NULLS FIRST,d.id LIMIT $2 FOR UPDATE OF d SKIP LOCKED
    ) UPDATE private.galx_site_domains d SET lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes',
      retry_count=LEAST(d.retry_count+1,30),updated_at=now() FROM due WHERE d.id=due.id RETURNING d.*`, [accountIds, limit, includeManaged])).rows);
  }
  async claim(userId: string, projectId: string, plan?: DomainPlan): Promise<DomainRow> {
    return this.transaction(async client => {
      const row = (await client.query<DomainRow>('SELECT *,clock_timestamp() AS db_now FROM private.galx_site_domains WHERE user_id=$1 AND project_id=$2 FOR UPDATE', [userId, projectId])).rows[0];
      requireDomain(row, 'domain_not_found', 404);
      requireDomain(!row.automation_stopped, 'domain_conflict', 409);
      const now = (row as DomainRow & { db_now: Date }).db_now.getTime();
      requireDomain(!row.lease_until || row.lease_until.getTime() <= now, 'domain_pending', 409);
      requireDomain(!row.next_check_at || row.next_check_at.getTime() <= now, 'check_later', 429);
      requireDomain(row.plan || plan, 'domain_attachment_required', 409);
      requireDomain(!plan || plan.hostname === row.hostname, 'invalid_domain_records');
      // JSONB key ordering differs from JS ordering: compare at the database.
      if (row.plan && plan) requireDomain((await client.query('SELECT $1::jsonb = $2::jsonb AS same', [row.plan, plan])).rows[0].same, 'domain_conflict', 409);
      return (await client.query<DomainRow>(`UPDATE private.galx_site_domains SET plan=COALESCE(plan,$3::jsonb),
        status='pending',lease_id=$4,lease_until=now()+interval '2 minutes',retry_count=LEAST(retry_count+1,30),updated_at=now()
        WHERE user_id=$1 AND project_id=$2 RETURNING *`, [userId, projectId, plan || null, randomUUID()])).rows[0];
    });
  }
  async finish(row: DomainRow, active: boolean, error: string | null): Promise<DomainRow> {
    return this.transaction(async client => {
      const diagnostic = error && ['dns_conflict', 'dns_unavailable', 'domain_unavailable', 'https_pending'].includes(error) ? error : error ? 'domain_unavailable' : null;
      const result = await client.query<DomainRow>(`UPDATE private.galx_site_domains SET status=$4,last_error=$5,
        lease_id=null,lease_until=null,automation_stopped=($5::text IS NOT DISTINCT FROM 'dns_conflict'),
        next_check_at=CASE WHEN $4='active' THEN NULL ELSE now()+make_interval(secs => LEAST(900,30*power(2,LEAST(GREATEST(retry_count-1,0),5)))::integer) END,
        retry_count=CASE WHEN $4='active' THEN 0 ELSE retry_count END,updated_at=now()
        WHERE id=$1 AND user_id=$2 AND lease_id=$3 AND lease_until>clock_timestamp() RETURNING *`,
      [row.id, row.user_id, row.lease_id, active ? 'active' : 'pending', diagnostic]);
      requireDomain(result.rows[0], 'domain_pending', 409); return result.rows[0];
    });
  }
}
