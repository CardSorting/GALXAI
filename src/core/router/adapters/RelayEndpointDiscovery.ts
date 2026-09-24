import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { RelayDispatchError } from './RelayChatTransport';

export type RelayWorkload = 'text' | 'sites' | 'images';
export type RelayPool = 'PREMIUM';
export type ImageCapability = 'available' | 'unavailable' | 'unknown';

export interface RelayEndpoint {
  url: string;
  key: string;
}

export interface ResolvedRelay extends RelayEndpoint {
  availability?: ImageCapability;
}

interface RelayCandidate extends RelayEndpoint {
  defaultPort: boolean;
  order: number;
}

interface ProbeResult {
  candidate: RelayCandidate;
  availability?: ImageCapability;
  score: number;
  latencyMs: number;
}

interface CircuitState {
  failures: number;
  openUntil: number;
}

interface DiscoveryCacheEntry {
  key: string;
  result: ResolvedRelay;
  expiresAt: number;
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '[::1]', 'localhost']);
// Only inference listeners belong in automatic workload discovery. The
// adjacent monitor/management listener is intentionally not a candidate.
const DEFAULT_PORTS = [13301];
const MAX_CANDIDATES = 32;
const MAX_PORT_RANGE = 32;
const PROBE_TIMEOUT_MS = 900;
const DISCOVERY_TTL_MS = 15_000;
const UNAVAILABLE_TTL_MS = 4_000;
const CIRCUIT_FAILURE_THRESHOLD = 2;
const CIRCUIT_COOLDOWN_MS = 15_000;

const circuits = new Map<string, CircuitState>();
const discoveryCache = new Map<string, DiscoveryCacheEntry>();

function env(pool: RelayPool, suffix: string): string {
  return process.env[`GALX_${pool}_RELAY_${suffix}`]?.trim() || '';
}

/**
 * Local split-service installs keep the inference credential in the private
 * component file. Production can inject the same value through a secret
 * manager. This helper never returns configuration fields other than the
 * server-only inference credential.
 */
export function configuredRelayKey(pool: RelayPool): string {
  const direct = env(pool, 'KEY');
  if (direct) return direct;
  for (const configFile of [env(pool, 'CONFIG_FILE'), env(pool, 'DISCOVERY_FILE')].filter(Boolean)) {
    try {
      const config = JSON.parse(readFileSync(path.resolve(configFile), 'utf8')) as { inferenceKey?: unknown };
      if (typeof config.inferenceKey === 'string' && config.inferenceKey.trim()) return config.inferenceKey.trim();
    } catch {
      // The optional file is handled as absent; candidate validation still fails closed.
    }
  }
  return '';
}

function readDiscoveryConfig(pool: RelayPool): Record<string, unknown> {
  const files = [env(pool, 'DISCOVERY_FILE'), env(pool, 'CONFIG_FILE')].filter(Boolean);
  const merged: Record<string, unknown> = {};
  for (const file of files) {
    try {
      const value = JSON.parse(readFileSync(path.resolve(file), 'utf8')) as unknown;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) Object.assign(merged, value);
    } catch {
      // A malformed optional discovery file is treated as absent. The direct
      // configuration remains authoritative and invalid candidates fail closed.
    }
  }
  return merged;
}

function stringList(value: unknown): string[] {
  if (typeof value === 'string') return value.split(',').map(item => item.trim()).filter(Boolean);
  if (Array.isArray(value)) return value.flatMap(item => stringList(item));
  if (value !== null && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return stringList(item.url ?? item.origin ?? item.address);
  }
  return [];
}

function numberList(value: unknown): number[] {
  return stringList(value).flatMap(item => {
    const port = Number(item);
    return Number.isInteger(port) && port >= 1 && port <= 65535 ? [port] : [];
  });
}

function readConfigValues(config: Record<string, unknown>, keys: string[]): unknown[] {
  return keys.flatMap(key => config[key] === undefined ? [] : [config[key]]);
}

function portRange(value: unknown): number[] {
  const raw = stringList(value)[0] || '';
  const match = /^(\d{1,5})\s*-\s*(\d{1,5})$/.exec(raw);
  if (!match) return [];
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > 65535 || end - start + 1 > MAX_PORT_RANGE) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function validKey(key: string): boolean {
  return /^[A-Za-z0-9_-]{32,256}$/.test(key);
}

