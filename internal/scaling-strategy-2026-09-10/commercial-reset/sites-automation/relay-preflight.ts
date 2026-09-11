/** Read-only configured-relay probe. Never prints endpoints or credentials. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function main() {
  const base = process.env.VM_RELAY_URL || process.env.GALXAI_RELAY_URL || process.env.RELAY_URL;
  const key = process.env.VM_RELAY_API_KEY || process.env.RELAY_API_KEYS?.split(',')[0]?.trim();
  if (!base || !key) throw new Error('Configured relay URL or key missing');
  const parsed = new URL(base);
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('Invalid relay URL');
  if (parsed.protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)) throw new Error('Remote plaintext relay is not permitted by this probe');
  const report: any = { checked_at: new Date().toISOString(), endpoint_retained: false, credentials_retained: false, checks: [] };
  for (const route of ['/health', '/v1/models']) {
    try {
      const response = await fetch(new URL(route, parsed), { redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: route === '/health' ? {} : { Authorization: `Bearer ${key}` } });
      const item: any = { route, status: response.status };
      if (route === '/v1/models' && response.ok) {
        const body = await response.json();
        item.models = Array.isArray(body.data) ? body.data.map((m: any) => m.id).filter((id: any) => typeof id === 'string' && /^[\w.:-]{1,102}$/.test(id)) : [];
      } else await response.body?.cancel();
      report.checks.push(item);
    } catch { report.checks.push({ route, transport_failed: true }); }
  }
  const dir = path.dirname(fileURLToPath(import.meta.url));
  fs.writeFileSync(path.join(dir, 'relay-preflight.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
main().catch(() => { console.error('Configured relay preflight failed before a usable result.'); process.exitCode = 1; });
