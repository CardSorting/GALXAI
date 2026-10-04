import { connectConfig, requestOrigin } from '@/lib/connect/config';
import { connectCors, connectHeaders } from '@/lib/connect/http';
import { ConnectRepository } from '@/lib/supabase/repositories/ConnectRepository';
import { invokeNova, novaFailure } from '@/lib/nova/inference';
import { executeNova } from '@/lib/nova/executor';
import { NovaError } from '@/lib/nova/contract';
import { after } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// The persistent runtime owns the unchanged 300-second deadline and terminal
// drain. No Vercel function duration is provisioned for this retired entry.
export async function POST(request: Request) {
  // Vercel retains Media/Connect only. A stale deployment must never become a
  // second Nova execution authority. The Mac release owns inference.
  if (process.env.VERCEL === '1') return new Response(null, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    const config = connectConfig();
    if (requestOrigin(request) !== config.resource) return novaFailure(new NovaError('invalid_token', 401));
    return connectCors(await invokeNova(request, config.resource, new ConnectRepository(config), executeNova, after), request, config);
  } catch { return novaFailure(new NovaError('access_check_unavailable', 503)); }
}
export async function OPTIONS(request: Request) {
  if (process.env.VERCEL === '1') return new Response(null, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    const config = connectConfig(), origin = request.headers.get('origin');
    if (requestOrigin(request) !== config.resource || !origin || !config.clients.some(c => c.origins.includes(origin))) return new Response(null, { status: 403, headers: connectHeaders() });
    return connectCors(new Response(null, { status: 204, headers: connectHeaders() }), request, config);
  } catch { return new Response(null, { status: 503, headers: connectHeaders() }); }
}
