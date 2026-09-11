import { randomUUID } from 'node:crypto';
import { sitesContractQuery, verifySitesContractResponse } from '../../relay/sites-contract';

/** No inference, retries or wallet writes. A fresh challenge rejects old workers
 * and cached replies before admission; the relay also checks at dispatch. */
export async function requireSitesRelayPreflight(options: { url: string; adminKey: string | undefined;
  model: string; maxOutputTokens: number; profile?: 'sites-local-v1'; signal?: AbortSignal }, transport: typeof fetch = fetch): Promise<void> {
  try {
    const origin = new URL(options.url);
    if (!options.adminKey || !/^[\x21-\x7e]{1,8192}$/.test(options.adminKey) || origin.username || origin.password ||
        origin.pathname !== '/' || origin.search || origin.hash || !(origin.protocol === 'https:' ||
          (origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)))) throw new Error();
    const request = { model: options.model, maxOutputTokens: options.maxOutputTokens, nonce: randomUUID(),
      ...(options.profile ? { profile: options.profile } : {}) };
    const url = new URL('/api/sites/contract', origin); url.search = sitesContractQuery(request).toString();
    const signal = AbortSignal.any([AbortSignal.timeout(6000), ...(options.signal ? [options.signal] : [])]);
    signal.throwIfAborted();
    const response = await transport(url, { headers: { Authorization: `Bearer ${options.adminKey}` },
      method: 'GET', cache: 'no-store', redirect: 'error', signal });
    await verifySitesContractResponse(response, request);
    signal.throwIfAborted();
  } catch { throw new Error('Content unavailable'); }
}
