/** Complete-answer clients consume the same streamed, terminal-validated public
 * protocol. Memory is bounded independently of upstream limits. Never resubmit. */
export async function bufferInferenceResult(response: Response, signal?: AbortSignal): Promise<Response> {
  if (!response.ok) return response;
  const unknown = () => Response.json({ error: { code: 'outcome_unconfirmed', message: 'The outcome is unconfirmed. This task may have run. It has not been started again.', execution_state: 'unknown' } }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } });
  if (!response.headers.get('content-type')?.startsWith('text/event-stream') || !response.body) {
    await response.body?.cancel().catch(() => {}); return unknown();
  }
  const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true }), encoder = new TextEncoder();
  let pending = '', wireBytes = 0, contentBytes = 0, content = '', id: string | undefined, finish: 'stop' | 'length' | undefined, done = false;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    for (;;) {
      signal?.throwIfAborted();
      const part = await reader.read();
      signal?.throwIfAborted();
      if (part.done) { pending += decoder.decode(); break; }
      wireBytes += part.value.byteLength;
      if (wireBytes > 16_000_000) throw new Error();
      pending += decoder.decode(part.value, { stream: true });
      let boundary;
      while ((boundary = /\r?\n\r?\n/.exec(pending))) {
        const frame = pending.slice(0, boundary.index); pending = pending.slice(boundary.index + boundary[0].length);
        if (encoder.encode(frame).byteLength > 256_000) throw new Error();
        const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
        if (!data) continue;
        if (done) throw new Error();
        if (data === '[DONE]') { if (!finish) throw new Error(); done = true; continue; }
        const value = JSON.parse(data), choice = value?.choices?.[0], delta = choice?.delta;
        if (finish || value.error || value.object !== 'chat.completion.chunk' || value.model !== 'galx-nova'
            || typeof value.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.id) || (id && id !== value.id)
            || !Array.isArray(value.choices) || value.choices.length !== 1 || choice.index !== 0 || !delta || typeof delta !== 'object'
            || (delta.role !== undefined && delta.role !== 'assistant') || (delta.content !== undefined && typeof delta.content !== 'string')
            || ![null, 'stop', 'length'].includes(choice.finish_reason)) throw new Error();
        id = value.id;
        const text = delta.content || ''; contentBytes += encoder.encode(text).byteLength;
        if (contentBytes > 2_000_000) throw new Error();
        content += text;
        if (choice.finish_reason !== null) finish = choice.finish_reason;
      }
      if (encoder.encode(pending).byteLength > 256_000) throw new Error();
    }
    if (!done || !finish || !id || pending.trim()) throw new Error();
    return Response.json({ id, object: 'chat.completion', model: 'galx-nova', choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: finish }] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    signal?.throwIfAborted();
    return unknown();
  } finally {
    signal?.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
  }
}
