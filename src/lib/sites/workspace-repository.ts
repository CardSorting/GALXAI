import type { Pool, PoolClient } from 'pg';
import { readSiteDocument, type SiteDocument, type SiteMessage, type WorkspaceSite } from './workspace-contract';
import { type DomainPlan, siteHostname } from './domains';
export class WorkspaceError extends Error { constructor(readonly status = 503) { super('site_unavailable'); } }
export interface WorkspaceRow { id: string; user_id: string; title: string; revision: number; document: SiteDocument | null; messages: SiteMessage[];
  published_document?: SiteDocument | null; published_revision?: number | null;
  archived: boolean; updated_at: Date; operation_id: string | null; operation_brief: string | null; operation_started_at: Date | null; operation_mode?: 'legacy' | 'included';
  hostname?: string | null; domain_status?: 'reserved' | 'pending' | 'active' | null; }
export function workspaceView(row: WorkspaceRow): WorkspaceSite {
  return { id: row.id, title: row.title, revision: row.revision, updatedAt: row.updated_at.toISOString(), document: readSiteDocument(row.document),
    messages: row.messages.map(m => ({ id: m.id, role: m.role, text: m.text })), archived: row.archived, published: Boolean(row.published_document), generating: Boolean(row.operation_id),
    address: row.hostname && row.domain_status ? { hostname: row.hostname, status: row.domain_status,
      url: row.domain_status === 'active' ? `https://${row.hostname}` : null } : null };
}
export class SitesWorkspaceRepository {
  constructor(private readonly pool: Pick<Pool,'connect'>) {}
  private async tx<T>(run: (db: PoolClient) => Promise<T>): Promise<T> {
    const db = await this.pool.connect(); let broken = false;
    try { await db.query('BEGIN'); await db.query("SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='3s'");
      const result = await run(db); await db.query('COMMIT'); return result;
    } catch (error) { try { await db.query('ROLLBACK'); } catch { broken = true; }
      if (error instanceof WorkspaceError) throw error; broken = true; throw new WorkspaceError();
    } finally { db.release(broken); }
  }
  private async locked(db: PoolClient, owner: string, id: string) {
    const row = (await db.query<WorkspaceRow>(`SELECT w.*,d.hostname,d.status AS domain_status FROM private.galx_site_workspaces w
      LEFT JOIN private.galx_site_domains d ON d.user_id=w.user_id AND d.project_id=w.id::text
      WHERE w.user_id=$1 AND w.id=$2 FOR UPDATE OF w`, [owner,id])).rows[0];
    if (!row) throw new WorkspaceError(404); return row;
  }
  async list(owner: string) {
    return this.tx(async db => (await db.query<WorkspaceRow>(`SELECT w.*,d.hostname,d.status AS domain_status FROM private.galx_site_workspaces w
      LEFT JOIN private.galx_site_domains d ON d.user_id=w.user_id AND d.project_id=w.id::text WHERE w.user_id=$1
      ORDER BY w.updated_at DESC,w.id LIMIT 50`, [owner])).rows);
  }
  async username(owner: string): Promise<string | null> {
    return this.tx(async db => (await db.query('SELECT username FROM private.galx_site_namespaces WHERE user_id=$1',[owner])).rows[0]?.username || null);
  }
  async publish(owner: string, id: string, revision: number, plan: DomainPlan) {
    return this.tx(async db => {
      const row = await this.locked(db,owner,id);
      if (!row.document || row.archived || row.operation_id || row.revision !== revision) throw new WorkspaceError(409);
      const domain = (await db.query(`SELECT * FROM private.galx_site_domains WHERE user_id=$1 AND project_id=$2 AND hostname=$3 FOR UPDATE`,[owner,id,plan.hostname])).rows[0];
      if (!domain || domain.automation_stopped) throw new WorkspaceError(409);
      if (domain.plan && !(await db.query('SELECT $1::jsonb=$2::jsonb AS same',[domain.plan,plan])).rows[0].same) throw new WorkspaceError(409);
      await db.query(`UPDATE private.galx_site_workspaces SET published_document=document,published_revision=revision+1,revision=revision+1,updated_at=now() WHERE user_id=$1 AND id=$2`,[owner,id]);
      if (!domain.plan) await db.query(`UPDATE private.galx_site_domains SET plan=$3::jsonb,status='pending',next_check_at=now(),updated_at=now() WHERE user_id=$1 AND project_id=$2`,[owner,id,plan]);
      return { ...row,published_document:row.document,published_revision:row.revision+1,revision:row.revision+1,hostname:domain.hostname,domain_status:domain.status === 'active' ? 'active' as const : 'pending' as const };
    });
  }
  async unpublish(owner: string, id: string, revision: number) {
    return this.tx(async db => {
      const row = await this.locked(db,owner,id);
      if (row.revision !== revision) throw new WorkspaceError(409);
      await db.query('UPDATE private.galx_site_workspaces SET published_document=NULL,published_revision=NULL,revision=revision+1,updated_at=now() WHERE user_id=$1 AND id=$2',[owner,id]);
      return {...row,published_document:null,published_revision:null,revision:row.revision+1};
    });
  }
  async published(hostname: string): Promise<SiteDocument | null> {
    siteHostname(hostname);
    return this.tx(async db => readSiteDocument((await db.query(`SELECT w.published_document FROM private.galx_site_workspaces w
      JOIN private.galx_site_domains d ON d.user_id=w.user_id AND d.project_id=w.id::text
      WHERE d.hostname=$1 AND d.plan->>'kind'='managed' AND w.published_document IS NOT NULL`,[hostname])).rows[0]?.published_document));
  }
  async get(owner: string, id: string) {
    return this.tx(async db => { const row = (await db.query<WorkspaceRow>(`SELECT w.*,d.hostname,d.status AS domain_status FROM private.galx_site_workspaces w
      LEFT JOIN private.galx_site_domains d ON d.user_id=w.user_id AND d.project_id=w.id::text WHERE w.user_id=$1 AND w.id=$2`,[owner,id])).rows[0];
      if (!row) throw new WorkspaceError(404); return row; });
  }
  async create(owner: string, id: string, title: string) {
    return this.tx(async db => {
      await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`sites-workspace:${owner}`]);
      const existing = (await db.query<WorkspaceRow>('SELECT * FROM private.galx_site_workspaces WHERE id=$1 AND user_id=$2',[id,owner])).rows[0];
      if (existing) return existing;
      const count = Number((await db.query('SELECT count(*) FROM private.galx_site_workspaces WHERE user_id=$1',[owner])).rows[0].count);
      if (count >= 50) throw new WorkspaceError(429);
      return (await db.query<WorkspaceRow>('INSERT INTO private.galx_site_workspaces(id,user_id,title) VALUES($1,$2,$3) RETURNING *',[id,owner,title])).rows[0];
    });
  }
  async update(owner: string, id: string, revision: number, change: { title?: string; archived?: boolean }) {
    return this.tx(async db => { const row = await this.locked(db,owner,id);
      if (row.revision !== revision || row.operation_id) throw new WorkspaceError(409);
      return {...row,...(await db.query<WorkspaceRow>(`UPDATE private.galx_site_workspaces SET title=$3,archived=$4,revision=revision+1,updated_at=now()
        WHERE user_id=$1 AND id=$2 RETURNING *`,[owner,id,change.title ?? row.title,change.archived ?? row.archived])).rows[0]}; });
  }
  async begin(owner: string, id: string, revision: number, operation: string, brief: string) {
    return this.tx(async db => { const row = await this.locked(db,owner,id);
      if (row.operation_id || row.archived || row.revision !== revision || row.messages.some(m => m.id === `${operation}:user`)) throw new WorkspaceError(409);
      return (await db.query<WorkspaceRow>(`UPDATE private.galx_site_workspaces SET operation_id=$3,operation_brief=$4,
        operation_started_at=now(),operation_mode='included',updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING *`,[owner,id,operation,brief])).rows[0]; });
  }
  async finish(owner: string, id: string, operation: string, document: SiteDocument | null, message: string) {
    return this.tx(async db => { const row = await this.locked(db,owner,id);
      if (row.operation_id !== operation) return row; // Late/replayed results never overwrite a newer draft.
      const messages = [...row.messages.slice(-78), { id: `${operation}:user`, role: 'user', text: row.operation_brief! },
        { id: `${operation}:assistant`, role: 'assistant', text: message }];
      return {...row,...(await db.query<WorkspaceRow>(`UPDATE private.galx_site_workspaces SET document=$3,messages=$4::jsonb,
        title=$5,revision=revision+1,operation_id=NULL,operation_brief=NULL,operation_started_at=NULL,updated_at=now()
        WHERE user_id=$1 AND id=$2 RETURNING *`,[owner,id,document || row.document,JSON.stringify(messages),document?.title || row.title])).rows[0]}; });
  }
}
