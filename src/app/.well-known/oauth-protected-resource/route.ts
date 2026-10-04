import { connectConfig, CONNECT_SCOPE } from '@/lib/connect/config';
import { connectJson } from '@/lib/connect/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { const c = connectConfig(); return connectJson({ resource: c.resource, authorization_servers: [c.issuer], scopes_supported: [CONNECT_SCOPE], bearer_methods_supported: ['header'] }); }
  catch { return connectJson({ error: 'temporarily_unavailable' }, 503); }
}
