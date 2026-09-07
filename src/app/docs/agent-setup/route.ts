import { AGENT_SETUP } from '@/lib/docs/content';
export function GET(request: Request) {
  const headers: Record<string, string> = { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, max-age=300' };
  if (new URL(request.url).searchParams.get('download') === '1') headers['Content-Disposition'] = 'attachment; filename="galxai-agent-setup.md"';
  return new Response(AGENT_SETUP, { headers });
}
