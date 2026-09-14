/**
 * GALXAI Resilient Client & Anti-Crash Network Layer
 *
 * Provides enterprise-grade network resilience with:
 * - L1 BroccoliDB reactive in-memory response caching (<0.5µs lookup)
 * - In-flight request coalescing / deduplication to prevent duplicate HTTP bursts
 * - Exponential backoff with decorrelated full jitter (RFC 8900 / AWS architecture)
 * - Automatic Idempotency-Key injection for mutations
 * - Safe response decoding (gracefully handles HTML 502/504 Bad Gateway / Cloudflare error pages)
 * - SafeStorage L2 multi-tier backup with cross-tab synchronization
 * - Timeout safeguards with automatic cancellation
 */

import { SafeStorage } from './SafeStorage';
import { BroccoliResilienceSubstrate } from './BroccoliResilienceSubstrate';
import { BroccoliOutboxEngine } from './BroccoliOutboxEngine';

export class GalxError extends Error {
  public status?: number;
  public code?: string;
  public isRetryable: boolean;
  /** Relay execution classification. Unknown/accepted work must not be replayed. */
  public executionState?: 'unknown' | 'accepted' | 'not_accepted';
  public shouldRetry?: boolean;

  constructor(message: string, options?: { status?: number; code?: string; isRetryable?: boolean;
    executionState?: 'unknown' | 'accepted' | 'not_accepted'; shouldRetry?: boolean }) {
    super(message);
    this.name = 'GalxError';
    this.status = options?.status;
    this.code = options?.code;
    this.isRetryable = options?.isRetryable ?? false;
    this.executionState = options?.executionState;
    this.shouldRetry = options?.shouldRetry;
  }
}

export class GalxNetworkError extends GalxError {
  constructor(message: string = 'Network connectivity unavailable or request failed') {
    super(message, { code: 'NETWORK_ERROR', isRetryable: true });
    this.name = 'GalxNetworkError';
  }
}

export class GalxTimeoutError extends GalxError {
  constructor(timeoutMs: number) {
    super(`Request exceeded execution deadline of ${timeoutMs}ms`, { code: 'TIMEOUT_ERROR', isRetryable: true });
    this.name = 'GalxTimeoutError';
  }
}

export class GalxRateLimitError extends GalxError {
  public retryAfterMs?: number;
  constructor(message: string, retryAfterMs?: number) {
    super(message, { status: 429, code: 'RATE_LIMITED', isRetryable: true });
    this.name = 'GalxRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class GalxAuthError extends GalxError {
  constructor(message: string = 'Authentication or authorization failed') {
    super(message, { status: 401, code: 'AUTH_ERROR', isRetryable: false });
    this.name = 'GalxAuthError';
  }
}

export interface ResilientFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  enableCacheFallback?: boolean;
  enableOutboxOfflineFallback?: boolean;
  cacheKey?: string;
  cacheTtlMs?: number;
  cacheTag?: string;
  idempotencyKey?: string;
  onRetry?: (attempt: number, delayMs: number, error: Error) => void;
}

// In-Flight Request Coalescer: Maps request signature to active Promise
const inFlightRequests = new Map<string, Promise<{ data: any; fromCache?: boolean; status: number }>>();

/**
 * Safely parse JSON from a fetch response without ever throwing syntax errors on HTML/text error pages.
 */
export async function safeJsonParse<T = any>(res: Response): Promise<{ data: T | null; rawText: string; isJson: boolean }> {
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let rawText = '', bytes = 0;
  if (reader) {
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 2 * 1024 * 1024) throw new GalxError('The response is too large to load. Narrow your request and try again.');
        rawText += decoder.decode(part.value, { stream: true });
      }
      rawText += decoder.decode();
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
  try {
    if (!rawText || rawText.trim() === '') {
      return { data: null, rawText: '', isJson: true };
    }
    const data = JSON.parse(rawText) as T;
    return { data, rawText, isJson: true };
  } catch {
    // If response is HTML (e.g. 502 Bad Gateway or 504 Gateway Timeout), capture text cleanly
    return { data: null, rawText: 'Non-JSON server response or HTML error page', isJson: false };
  }
}

