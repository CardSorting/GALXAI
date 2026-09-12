import { getPostgresPool } from '@/lib/db/postgres';
import { SitesWorkspaceRepository, WorkspaceError } from '@/lib/sites/workspace-repository';
import { publishedSiteRoute } from '@/lib/sites/published-route';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const handle=publishedSiteRoute(()=>{const pool=getPostgresPool();if(!pool || pool.waitingCount>=25)throw new WorkspaceError();return new SitesWorkspaceRepository(pool);});
export async function GET(request:Request,{params}:{params:Promise<{hostname:string}>}){return handle(request,(await params).hostname);}
export const HEAD=GET;