function validOrigin(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname))) return null;
    return url;
  } catch {
    return null;
  }
}

function candidateKey(url: URL): string {
  return url.origin;
}

/**
 * Build a small private candidate set rather than scanning arbitrary hosts.
 * Explicit URLs win ties; known local pool ports and an operator-supplied
 * bounded range make a stale published port recoverable without shelling out
 * to Docker or leaking topology into a response.
 */
export function relayCandidates(pool: RelayPool = 'PREMIUM'): RelayEndpoint[] {
  return internalCandidates(pool).map(({ url, key }) => ({ url, key }));
}

function internalCandidates(pool: RelayPool): RelayCandidate[] {
  const config = readDiscoveryConfig(pool);
  const urls = [
    env(pool, 'URL'),
    ...stringList(env(pool, 'URLS')),
    ...stringList(readConfigValues(config, ['relayUrl', 'relayUrls', 'relayOrigin', 'relayOrigins', 'urls', 'endpoints'])),
  ];
  const parsed = urls.map(validOrigin).filter((url): url is URL => Boolean(url));
  const configuredBase = parsed[0];
  const host = env(pool, 'HOST') || configuredBase?.hostname || '127.0.0.1';
  const canDiscoverPorts = LOOPBACK_HOSTS.has(host);
  const protocol = env(pool, 'PROTOCOL') || configuredBase?.protocol || 'http:';
  const ports = [
    ...numberList(env(pool, 'PORTS')),
    ...numberList(env(pool, 'PORT')),
    ...numberList(readConfigValues(config, ['relayPort', 'relayPorts', 'port', 'ports', 'httpPort', 'listenPort'])),
    ...portRange(env(pool, 'PORT_RANGE')),
    ...portRange(readConfigValues(config, ['relayPortRange', 'portRange'])[0]),
    ...(canDiscoverPorts ? DEFAULT_PORTS : []),
  ];
  const unique = new Map<string, RelayCandidate>();
  const key = configuredRelayKey(pool);
  const add = (url: URL, defaultPort: boolean) => {
    if (!validKey(key)) return;
    const origin = candidateKey(url);
    if (!unique.has(origin)) unique.set(origin, { url: origin, key, defaultPort, order: unique.size });
  };
  parsed.forEach(url => {
    const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
    add(url, DEFAULT_PORTS.includes(port));
  });
  if (canDiscoverPorts && (protocol === 'http:' || protocol === 'https:')) {
    for (const port of [...new Set(ports)]) {
      const url = new URL(`${protocol}//${host}`);
      url.port = String(port);
      add(url, DEFAULT_PORTS.includes(port));
      if (unique.size >= MAX_CANDIDATES) break;
    }
  }
  return [...unique.values()];
}

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function circuitKey(endpoint: RelayEndpoint): string {
  return `${endpoint.url}:${fingerprint(endpoint.key)}`;
}

function circuitOpen(endpoint: RelayEndpoint): boolean {
  const state = circuits.get(circuitKey(endpoint));
  return Boolean(state && state.openUntil > Date.now());
}

function recordProbeSuccess(endpoint: RelayEndpoint): void {
  circuits.delete(circuitKey(endpoint));
}

export function reportRelayFailure(endpoint: RelayEndpoint): void {
  const key = circuitKey(endpoint);
  const state = circuits.get(key) || { failures: 0, openUntil: 0 };
  state.failures += 1;
  if (state.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    state.openUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
    for (const [cacheKey, entry] of discoveryCache) {
      if (entry.result.url === endpoint.url) discoveryCache.delete(cacheKey);
    }
  }
  circuits.set(key, state);
}

async function boundedJson(response: Response, maxBytes: number): Promise<Record<string, unknown> | null> {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maxBytes) return null;
      chunks.push(part.value);
    }
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  } finally {
    await reader.cancel().catch(() => {});
  }
}

