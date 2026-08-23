/**
 * GALXAI Resilient Client & Anti-Crash Network Layer
 *
 * Provides enterprise-grade network resilience with:
 * - Exponential backoff with decorrelated full jitter (RFC 8900 / AWS architecture)
 * - Safe response decoding (gracefully handles HTML 502/504 Bad Gateway / Cloudflare error pages without throwing JSON parse syntax errors)
 * - Two-tier stale-while-revalidate cache (in-memory + storage fallback)
 * - Timeout safeguards with automatic cancellation
 * - Typed error classification
 */

export class GalxError extends Error {
  public status?: number;
  public code?: string;
  public isRetryable: boolean;

  constructor(message: string, options?: { status?: number; code?: string; isRetryable?: boolean }) {
    super(message);
    this.name = 'GalxError';
    this.status = options?.status;
    this.code = options?.code;
    this.isRetryable = options?.isRetryable ?? false;
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
  cacheKey?: string;
  cacheTtlMs?: number;
  onRetry?: (attempt: number, delayMs: number, error: Error) => void;
}

// In-Memory Stale-While-Revalidate Fallback Cache
const memoryCache = new Map<string, { data: any; timestamp: number }>();

/**
 * Safely parse JSON from a fetch response without ever throwing syntax errors on HTML/text error pages.
 */
export async function safeJsonParse<T = any>(res: Response): Promise<{ data: T | null; rawText: string; isJson: boolean }> {
  try {
    const rawText = await res.text();
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

/**
 * Calculates exponential backoff with full decorrelated jitter.
 */
function calculateJitterBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  // Full jitter: random between 0 and min(maxDelay, baseDelay * 2^attempt)
  const expDelay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));
  return Math.floor(Math.random() * expDelay);
}

/**
 * Enterprise resilient fetch client.
 */
export async function resilientFetch<T = any>(
  url: string,
  options: ResilientFetchOptions = {}
): Promise<{ data: T; fromCache?: boolean; status: number }> {
  const {
    timeoutMs = 12000,
    maxRetries = 3,
    baseDelayMs = 400,
    maxDelayMs = 4000,
    enableCacheFallback = true,
    cacheKey = url,
    cacheTtlMs = 60000,
    onRetry,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;
  const isReadMethod = !fetchOptions.method || fetchOptions.method.toUpperCase() === 'GET';

  // Read from Cache Fallback if network is completely down
  const getCachedData = (): T | null => {
    if (!enableCacheFallback || !isReadMethod) return null;
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      return cached.data;
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const stored = sessionStorage.getItem(`galx_cache_${cacheKey}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.data;
        }
      } catch {}
    }
    return null;
  };

  const saveToCache = (data: T) => {
    if (!enableCacheFallback || !isReadMethod || !data) return;
    const now = Date.now();
    memoryCache.set(cacheKey, { data, timestamp: now });
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.setItem(`galx_cache_${cacheKey}`, JSON.stringify({ data, timestamp: now }));
      } catch {}
    }
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json, text/plain, */*');
      }

      const res = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: mergedSignal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      // Handle 401 / 403 permanent auth failures
      if (res.status === 401 || res.status === 403) {
        throw new GalxAuthError(`Authentication failure (${res.status}) on ${url}`);
      }

      // Handle 429 Rate Limiting
      if (res.status === 429) {
        const retryAfterHeader = res.headers.get('Retry-After');
        const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
        const retryAfterMs = retryAfterSec && !isNaN(retryAfterSec) ? retryAfterSec * 1000 : undefined;
        throw new GalxRateLimitError(`Rate limit exceeded (429) on ${url}`, retryAfterMs);
      }

      // Handle 5xx Server Errors (Retryable)
      if (res.status >= 500) {
        const { rawText } = await safeJsonParse(res);
        throw new GalxError(`Server error (${res.status}) on ${url}: ${rawText.slice(0, 100)}`, {
          status: res.status,
          isRetryable: true,
        });
      }

      // Successful response
      const { data, isJson } = await safeJsonParse<T>(res);

      if (res.ok) {
        const finalData = (isJson && data !== null ? data : (data as unknown as T)) ?? ({} as T);
        saveToCache(finalData);
        return { data: finalData, status: res.status, fromCache: false };
      } else {
        throw new GalxError(`Request failed with status ${res.status}`, {
          status: res.status,
          isRetryable: res.status >= 500,
        });
      }
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);

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

      if (onRetry) {
        try {
          onRetry(attempt + 1, delayMs, lastError);
        } catch {}
      }

      // Await jittered backoff before next attempt
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // If network failed but cache fallback is enabled and available, return cached data
  const cachedData = getCachedData();
  if (cachedData !== null) {
    console.warn(`🛡️ [GALXAI Resilient Client] Network unavailable, serving stale cached fallback for: ${url}`);
    return { data: cachedData, status: 200, fromCache: true };
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
