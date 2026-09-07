import { GALX_API_BASE_URL } from './base-url';

/**
 * GALXAI Autonomous Zero-Migration Interceptor (Auto-Patcher)
 * Automatically redirects existing OpenAI, Anthropic, and Replicate HTTP traffic to GALXAI Wholesale Gateway.
 *
 * @example
 * ```ts
 * // Put at the top of your index.ts / layout.tsx / server.ts:
 * import 'galxai/patch';
 *
 * // Existing OpenAI code now automatically runs through GALXAI with wholesale pricing:
 * import OpenAI from 'openai';
 * const openai = new OpenAI();
 * ```
 */

const TARGET_HOSTS = [
  'api.openai.com',
  'api.anthropic.com',
  'api.replicate.com'
];

let isPatched = false;

export function patchAI(options: { baseURL?: string; apiKey?: string } = {}) {
  if (isPatched || typeof globalThis === 'undefined' || !globalThis.fetch) {
    return;
  }

  const originalFetch = globalThis.fetch;
  const galxBase = (options.baseURL || process.env.GALXAI_BASE_URL || GALX_API_BASE_URL).replace(/\/$/, '');
  const galxKey = options.apiKey || process.env.GALXAI_API_KEY || process.env.GALX_API_KEY;

  globalThis.fetch = async function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    const isMatch = TARGET_HOSTS.some(host => urlStr.includes(host));
    if (!isMatch) {
      return originalFetch(input, init);
    }

    // Rewrite URL to GALXAI Wholesale Gateway
    const parsed = new URL(urlStr);
    const targetPath = parsed.pathname;
    const rewrittenUrl = `${galxBase}${targetPath.startsWith('/v1') ? targetPath.replace(/^\/v1/, '') : targetPath}${parsed.search || ''}`;

    const headers = new Headers(init?.headers || (typeof input === 'object' && 'headers' in input ? (input as any).headers : {}));
    if (galxKey) {
      headers.set('Authorization', `Bearer ${galxKey}`);
    }
    headers.set('X-Galx-Patched', 'true');

    return originalFetch(rewrittenUrl, {
      ...init,
      headers
    });
  };

  isPatched = true;
  if (process.env.NODE_ENV !== 'production') {
    console.log('\x1b[36m[GALXAI Auto-Patch]\x1b[0m AI HTTP traffic automatically routed to GALXAI Wholesale Gateway.');
  }
}

// Auto-patch on import
patchAI();

export default patchAI;
