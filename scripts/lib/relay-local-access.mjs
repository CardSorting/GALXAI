/** Fixed destinations only. This module never accepts a caller-supplied origin. */
export function monitorOrigin(pool) {
  if (pool !== 'premium') throw Error('Choose Premium.');
  return 'http://127.0.0.1:13311';
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
export const runtimeAvailable = (pool, fetcher = fetch) => available(monitorOrigin(pool).replace(':13311', ':13301'), fetcher);

export function handoffDeadline(lastSeenAt, now = Date.now()) {
  if (lastSeenAt == null) return now;
  const last = Date.parse(lastSeenAt);
  if (!Number.isFinite(last) || last > now + 5000) throw Error('The last runtime update could not be verified.');
  // Existing central claim rule fences a different epoch for 60 seconds.
  return Math.max(now, last + 61000);
}

async function runtimeControl(pool, config, readControlStatus) {
  monitorOrigin(pool);
  if (config.pool !== pool || typeof config.installationId !== 'string' || !config.installationId || typeof readControlStatus !== 'function') throw Error('Could not check the runtime handoff.');
  // Host administrator reads central authority directly. Browser snapshots
  // deliberately omit installation identity and the ownership timestamp.
  const status = await readControlStatus();
  if (status?.pool !== pool || status.installationId !== config.installationId) throw Error('The runtime installation changed.');
  if (!Object.hasOwn(status,'lastSeenAt') || status.lastSeenAt !== null && typeof status.lastSeenAt !== 'string') throw Error('The last runtime update could not be verified.');
  return status;
}

/** Liveness cannot establish ownership after a missed control heartbeat. */
export async function runtimeOwnershipFresh(pool, config, readControlStatus, now = Date.now()) {
  const status = await runtimeControl(pool, config, readControlStatus);
  handoffDeadline(status.lastSeenAt, now); // Reject malformed or implausibly future evidence.
  const last = Date.parse(status.lastSeenAt);
  return Number.isFinite(last) && last <= now && now - last < 45000;
}

export async function monitorHandoff(pool, config, readControlStatus) {
  const status = await runtimeControl(pool, config, readControlStatus);
  return handoffDeadline(status.lastSeenAt);
}
