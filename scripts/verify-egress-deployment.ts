/** Read-only public deployment scan. Secret values are compared locally, never sent or printed. */
import assert from 'node:assert/strict';
const base = process.argv[2] ?? 'https://galx.ai';
assert(['galx.ai', '127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Unexpected verification host');
const secrets = Object.entries(process.env)
  .filter(([key, value]) => /SUPABASE_(SERVICE_ROLE_KEY|SECRET_KEY)|DATABASE_URL|GALX_VAULT_(MASTER_SECRET|KEY)|RELAY_ADMIN_API_KEYS/.test(key) && value && value.length >= 16)
  .flatMap(([, value]) => value!.split(','))
  .filter(value => value.length >= 16 && !value.startsWith('sb_publishable_'));
const forbidden = ['RegistryEgressGuard', 'registry-egress.json', 'REGISTRY_DELTA_SQL', 'Registry synchronization budget exceeded',
  'SHARD_PROJECTION_DELTA_SQL', 'Shard authority changed; restart required', 'Shard owner scope mismatch',
  'Registry API temporarily unavailable', 'Inconsistent registry response range', 'Shard synchronization is backing off',
  'activeCircuitsCount', 'inc_baseline_verified_operational', 'Active • All Systems Operational', ...secrets];
async function read(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'error' });
  assert.equal(response.status, 200, 'Expected live page or asset');
  const reader = response.body!.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    for (;;) {
      const part = await reader.read(); if (part.done) break;
      bytes += part.value.byteLength;
      assert(bytes < 3 * 1024 * 1024, 'Oversized verification response'); chunks.push(part.value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const body = Buffer.concat(chunks).toString('utf8');
  const surface = body + JSON.stringify([...response.headers]);
  assert(!forbidden.some(value => surface.includes(value)), 'Private value found in public response');
  return body;
}
const html = await read(base + '/') + await read(base + '/about');
assert(html.includes('Connection not checked'), 'Server-rendered footer must start unknown');
const scripts = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1])
  .filter(src => src.startsWith('/_next/static/') && src.endsWith('.js')))];
assert(scripts.length > 0 && scripts.length <= 40, 'Unexpected asset list');
let ownershipPresent = false, noticePresent = false, measuredConnectionPresent = false;
for (const src of scripts) {
  const code = await read(base + src);
  ownershipPresent ||= code.includes('galx-outbox-state-v2') && code.includes('galx-outbox-drain-v2');
  noticePresent ||= code.includes('Saved actions need attention') && code.includes('Dismiss notification');
  measuredConnectionPresent ||= code.includes('Website reachable') && code.includes('Browser connection only. View service status for availability.');
}
assert(ownershipPresent && noticePresent && measuredConnectionPresent, 'Latest recovery/connection guards are not present');
const head = await fetch(base + '/api/version', { method: 'HEAD', signal: AbortSignal.timeout(5000), redirect: 'error' });
assert.equal(head.status, 200); assert.equal((await head.arrayBuffer()).byteLength, 0);
console.log(JSON.stringify({ liveSite: base, scriptAssetsChecked: scripts.length, ownershipPresent, noticePresent,
  measuredConnectionPresent, headProbeHasNoBody: true, privateGuardMarkersAbsent: true, configuredSecretsAbsent: true }));
