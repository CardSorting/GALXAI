import type { Pool, PoolClient } from 'pg';
import { assignFreeSite, consumeFreeGeneration, FreeQuotaError, releaseFreeGeneration, requireAssignedFreeSite } from '../billing/free-generation-quota';
import { readSiteDocument, readSiteMessage, type SiteDocument, type SiteMessage, type SiteIntent, type WorkspaceSite, type SiteSummary } from './workspace-contract';
import { type DomainPlan, siteHostname } from './domains';
import { recallQuery, sitesContextCache, type SitesContextCache } from './hybrid-context';
export class WorkspaceError extends Error { constructor(readonly status = 503) { super('site_unavailable'); } }
export interface WorkspaceRow { id: string; user_id: string; title: string; revision: number; document: SiteDocument | null; messages: SiteMessage[];
  published_document?: SiteDocument | null; published_revision?: number | null;
  archived: boolean; updated_at: Date; operation_id: string | null; operation_brief: string | null; operation_started_at: Date | null; operation_mode?: 'legacy' | 'included';
  project_notes?: string; context_summary?: string; context_start_turn?: number; turn_count?: number; document_version?: number; published_version?: number | null; operation_intent?: SiteIntent; history_cursor?: number | null;
  hostname?: string | null; domain_status?: 'reserved' | 'pending' | 'active' | null; }
interface TurnRow { sequence:number; operation_id:string; intent:string; user_text:string|null; assistant_text:string|null; state:'pending'|'completed'|'failed'; document_version:number|null; created_at:Date; }
export function workspaceView(row: WorkspaceRow): WorkspaceSite {
  return { id: row.id, title: row.title, revision: row.revision, updatedAt: row.updated_at.toISOString(), document: readSiteDocument(row.document),
    messages: row.messages.map(readSiteMessage), archived: row.archived, published: Boolean(row.published_document), generating: Boolean(row.operation_id),
    version:row.document_version || 0,publishedVersion:row.published_version ?? null,context:{notes:row.project_notes || '',summary:row.context_summary || ''},historyCursor:row.history_cursor ?? null,
    address: row.hostname && row.domain_status ? { hostname: row.hostname, status: row.domain_status,
      url: row.domain_status === 'active' ? `https://${row.hostname}` : null } : null };
}
export function workspaceSummary(row: WorkspaceRow): SiteSummary {
  const v=workspaceView({...row,document:null,messages:[]});
  return {id:v.id,title:v.title,revision:v.revision,updatedAt:v.updatedAt,generating:v.generating,archived:v.archived,published:v.published,address:v.address,version:v.version,publishedVersion:v.publishedVersion};
}
const joined = `SELECT w.*,d.hostname,d.status AS domain_status FROM private.galx_site_workspaces w
  LEFT JOIN private.galx_site_domains d ON d.user_id=w.user_id AND d.project_id=w.id::text`;