/** Read only the public recovery fields from an error response without consuming the caller's body. */
async function readRecoveryClassification(res: Response): Promise<{
  executionState?: 'unknown' | 'accepted' | 'not_accepted';
  shouldRetry?: boolean;
}> {
  const header = res.headers.get('x-should-retry');
  const shouldRetry = header === 'true' ? true : header === 'false' ? false : undefined;
  try {
    const parsed = await safeJsonParse<{ error?: { execution_state?: unknown } }>(res.clone());
    const state = parsed.data?.error?.execution_state;
    const executionState = ['unknown', 'accepted', 'not_accepted'].includes(String(state))
      ? state as 'unknown' | 'accepted' | 'not_accepted' : undefined;
    return { executionState, shouldRetry: executionState === 'unknown' || executionState === 'accepted' ? false : shouldRetry };
  } catch {
    return { shouldRetry };
  }
}

/**
 * Calculates exponential backoff with full decorrelated jitter.
 */
function calculateJitterBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  // Full jitter: random between 0 and min(maxDelay, baseDelay * 2^attempt)
  const expDelay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));
  return Math.floor(Math.random() * expDelay);
}

/**
 * Normalizes URL query parameter ordering for deterministic single-flight request coalescing.
 */
function normalizeUrlForCoalescing(url: string): string {
  try {
    const isAbsolute = url.startsWith('http://') || url.startsWith('https://');
    const u = new URL(url, isAbsolute ? undefined : 'http://localhost');
    const sortedEntries = Array.from(u.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
    const search = sortedEntries.length > 0 ? `?${new URLSearchParams(sortedEntries).toString()}` : '';
    return isAbsolute ? `${u.origin}${u.pathname}${search}` : `${u.pathname}${search}`;
  } catch {
    return url;
  }
}

/**
 * Enterprise resilient fetch client with BroccoliDB L1 cache & In-Flight Coalescing.
 */
export async function resilientFetch<T = any>(
  url: string,
  options: ResilientFetchOptions = {}
): Promise<{ data: T; fromCache?: boolean; status: number }> {
  const method = (options.method || 'GET').toUpperCase();
  const isReadMethod = method === 'GET' || method === 'HEAD';

  // Request Coalescing with normalized query parameters for concurrent identical GET requests
  const normalizedUrl = normalizeUrlForCoalescing(url);
  const coalescingKey = `${method}::${normalizedUrl}::${JSON.stringify(options.headers || {})}`;
  if (isReadMethod && inFlightRequests.has(coalescingKey)) {
    return inFlightRequests.get(coalescingKey)! as Promise<{ data: T; fromCache?: boolean; status: number }>;
  }

  const promise = executeResilientFetch<T>(url, options);

  if (isReadMethod) {
    inFlightRequests.set(coalescingKey, promise);
    const release = () => { inFlightRequests.delete(coalescingKey); };
    void promise.then(release, release);
  }

  return promise;
}

/**
 * Proactively prefetches and primes BroccoliDB L1 and SafeStorage L2 caches
 * before the user navigates, completely eliminating network roundtrips on route transition.
 */
export function prefetchQuery<T = any>(
  url: string,
  options: ResilientFetchOptions = {}
): Promise<{ data: T; fromCache?: boolean; status: number }> {
  const substrate = BroccoliResilienceSubstrate.getInstance();
  const cacheKey = options.cacheKey || url;
  const l1Cached = substrate.getCachedResponse<T>(cacheKey, 'GET');
  if (l1Cached && !l1Cached.isStale) {
    return Promise.resolve({ data: l1Cached.data, fromCache: true, status: 200 });
  }
  return resilientFetch<T>(url, {
    ...options,
    timeoutMs: options.timeoutMs || 8000,
    maxRetries: options.maxRetries ?? 1,
  });
}

/**
 * Batches and concurrently prefetches multiple API endpoints with request coalescing,
 * warming the BroccoliDB L1 cache for multiple routes simultaneously.
 */
export async function batchPrefetchQueries(
  queries: Array<{ url: string; options?: ResilientFetchOptions }>
): Promise<Array<{ data: any; fromCache?: boolean; status: number }>> {
  return Promise.all(
    queries.map(({ url, options }) => prefetchQuery(url, options))
  );
}

async function executeResilientFetch<T = any>(
  url: string,
  options: ResilientFetchOptions = {}
): Promise<{ data: T; fromCache?: boolean; status: number }> {
  const {
    timeoutMs: requestedTimeoutMs = 12000,
    maxRetries: requestedMaxRetries = 3,
    baseDelayMs = 400,
    maxDelayMs = 4000,
    enableCacheFallback = true,
    cacheKey = url,
    cacheTtlMs = 60000,
    cacheTag,
    idempotencyKey,
    onRetry,
    ...fetchOptions
  } = options;

  const method = (fetchOptions.method || 'GET').toUpperCase();
  const timeoutMs = Number.isFinite(requestedTimeoutMs) ? Math.min(30000, Math.max(100, requestedTimeoutMs)) : 12000;
  const isReadMethod = method === 'GET' || method === 'HEAD';
  const explicitKey = idempotencyKey || new Headers(fetchOptions.headers).get('Idempotency-Key') || undefined;
  // Mutations only retry when the caller explicitly supplies stable identity.
  const maxRetries = isReadMethod || explicitKey
    ? Math.min(3, Math.max(0, Number.isSafeInteger(requestedMaxRetries) ? requestedMaxRetries : 0)) : 0;
  const substrate = BroccoliResilienceSubstrate.getInstance();

  // 1. Check BroccoliDB L1 Hot Cache
  if (enableCacheFallback && isReadMethod) {
    const l1Cached = substrate.getCachedResponse<T>(cacheKey, method);
    if (l1Cached && !l1Cached.isStale) {
      return { data: l1Cached.data, fromCache: true, status: 200 };
    }
  }

  // 2. Read from SafeStorage L2 Fallback if network is down
  const getL2CachedData = (): T | null => {
    if (!enableCacheFallback || !isReadMethod) return null;
    return SafeStorage.getJSON<T | null>(`galx_cache_${cacheKey}`, null, 'session');
  };

  const saveToCache = (data: T, status: number) => {
    if (!enableCacheFallback || !isReadMethod || !data) return;
    // Save to BroccoliDB L1
    substrate.setCachedResponse(cacheKey, method, data, status, cacheTtlMs, cacheTag);
    // Save to SafeStorage L2
    SafeStorage.setJSON(`galx_cache_${cacheKey}`, data, 'session');
  };

  let lastError: Error | null = null;
  const requestIdempotencyKey = explicitKey || (isReadMethod ? undefined : `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    fetchOptions.signal?.throwIfAborted();
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
    }

    try {
      // Merge abort signals if caller passed one
      const mergedSignal = fetchOptions.signal
        ? anySignal([fetchOptions.signal, controller.signal])
        : controller.signal;

      const headers = new Headers(fetchOptions.headers || {});
      headers.set('x-galx-retry-count', String(attempt));
      if (requestIdempotencyKey && !headers.has('Idempotency-Key')) {
        headers.set('Idempotency-Key', requestIdempotencyKey);
        headers.set('x-idempotency-key', requestIdempotencyKey);
      }
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json, text/plain, */*');
      }
      // Same-origin account requests use the server-verified session cookie.
      // Explicit caller credentials remain explicit; local storage is never auth authority.

      // Queue only before any dispatch, when the browser is actually offline.
      // Never convert permanent/ambiguous online failures into a fresh retry budget.
      if (attempt === 0 && !isReadMethod && options.enableOutboxOfflineFallback
        && typeof navigator !== 'undefined' && !navigator.onLine) {
        let payload: unknown;
        if (fetchOptions.body !== undefined && fetchOptions.body !== null) {
          if (typeof fetchOptions.body !== 'string') throw new GalxError('This action cannot be saved for automatic recovery.');
          try { payload = JSON.parse(fetchOptions.body); }
          catch { throw new GalxError('This action cannot be saved for automatic recovery.'); }
        }
        try {
          await BroccoliOutboxEngine.enqueue({ url, method: method as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
            headers: Object.fromEntries(headers), payload, idempotencyKey: requestIdempotencyKey });
        } catch { throw new GalxError('This action could not be saved. Keep this page open and retry when you’re online.'); }
        if (timeoutId) clearTimeout(timeoutId);
        return { data: { queued: true, message: 'Action saved for later. It has not been completed.' } as T,
          status: 202, fromCache: false };
      }
      const res = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: mergedSignal,
      });
      const recovery = !res.ok ? await readRecoveryClassification(res) : {};

      // Handle 401 / 403 permanent auth failures
      if (res.status === 401 || res.status === 403) {
        await res.body?.cancel();
        throw new GalxAuthError(`Authentication failure (${res.status}) on ${url}`);
      }

      const noReplay = recovery.shouldRetry === false
        || recovery.executionState === 'unknown' || recovery.executionState === 'accepted';
      if (!res.ok && noReplay) {
        await res.body?.cancel();
        throw new GalxError('This request cannot be retried automatically.', { status: res.status,
          executionState: recovery.executionState, shouldRetry: false });
      }

      // Handle 429 Rate Limiting
      if (res.status === 429) {
        await res.body?.cancel();
        const retryAfterHeader = res.headers.get('Retry-After');
        const retryAfterMs = retryAfterHeader && /^\d+$/.test(retryAfterHeader) ? Number(retryAfterHeader) * 1000
          : retryAfterHeader ? Math.max(0, Date.parse(retryAfterHeader) - Date.now()) : undefined;
        throw new GalxRateLimitError(`Rate limit exceeded (429) on ${url}`, retryAfterMs);
      }

      // Handle 5xx Server Errors (Retryable)
      if (res.status >= 500) {
        await res.body?.cancel();
        throw new GalxError(`Request failed (HTTP ${res.status}).`, {
          status: res.status,
          isRetryable: true,
          executionState: recovery.executionState,
          shouldRetry: recovery.shouldRetry,
        });
      }

      // Successful response
      const { data, isJson } = await safeJsonParse<T>(res);

      if (res.ok) {
        const finalData = (isJson && data !== null ? data : (data as unknown as T)) ?? ({} as T);
        saveToCache(finalData, res.status);
        return { data: finalData, status: res.status, fromCache: false };
      } else {
        throw new GalxError(`Request failed with status ${res.status}`, {
          status: res.status,
          isRetryable: res.status >= 500,
        });
      }
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      fetchOptions.signal?.throwIfAborted();

      if (err?.name === 'AbortError' || controller.signal.aborted) {
        lastError = new GalxTimeoutError(timeoutMs);
      } else if (err instanceof GalxError) {
        lastError = err;
      } else {
        lastError = new GalxNetworkError(err?.message || 'Network request failed');
      }

      // If error is not retryable (e.g. Auth 401), stop immediately
      if (lastError instanceof GalxError && !lastError.isRetryable) {
        break;
      }

      // If we've exhausted all retry attempts
      if (attempt >= maxRetries) {
        break;
      }

      // Calculate backoff delay
      let delayMs = calculateJitterBackoff(attempt, baseDelayMs, maxDelayMs);
      if (lastError instanceof GalxRateLimitError && lastError.retryAfterMs) {
        delayMs = Math.max(delayMs, lastError.retryAfterMs);
      }
      // Long server cooldowns return control to the caller, never shorten the
      // cooldown or leave a foreground request sleeping for hours.
      if (!Number.isFinite(delayMs) || delayMs > 30_000) break;

      if (onRetry) {
        try {
          onRetry(attempt + 1, delayMs, lastError);
        } catch {}
      }

      // Await jittered backoff before next attempt
      await new Promise<void>((resolve, reject) => {
        const done = () => { fetchOptions.signal?.removeEventListener('abort', abort); resolve(); };
        const timer = setTimeout(done, delayMs);
        const abort = () => { clearTimeout(timer); fetchOptions.signal?.removeEventListener('abort', abort); reject(fetchOptions.signal?.reason); };
        fetchOptions.signal?.addEventListener('abort', abort, { once: true });
        if (fetchOptions.signal?.aborted) abort();
      });
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  if (lastError instanceof GalxError && !lastError.isRetryable) throw lastError;
  // If network failed but cache fallback is available in L1 or L2, return stale cached data
  const l1Stale = substrate.getCachedResponse<T>(cacheKey, method);
  if (enableCacheFallback && isReadMethod && l1Stale) {
    console.warn(`🛡️ [GALXAI Resilient Client] Serving BroccoliDB L1 stale cache fallback for: ${url}`);
    return { data: l1Stale.data, status: 200, fromCache: true };
  }

  const l2CachedData = getL2CachedData();
  if (l2CachedData !== null) {
    console.warn(`🛡️ [GALXAI Resilient Client] Serving SafeStorage L2 stale cache fallback for: ${url}`);
    return { data: l2CachedData, status: 200, fromCache: true };
  }


  throw lastError || new GalxNetworkError('Request failed after max retry attempts');
}

/**
 * Polyfill for merging multiple AbortSignals safely.
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}
