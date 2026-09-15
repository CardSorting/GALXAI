import { createHash } from 'node:crypto';
import type { DesiredShard } from './federation-lifecycle.js';

/** Both persisted credential formats participate in the same 1:1 lifecycle. */
export function desiredShard(row: Record<string, any>, credential: Record<string, any> | null): DesiredShard | undefined {
  if (row.relay_pool_id != null) return;
  if (!row.managed_desktop_id || !row.desktop_enrolled_at || row.provider !== 'openai' || row.permission_retracted || !['active', 'healthy', 'warming_up', 'half_open', 'cooldown', 'exhausted', 'rate_limited'].includes(row.status)) return;
  const accessToken = credential?.accessToken || credential?.apiKey;
  if (typeof accessToken !== 'string' || !accessToken) throw new Error('Cannot decrypt an active shard credential');
  const accountId = credential?.accountId || (accessToken.startsWith('sk-') ? `acc_${createHash('sha256').update(accessToken).digest('hex')}` : undefined);
  if (typeof accountId !== 'string' || !accountId) throw new Error('Active OAuth shard is missing account identity');
  const expiries = [Number(row.credential_expires_at_ms), Number(credential?.expiresAtMs)].filter(n => Number.isFinite(n) && n > 0);
  try { const exp = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString()).exp; if (typeof exp === 'number' && Number.isFinite(exp)) expiries.push(exp * 1000); } catch {}
  return { id: row.id, provider: row.provider, accountId, accessToken,
    credentialRevision: createHash('sha256').update(JSON.stringify([accessToken, accountId])).digest('hex'),
    cooldownUntilMs: Number(row.cooldown_until_ms) || undefined,
    expiresAtMs: expiries.length ? Math.min(...expiries) : undefined };
}
