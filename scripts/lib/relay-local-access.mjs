/** Fixed destinations only. This module never accepts a caller-supplied origin. */
export function monitorOrigin(pool) {
  if (!['premium', 'standard'].includes(pool)) throw Error('Choose Premium or Standard.');
  return `http://127.0.0.1:${pool === 'premium' ? 13311 : 13312}`;
}

export async function monitorTicket(pool, config, fetcher = fetch) {
  const origin = monitorOrigin(pool);
  if (config.pool !== pool || typeof config.operatorToken !== 'string' || !config.operatorToken) {
    throw Error('The monitor configuration does not match this shortcut.');
  }
  const response = await fetcher(`${origin}/session/ticket`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${config.operatorToken}` },
  });
  if (!response.ok) {
    const error = Error('Monitor access is unavailable. Check the connection and try again.');
    error.status = response.status; throw error;
  }
  const data = await response.json();
  if (!/^[a-f0-9]{64}$/.test(data.ticket) || data.role !== 'operator') throw Error('The monitor returned an invalid sign-in link.');
  return `${origin}/#ticket=${data.ticket}&role=operator`;
}

async function available(origin, fetcher) {
  try {
    const response = await fetcher(`${origin}/health/live`, { redirect: 'error', signal: AbortSignal.timeout(2000) });
    return response.ok && (await response.json()).ok === true;
  } catch { return false; }
}
export const monitorAvailable = (pool, fetcher = fetch) => available(monitorOrigin(pool), fetcher);
export const runtimeAvailable = (pool, fetcher = fetch) => available(monitorOrigin(pool).replace(pool === 'premium' ? ':13311' : ':13312', pool === 'premium' ? ':13301' : ':13302'), fetcher);

export function handoffDeadline(lastSeenAt, now = Date.now()) {
  if (lastSeenAt == null) return now;
  const last = Date.parse(lastSeenAt);
  if (!Number.isFinite(last) || last > now + 5000) throw Error('The last runtime update could not be verified.');
  // Existing central claim rule fences a different epoch for 60 seconds.
  return Math.max(now, last + 61000);
}

export async function monitorHandoff(pool, config, fetcher = fetch) {
  const origin = monitorOrigin(pool);
  const url = new URL(await monitorTicket(pool, config, fetcher));
  const ticket = new URLSearchParams(url.hash.slice(1)).get('ticket');
  const session = await fetcher(`${origin}/session`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket, role: 'operator' }) });
  if (!session.ok) throw Error('Could not check the runtime handoff.');
  const cookie = session.headers.get('set-cookie')?.split(';')[0];
  if (!cookie) throw Error('Could not check the runtime handoff.');
  try {
    const response = await fetcher(`${origin}/api/status`, { headers: { Cookie: cookie }, redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw Error('Could not check the runtime handoff.');
    const status = await response.json();
    if (status.pool !== pool || status.installationId !== config.installationId) throw Error('The runtime installation changed.');
    return handoffDeadline(status.lastSeenAt);
  } finally {
    await fetcher(`${origin}/session`, { method: 'DELETE', headers: { Origin: origin, Cookie: cookie }, redirect: 'error', signal: AbortSignal.timeout(5000) }).catch(() => {});
  }
}
