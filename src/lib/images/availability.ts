import { isolatedRelay, isolatedRelaysEnabled } from '../../core/router/adapters/IsolatedRelayTransport';
export type ImageAvailability = 'available' | 'unavailable' | 'unknown';

/** Advisory read only. An outage or malformed response never establishes readiness. */
export async function readImageAvailability(fetcher = fetch): Promise<ImageAvailability> {
  let selected:ReturnType<typeof isolatedRelay>|undefined;
  try { selected=isolatedRelaysEnabled()?isolatedRelay('images'):undefined; }
  catch { return 'unknown'; }
  const origin = selected?.url || process.env.VM_RELAY_URL || process.env.GALXAI_RELAY_URL || process.env.RELAY_URL;
  const key = selected?.key || process.env.VM_RELAY_API_KEY || process.env.RELAY_API_KEYS?.split(',')[0]?.trim();
  if (!origin || !key) return 'unknown';
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const url = new URL('/v1/images/availability?model=gpt-image-2', origin);
    const response = await fetcher(url, { headers: { Authorization: `Bearer ${key}` },
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return 'unknown';
    reader = response.body?.getReader();
    if (!reader) return 'unknown';
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) { const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength; if (size > 1024) return 'unknown'; chunks.push(part.value); }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return data?.available === true ? 'available' : data?.available === false ? 'unavailable' : 'unknown';
  } catch { return 'unknown'; }
  finally { await reader?.cancel().catch(() => {}); }
}
