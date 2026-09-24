/** Pure helpers for the private local supervisor's bounded recovery contract. */
export const supervisorCauses = Object.freeze(['central', 'monitor', 'relay', 'recovery']);

export function firstFailedCause({ central, monitor, relay }) {
  if (central !== true) return 'central';
  if (monitor !== true) return 'monitor';
  if (relay !== true) return 'relay';
  return null;
}

export function retryDelayMs(attempt, random = Math.random) {
  if (!Number.isSafeInteger(attempt) || attempt < 1 || attempt > 100000) throw Error('Invalid retry attempt.');
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw Error('Invalid retry jitter.');
  const base = Math.min(300000, 5000 * (2 ** Math.min(attempt - 1, 6)));
  return Math.min(300000, Math.round(base * (0.8 + sample * 0.4)));
}

export function composeHealth(expectedServices, rows) {
  if (!Array.isArray(expectedServices) || !Array.isArray(rows)) return { ready: false, unhealthy: [] };
  const expected = [...expectedServices];
  if (expected.length === 0 || expected.some(name => typeof name !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(name)) || new Set(expected).size !== expected.length) return { ready: false, unhealthy: [] };
  const actual = new Map();
  for (const row of rows) {
    const separator = row.indexOf('\t');
    if (separator < 1) return { ready: false, unhealthy: [] };
    const name = row.slice(0, separator).trim();
    const status = row.slice(separator + 1).trim();
    if (!/^[a-z][a-z0-9_-]*$/.test(name) || !status || actual.has(name)) return { ready: false, unhealthy: [] };
    actual.set(name, status);
  }
  const unhealthy = expected.filter(name => /\(unhealthy\)$/.test(actual.get(name) ?? ''));
  const ready = actual.size === expected.length && expected.every(name => /^Up\b.*\(healthy\)$/.test(actual.get(name) ?? ''));
  return { ready, unhealthy };
}

export function poolServiceRecoveryAction(state) {
  if (state === 'running' || state === 'restarting') return 'restart';
  if (['missing', 'created', 'exited', 'dead'].includes(state)) return 'start';
  return null;
}
