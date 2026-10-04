/** SSE comments keep an idle transport observable without inventing output or
 * outcomes. At most one read and one timer are pending; pull applies backpressure. */
export function withStreamKeepalive(source: ReadableStream<Uint8Array>, intervalMs = 15_000): ReadableStream<Uint8Array> {
  const reader = source.getReader(), heartbeat = new TextEncoder().encode(': keepalive\n\n');
  let pending: ReturnType<typeof reader.read> | undefined, timer: ReturnType<typeof setTimeout> | undefined, closed = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      pending ??= reader.read();
      try {
        const part = await Promise.race([pending, new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), intervalMs); })]);
        if (closed) return;
        if (part === null) controller.enqueue(heartbeat);
        else {
          pending = undefined;
          if (part.done) { closed = true; controller.close(); }
          else controller.enqueue(part.value);
        }
      } catch (error) { if (!closed) { closed = true; controller.error(error); } }
      finally { clearTimeout(timer); }
    },
    async cancel(reason) { closed = true; clearTimeout(timer); await reader.cancel(reason); },
  }, { highWaterMark: 0 });
}
