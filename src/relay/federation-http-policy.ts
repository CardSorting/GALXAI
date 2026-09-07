import type { IncomingHttpHeaders } from 'node:http';
import { RequestError } from './request-policy.js';

/** Propagate operational context, never client identity or arbitrary proxy headers. */
export function relayRequestHeaders(headers: IncomingHttpHeaders): Record<string, string> {
  const forwarded: Record<string, string> = {};
  for (const name of ['idempotency-key', 'x-galx-task-id', 'x-request-id']) {
    const value = headers[name];
    if (value === undefined) continue;
    if (typeof value !== 'string' || !/^[\x21-\x7e]{1,128}$/.test(value)) throw new RequestError(400, 'invalid_request_header', `${name} must contain 1–128 visible ASCII characters.`);
    forwarded[name] = value;
  }
  return forwarded;
}
export function relayResponseHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of ['retry-after', 'x-should-retry', 'x-galx-trace-id', 'x-galx-task-id', 'x-galx-idempotency-hit',
    'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']) {
    const value = headers.get(name);
    if (value && value.length <= 256 && /^[\x20-\x7e]+$/.test(value)) result[name] = value;
  }
  return result;
}
/** Worker acknowledgements, status and inventory are bounded control-plane JSON. */
export async function readRelayJson(response: Response, maxBytes = 65536): Promise<Record<string, any>> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Missing relay response');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > maxBytes) throw new Error('Relay control response exceeds limit');
      chunks.push(value);
    }
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Invalid relay response');
    return result;
  } finally { await reader.cancel().catch(() => {}); }
}
