export interface ObjectReadBounds { maxBytes: number; signal: AbortSignal }

/** Enforce the byte limit while reading, including absent or dishonest length headers. */
export async function readBoundedObjectBody(body: ReadableStream<Uint8Array> | null, bounds: ObjectReadBounds): Promise<Buffer> {
  bounds.signal.throwIfAborted();
  if (!body) throw new Error('Missing object body');
  const reader = body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  bounds.signal.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      const next = await reader.read(); bounds.signal.throwIfAborted();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > bounds.maxBytes) { await reader.cancel(); throw new Error('Object exceeds read limit'); }
      chunks.push(next.value);
    }
    return Buffer.concat(chunks, size);
  } finally { bounds.signal.removeEventListener('abort', abort); reader.releaseLock(); }
}