async function getJson(fetcher: typeof fetch, endpoint: RelayEndpoint, pathName: string, signal: AbortSignal): Promise<{ response: Response; data: Record<string, unknown> | null } | null> {
  try {
    const response = await fetcher(new URL(pathName, endpoint.url), {
      headers: { Authorization: `Bearer ${endpoint.key}`,
        ...(pathName === '/v1/models' ? { 'x-galx-tenant': createHash('sha256').update('relay-discovery').digest('hex') } : {}) },
      redirect: 'error', cache: 'no-store', signal,
    });
    return { response, data: response.ok ? await boundedJson(response, 4096) : null };
  } catch {
    return null;
  }
}

async function probeCandidate(candidate: RelayCandidate, workload: RelayWorkload, fetcher: typeof fetch): Promise<ProbeResult | null> {
  if (circuitOpen(candidate)) return null;
  const started = Date.now();
  const signal = AbortSignal.timeout(PROBE_TIMEOUT_MS);
  const liveHealth = await getJson(fetcher, candidate, '/health/live', AbortSignal.timeout(PROBE_TIMEOUT_MS));
  const health = liveHealth?.response.ok ? liveHealth : await getJson(fetcher, candidate, '/health', AbortSignal.timeout(PROBE_TIMEOUT_MS));
  if (!health || !health.response.ok) return null;
  if (workload !== 'images') {
    // Health is a liveness signal, not proof that this is an inference
    // listener. Require the authenticated model contract so monitor-only or
    // stale control ports cannot win text/Sites discovery.
    const models = await getJson(fetcher, candidate, '/v1/models', AbortSignal.timeout(PROBE_TIMEOUT_MS));
    const inventory = models?.data?.data;
    if (!models?.response.ok || !Array.isArray(inventory) || inventory.length === 0 || inventory.length > 2000
      || inventory.some(model => !model || typeof model !== 'object' || typeof (model as Record<string, unknown>).id !== 'string')) return null;
    recordProbeSuccess(candidate);
    return { candidate, score: 220 + (candidate.defaultPort ? 10 : 0), latencyMs: Date.now() - started };
  }
  const capability = await getJson(fetcher, candidate, '/v1/images/availability?model=gpt-image-2', AbortSignal.timeout(PROBE_TIMEOUT_MS));
  if (!capability || !capability.response.ok || !capability.data || !('available' in capability.data)) return null;
  const available = capability.data.available;
  if (!(available === true || available === false || available === null)) return null;
  recordProbeSuccess(candidate);
  const availability: ImageCapability = available === true ? 'available' : available === false ? 'unavailable' : 'unknown';
  const capabilityScore = available === true ? 300 : available === null ? 200 : 100;
  return { candidate, availability, score: capabilityScore + (candidate.defaultPort ? 10 : 0), latencyMs: Date.now() - started };
}

function cacheKey(workload: RelayWorkload, candidates: RelayCandidate[]): string {
  return `${workload}:${candidates.map(candidate => `${candidate.url}:${fingerprint(candidate.key)}`).join('|')}`;
}

export function clearRelayDiscoveryCache(): void {
  discoveryCache.clear();
}

export async function resolveIsolatedRelay(workload: RelayWorkload, options: { fetcher?: typeof fetch; cache?: boolean } = {}): Promise<ResolvedRelay> {
  const candidates = internalCandidates('PREMIUM');
  if (!candidates.length) throw new RelayDispatchError('invalid_configuration');
  const fetcher = options.fetcher || globalThis.fetch;
  const useCache = options.cache ?? fetcher === globalThis.fetch;
  const key = cacheKey(workload, candidates);
  const cached = discoveryCache.get(key);
  if (useCache && cached && cached.expiresAt > Date.now()) return cached.result;

  const results = (await Promise.all(candidates.map(candidate => probeCandidate(candidate, workload, fetcher)))).filter((result): result is ProbeResult => Boolean(result));
  if (!results.length) throw new RelayDispatchError('relay_discovery_failed');
  results.sort((left, right) => right.score - left.score || left.latencyMs - right.latencyMs || left.candidate.order - right.candidate.order);
  const winner = results[0];
  const result: ResolvedRelay = { url: winner.candidate.url, key: winner.candidate.key, ...(winner.availability ? { availability: winner.availability } : {}) };
  if (useCache) discoveryCache.set(key, { key, result, expiresAt: Date.now() + (winner.availability === 'available' ? DISCOVERY_TTL_MS : UNAVAILABLE_TTL_MS) });
  return result;
}