export class SitesWorkspaceRepository {
  constructor(private readonly pool: Pick<Pool,'connect'>,private readonly cache:SitesContextCache=sitesContextCache) {}
  private async tx<T>(run: (db: PoolClient) => Promise<T>): Promise<T> {
    const db = await this.pool.connect(); let broken = false;
    try { await db.query('BEGIN'); await db.query("SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='3s'");
      const result = await run(db); await db.query('COMMIT'); return result;
    } catch (error) { try { await db.query('ROLLBACK'); } catch { broken = true; }
      if (error instanceof WorkspaceError || error instanceof FreeQuotaError) throw error; broken = true; throw new WorkspaceError();
    } finally { db.release(broken); }
  }
  private async locked(db: PoolClient, owner: string, id: string) {
    const row = (await db.query<WorkspaceRow>(`${joined} WHERE w.user_id=$1 AND w.id=$2 FOR UPDATE OF w`, [owner,id])).rows[0];
    if (!row) throw new WorkspaceError(404); return row;
  }
  private async historyPage(db:PoolClient,owner:string,id:string,before?:number) {
    const rows=(await db.query<TurnRow>(`SELECT sequence,operation_id,intent,user_text,assistant_text,state,document_version,created_at FROM private.galx_site_turns
      WHERE user_id=$1 AND site_id=$2 AND ($3::int IS NULL OR sequence<$3) ORDER BY sequence DESC LIMIT 41`,[owner,id,before ?? null])).rows;
    const page=rows.slice(0,40).reverse(),messages:SiteMessage[]=[];
    for(const t of page){
      const common={turn:t.sequence,status:t.state,createdAt:t.created_at.toISOString(),...(['build','discuss'].includes(t.intent)?{intent:t.intent as SiteIntent}:{})};
      if(t.user_text!==null)messages.push({id:`${t.operation_id}:user`,role:'user',text:t.user_text,...common});
      if(t.assistant_text!==null)messages.push({id:`${t.operation_id}:assistant`,role:'assistant',text:t.assistant_text,...common,version:t.document_version});
    }
    return {messages,cursor:rows.length>40?page[0].sequence:null};
  }
  private async hydrate(db:PoolClient,row:WorkspaceRow) {
    const page=await this.historyPage(db,row.user_id,row.id);
    return {...row,messages:page.messages,history_cursor:page.cursor};
  }
  async list(owner: string) {
    return this.tx(async db => (await db.query<WorkspaceRow>(`${joined} WHERE w.user_id=$1 ORDER BY w.updated_at DESC,w.id LIMIT 50`, [owner])).rows);
  }
  async library(owner:string) {
    return this.tx(async db => (await db.query<WorkspaceRow>(`SELECT w.id,w.user_id,w.title,w.revision,w.updated_at,w.archived,w.operation_id,w.document_version,w.published_version,
      CASE WHEN w.published_document IS NOT NULL THEN '{}'::jsonb ELSE NULL END AS published_document,d.hostname,d.status AS domain_status
      FROM private.galx_site_workspaces w LEFT JOIN private.galx_site_domains d ON d.user_id=w.user_id AND d.project_id=w.id::text
      WHERE w.user_id=$1 ORDER BY w.updated_at DESC,w.id LIMIT 50`,[owner])).rows.map(workspaceSummary));
  }
  async history(owner:string,id:string,before?:number) {
    return this.tx(async db => { await this.locked(db,owner,id); return this.historyPage(db,owner,id,before); });
  }
  async turn(owner:string,id:string,operation:string) {
    return this.tx(async db => (await db.query<TurnRow>('SELECT * FROM private.galx_site_turns WHERE user_id=$1 AND site_id=$2 AND operation_id=$3',[owner,id,operation])).rows[0] || null);
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
      const next=(await db.query<WorkspaceRow>(`UPDATE private.galx_site_workspaces SET published_document=document,published_version=document_version,published_revision=revision+1,revision=revision+1,updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING *`,[owner,id])).rows[0];
      if (!domain.plan) await db.query(`UPDATE private.galx_site_domains SET plan=$3::jsonb,status='pending',next_check_at=now(),updated_at=now() WHERE user_id=$1 AND project_id=$2`,[owner,id,plan]);
      return this.hydrate(db,{...row,...next,hostname:domain.hostname,domain_status:domain.status === 'active' ? 'active' : 'pending'});
    });
  }
  async unpublish(owner: string, id: string, revision: number) {
    return this.tx(async db => {
      const row = await this.locked(db,owner,id);
      if (row.revision !== revision) throw new WorkspaceError(409);
      const next=(await db.query<WorkspaceRow>('UPDATE private.galx_site_workspaces SET published_document=NULL,published_version=NULL,published_revision=NULL,revision=revision+1,updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING *',[owner,id])).rows[0];
      return this.hydrate(db,{...row,...next});
    });
  }
  async published(hostname: string): Promise<SiteDocument | null> {
    siteHostname(hostname);
    return this.tx(async db => readSiteDocument((await db.query(`SELECT w.published_document FROM private.galx_site_workspaces w
      JOIN private.galx_site_domains d ON d.user_id=w.user_id AND d.project_id=w.id::text
      WHERE d.hostname=$1 AND d.plan->>'kind'='managed' AND w.published_document IS NOT NULL`,[hostname])).rows[0]?.published_document));
  }
  async get(owner: string, id: string) {
    const result=await this.tx(async db => {
      const row=await this.locked(db,owner,id),key=this.cache.key(row,'recent');
      let page:{messages:SiteMessage[];cursor:number|null}|undefined;
      try{page=this.cache.get(key);}catch{/* Cache failure falls through to the durable record. */}
      page ||= await this.historyPage(db,owner,id);
      return {key,page,row:{...row,messages:page.messages,history_cursor:page.cursor}};
    });
    // Publish only after COMMIT. A rolled-back or uncertain transaction never enters L1.
    try{this.cache.put(result.key,result.page);}catch{/* The committed database result remains usable. */}
    return result.row;
  }
  async recall(owner:string,id:string,revision:number,brief:string):Promise<SiteMessage[]> {
    const result=await this.tx(async db=>{
      const row=await this.locked(db,owner,id);
      if(row.revision!==revision || row.operation_id || row.archived)throw new WorkspaceError(409);
      const query=recallQuery(brief),key=this.cache.key(row,'recall',query);
      let messages:SiteMessage[]|undefined;
      try{messages=this.cache.get(key);}catch{}
      if(!messages){
        messages=[];
        if(query && (row.turn_count || 0)>(row.context_start_turn || 0)+6){
          const rows=(await db.query<TurnRow>(`SELECT sequence,operation_id,intent,user_text,assistant_text,state,document_version,created_at
            FROM private.galx_site_turns WHERE user_id=$1 AND site_id=$2 AND sequence>$3 AND sequence<=$4
            AND state='completed' AND user_text IS NOT NULL AND assistant_text IS NOT NULL
            AND to_tsvector('simple',coalesce(user_text,'') || ' ' || coalesce(assistant_text,'')) @@ websearch_to_tsquery('simple',$5)
            ORDER BY ts_rank_cd(to_tsvector('simple',coalesce(user_text,'') || ' ' || coalesce(assistant_text,'')),websearch_to_tsquery('simple',$5)) DESC,sequence DESC LIMIT 8`,
          [owner,id,row.context_start_turn || 0,(row.turn_count || 0)-6,query])).rows;
          for(const turn of rows){
            const common={turn:turn.sequence,status:'completed' as const};
            messages.push({id:`${turn.operation_id}:user`,role:'user',text:turn.user_text!,...common},
              {id:`${turn.operation_id}:assistant`,role:'assistant',text:turn.assistant_text!,...common});
          }
        }
      }
      return {key,messages};
    });
    try{this.cache.put(result.key,result.messages);}catch{}
    return result.messages;
  }
  async create(owner: string, id: string, title: string, free = false) {
    return this.tx(async db => {
      await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`sites-workspace:${owner}`]);
      const existing = (await db.query<WorkspaceRow>('SELECT * FROM private.galx_site_workspaces WHERE id=$1 AND user_id=$2',[id,owner])).rows[0];
      if (existing) return this.hydrate(db,existing);
      const count = Number((await db.query('SELECT count(*) FROM private.galx_site_workspaces WHERE user_id=$1',[owner])).rows[0].count);
      if (count >= 50) throw new WorkspaceError(429);
      if (free) await assignFreeSite(db,owner,id);
      return (await db.query<WorkspaceRow>('INSERT INTO private.galx_site_workspaces(id,user_id,title) VALUES($1,$2,$3) RETURNING *',[id,owner,title])).rows[0];
    });
  }
  async update(owner: string, id: string, revision: number, change: { title?: string; archived?: boolean; notes?:string }) {
    return this.tx(async db => { const row = await this.locked(db,owner,id);
      if (row.revision !== revision || row.operation_id) throw new WorkspaceError(409);
      const next=(await db.query<WorkspaceRow>(`UPDATE private.galx_site_workspaces SET title=$3,archived=$4,project_notes=$5,revision=revision+1,updated_at=now()
        WHERE user_id=$1 AND id=$2 RETURNING *`,[owner,id,change.title ?? row.title,change.archived ?? row.archived,change.notes ?? row.project_notes ?? ''])).rows[0];
      return this.hydrate(db,{...row,...next}); });
  }
  async begin(owner: string, id: string, revision: number, operation: string, brief: string, intent:SiteIntent='build', free = false) {
    return this.tx(async db => { const row = await this.locked(db,owner,id);
      if (row.operation_id || row.archived || row.revision !== revision || (await db.query('SELECT 1 FROM private.galx_site_turns WHERE user_id=$1 AND site_id=$2 AND operation_id=$3',[owner,id,operation])).rowCount) throw new WorkspaceError(409);
      const sequence=(row.turn_count || 0)+1;
      if (free) await consumeFreeGeneration(db,owner,'site',`${id}:${operation}`,1,id);
      await db.query(`INSERT INTO private.galx_site_turns(site_id,user_id,sequence,operation_id,intent,user_text,state) VALUES($1,$2,$3,$4,$5,$6,'pending')`,[id,owner,sequence,operation,intent,brief]);
      const next=(await db.query<WorkspaceRow>(`UPDATE private.galx_site_workspaces SET operation_id=$3,operation_brief=$4,operation_intent=$5,turn_count=$6,
        operation_started_at=now(),operation_mode='included',updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING *`,[owner,id,operation,brief,intent,sequence])).rows[0];
      return this.hydrate(db,{...row,...next}); });
  }
  async requireFreeSite(owner: string, id: string) {
    return this.tx(async db => { await this.locked(db,owner,id); await requireAssignedFreeSite(db,owner,id); });
  }
  async finish(owner: string, id: string, operation: string, document: SiteDocument | null, message: string, memory:string|null=null, failed=false, notStarted=false) {
    return this.tx(async db => { const row = await this.locked(db,owner,id);
      if (row.operation_id !== operation) return this.hydrate(db,row);
      if (notStarted) await releaseFreeGeneration(db,owner,'site',`${id}:${operation}`);
      const changed=document!==null && JSON.stringify(readSiteDocument(document))!==JSON.stringify(readSiteDocument(row.document));
      const version=(row.document_version || 0)+(changed?1:0),summary=memory ?? row.context_summary ?? '';
      if(changed)await db.query(`INSERT INTO private.galx_site_versions(site_id,user_id,version,document,context_summary,label,source) VALUES($1,$2,$3,$4,$5,$6,'generation')`,[id,owner,version,document,summary,(row.operation_brief || 'Draft updated').slice(0,200)]);
      await db.query(`UPDATE private.galx_site_turns SET assistant_text=$4,state=$5,document_version=$6,completed_at=now() WHERE user_id=$1 AND site_id=$2 AND operation_id=$3`,[owner,id,operation,message,failed?'failed':'completed',changed?version:null]);
      const page=await this.historyPage(db,owner,id);
      const next=(await db.query<WorkspaceRow>(`UPDATE private.galx_site_workspaces SET document=$3,messages=$4::jsonb,title=$5,context_summary=$6,document_version=$7,
        revision=revision+1,operation_id=NULL,operation_brief=NULL,operation_started_at=NULL,updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING *`,
        [owner,id,document || row.document,JSON.stringify(page.messages),document?.title || row.title,summary,version])).rows[0];
      return {...row,...next,messages:page.messages,history_cursor:page.cursor}; });
  }
  async versions(owner:string,id:string,before?:number) {
    return this.tx(async db=>{await this.locked(db,owner,id);
      const rows=(await db.query<{version:number;label:string;created_at:Date}>(`SELECT version,label,created_at FROM private.galx_site_versions WHERE user_id=$1 AND site_id=$2 AND ($3::int IS NULL OR version<$3) ORDER BY version DESC LIMIT 21`,[owner,id,before ?? null])).rows;
      return {versions:rows.slice(0,20).map(v=>({version:v.version,label:v.label,createdAt:v.created_at.toISOString()})),cursor:rows.length>20?rows[19].version:null};});
  }
  async version(owner:string,id:string,version:number) {
    return this.tx(async db=>{const row=(await db.query('SELECT version,document FROM private.galx_site_versions WHERE user_id=$1 AND site_id=$2 AND version=$3',[owner,id,version])).rows[0];
      if(!row)throw new WorkspaceError(404);return {version:row.version,document:readSiteDocument(row.document)};});
  }
  async restore(owner:string,id:string,revision:number,target:number) {
    return this.tx(async db=>{const row=await this.locked(db,owner,id);
      if(row.operation_id || row.archived || row.revision!==revision || target===row.document_version)throw new WorkspaceError(409);
      const old=(await db.query('SELECT document,context_summary FROM private.galx_site_versions WHERE user_id=$1 AND site_id=$2 AND version=$3',[owner,id,target])).rows[0];
      if(!old || !readSiteDocument(old.document))throw new WorkspaceError(404);
      const version=(row.document_version || 0)+1,sequence=(row.turn_count || 0)+1,label=`Restored version ${target}`;
      await db.query(`INSERT INTO private.galx_site_versions(site_id,user_id,version,document,context_summary,label,source) VALUES($1,$2,$3,$4,$5,$6,'restore')`,[id,owner,version,old.document,old.context_summary,label]);
      await db.query(`INSERT INTO private.galx_site_turns(site_id,user_id,sequence,operation_id,intent,assistant_text,state,document_version,completed_at) VALUES($1,$2,$3,gen_random_uuid(),'restore',$4,'completed',$5,now())`,[id,owner,sequence,`${label} as version ${version}. Your published Site is unchanged.`,version]);
      const page=await this.historyPage(db,owner,id);
      const next=(await db.query<WorkspaceRow>(`UPDATE private.galx_site_workspaces SET document=$3,title=$4,context_summary=$5,context_start_turn=$6,turn_count=$6,document_version=$7,
        messages=$8::jsonb,revision=revision+1,updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING *`,[owner,id,old.document,old.document.title,old.context_summary,sequence,version,JSON.stringify(page.messages)])).rows[0];
      return {...row,...next,messages:page.messages,history_cursor:page.cursor};});
  }
}
