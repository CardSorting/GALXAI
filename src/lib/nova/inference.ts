import { createHash } from 'node:crypto';
import { NovaError, type NovaAccess, type NovaAdmission, type NovaState } from './contract';
import { withStreamKeepalive } from './keepalive';

export type NovaInput = { model: 'galx-nova'; messages: { role: 'system' | 'user' | 'assistant'; content: string }[]; stream: boolean; max_tokens: number };
export type NovaExecutor = (input: NovaInput, admission: NovaAdmission, signal: AbortSignal) => Promise<Response>;
export type NovaKeepAlive = (terminalWork: Promise<void>) => void;
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const encoder = new TextEncoder();
const messages = {
  invalid_token: 'Connect this application again to continue.',
  inference_access_required: 'Your account does not currently have inference access. Your application is still connected.',
  service_busy: 'Inference is busy. Try again later; your application is still connected.',
  request_already_submitted: 'This request was already submitted. It has not been started again.',
  invalid_request: 'Check the request and try again.',
  outcome_unconfirmed: 'The outcome is unconfirmed. This task may have run. It has not been started again.',
  access_check_unavailable: 'Access could not be checked. Try again shortly.',
};
function headers() { return new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }); }
export function novaFailure(error: NovaError): Response {
  const h = headers();
  if (error.code === 'invalid_token') h.set('WWW-Authenticate', 'Bearer error="invalid_token"');
  if (error.code === 'service_busy' || error.code === 'access_check_unavailable') h.set('Retry-After', '3');
  return Response.json({ error: { code: error.code, message: messages[error.code], execution_state: error.executionState } }, { status: error.status, headers: h });
}
async function readBody(request: Request): Promise<NovaInput> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new NovaError('invalid_request', 400);
  const reader = request.body?.getReader(); if (!reader) throw new NovaError('invalid_request', 400);
  const chunks: Uint8Array[] = []; let bytes = 0, expired = false;
  const timeout = setTimeout(() => { expired = true; void reader.cancel().catch(() => {}); }, 10_000);
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 256_000) throw new Error(); chunks.push(value); }
    if (expired || request.signal.aborted) throw new Error();
    const b = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
    if (!b || typeof b !== 'object' || Array.isArray(b) || Object.keys(b).some(k => !['model','messages','stream','max_tokens'].includes(k)) || (b.model !== undefined && b.model !== 'galx-nova') || !Array.isArray(b.messages) || b.messages.length < 1 || b.messages.length > 128 || (b.stream !== undefined && typeof b.stream !== 'boolean') || (b.max_tokens !== undefined && (!Number.isSafeInteger(b.max_tokens) || b.max_tokens < 1 || b.max_tokens > 4096))) throw new Error();
    let size = 0;
    const turns = b.messages.map((m: Record<string, unknown>) => {
      if (!m || typeof m !== 'object' || Object.keys(m).some(k => !['role','content'].includes(k)) || !['system','user','assistant'].includes(m.role as string) || typeof m.content !== 'string') throw new Error();
      size += m.content.length; return { role: m.role, content: m.content };
    });
    if (size < 1 || size > 96_000) throw new Error();
    return { model: 'galx-nova', messages: turns, stream: b.stream === true, max_tokens: b.max_tokens ?? 1024 };
  } catch { throw new NovaError('invalid_request', 400); }
  finally { clearTimeout(timeout); await reader.cancel().catch(() => {}); }
}
const finishReason = (value: unknown) => value === 'stop' || value === 'length' ? value : null;
function publicChunk(value: any, id: string) {
  if (!value || typeof value !== 'object' || value.error) throw new NovaError('outcome_unconfirmed', 502, 'unknown');
  if (Array.isArray(value.choices) && value.choices.length === 0) return null;
  const choice = value.choices?.[0], delta = choice?.delta;
  if (!delta || typeof delta !== 'object' || (delta.content !== undefined && delta.content !== null && typeof delta.content !== 'string') || delta.tool_calls) throw new NovaError('outcome_unconfirmed', 502, 'unknown');
  return { id, object: 'chat.completion.chunk', model: 'galx-nova', choices: [{ index: 0, delta: { ...(delta.role === 'assistant' ? { role: 'assistant' } : {}), ...(typeof delta.content === 'string' ? { content: delta.content } : {}) }, finish_reason: finishReason(choice.finish_reason) }] };
}

/** Output is projected anew. No upstream IDs, models, usage, headers or diagnostic fields escape. */
function publicStream(source: ReadableStream<Uint8Array>, id: string, finalize: (state: NovaState) => Promise<void>, abort: () => void, signal: AbortSignal) {
  const reader = source.getReader(), decoder = new TextDecoder();
  let pending = '', total = 0, terminal = false, closed = false;
  // Local interruption must also unblock a pending read when the execution
  // transport fails to acknowledge its signal. Never invent remote completion.
  const interrupted = Symbol('interrupted');
  let wake!: (value: typeof interrupted) => void;
  const interruption = new Promise<typeof interrupted>(resolve => { wake = resolve; });
  const onAbort = () => wake(interrupted);
  if (signal.aborted) onAbort(); else signal.addEventListener('abort', onAbort, { once: true });
  // Cancellation is forwarded, not a remote acknowledgement requirement.
  // A hung upstream cancel must not hold a persisted terminal response open.
  const stop = () => { signal.removeEventListener('abort', onAbort); abort(); void reader.cancel().catch(() => {}); };
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (!closed) {
          const boundary = /\r?\n\r?\n/.exec(pending);
          if (!boundary) {
            const part = await Promise.race([reader.read(), interruption]);
            if (part === interrupted || part.done) throw new Error('Incomplete result');
            total += part.value.byteLength; if (total > 2_000_000) throw new Error('Oversized result');
            pending += decoder.decode(part.value, { stream: true });
            if (pending.length > 256_000) throw new Error('Oversized event');
            continue;
          }
          const frame = pending.slice(0, boundary.index); pending = pending.slice(boundary.index + boundary[0].length);
          const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
          if (!data) continue;
          if (data === '[DONE]') {
            if (!terminal) throw new Error('Unconfirmed completion');
            await finalize('completed'); closed = true;
            controller.enqueue(encoder.encode('data: [DONE]\n\n')); controller.close(); await stop(); return;
          }
          const chunk = publicChunk(JSON.parse(data), id);
          if (!chunk) continue;
          if (terminal) throw new Error('Output after completion');
          terminal = chunk.choices[0].finish_reason !== null;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)); return;
        }
      } catch {
        if (closed) return;
        closed = true; await finalize('unknown').catch(() => {}); await stop();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: { code: 'outcome_unconfirmed', message: messages.outcome_unconfirmed, execution_state: 'unknown' } })}\n\n`)); controller.close();
      }
    },
    async cancel() { closed = true; await stop(); await finalize('unknown').catch(() => {}); },
  });
}

/** One admission and at most one execution call. Cancellation never purchases, revokes or replays. */
export async function invokeNova(request: Request, resource: string, access: NovaAccess, execute: NovaExecutor, keepAlive?: NovaKeepAlive): Promise<Response> {
  let admission: NovaAdmission | undefined, finalization: Promise<void> | undefined, finalState: NovaState | undefined, streaming = false;
  let release!: () => void;
  const terminalWork = new Promise<void>(resolve => { release = resolve; });
  const controller = new AbortController();
  const abort = () => controller.abort();
  const signal = AbortSignal.any([request.signal, controller.signal, AbortSignal.timeout(300_000)]);
  const completeLifetime = () => { signal.removeEventListener('abort', interrupted); release(); };
  const finalize = (state: NovaState): Promise<void> => {
    if (!admission) return Promise.resolve();
    // A concurrent disconnect must join the original write, including an
    // ambiguous write failure. It must never issue a replacement terminal write.
    if (!finalization) {
      finalState = state;
      finalization = Promise.resolve().then(() => access.finish(admission!.id, state)).finally(completeLifetime);
    }
    return finalization.then(() => {
      // Buffered completion after an interruption cannot turn the already
      // claimed unknown outcome into a public success.
      if (state === 'completed' && finalState !== 'completed') throw new NovaError('outcome_unconfirmed', 502, 'unknown');
    });
  };
  const interrupted = () => { if (admission) void finalize('unknown').catch(() => {}); };
  signal.addEventListener('abort', interrupted, { once: true });
  try {
    // Register before any admission/dispatch await, while the route context is
    // active. The same promise covers abort before headers and after handoff.
    keepAlive?.(terminalWork);
    const token = request.headers.get('authorization')?.match(/^Bearer (galx_connect_at_[A-Za-z0-9_-]{43})$/i)?.[1];
    if (!token) throw new NovaError('invalid_token', 401);
    const key = request.headers.get('idempotency-key');
    if (!key || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) throw new NovaError('invalid_request', 400);
    const input = await readBody(request);
    signal.throwIfAborted();
    admission = await access.admit({ tokenHash: hash(token), resource, origin: request.headers.get('origin'), requestKey: hash(key), fingerprint: hash(JSON.stringify(input)) });
    signal.throwIfAborted();
    const response = await execute(input, admission, signal);
    if (!response.ok || !response.body) throw new NovaError('outcome_unconfirmed', 502, 'unknown');
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      const h = headers(); h.set('Content-Type', 'text/event-stream; charset=utf-8');
      const projected = new Response(publicStream(response.body, admission.id, finalize, abort, signal), { headers: h });
      if (input.stream) {
        streaming = true;
        h.set('Cache-Control', 'private, no-store, no-transform');
        return new Response(withStreamKeepalive(projected.body!), { headers: h });
      }
      // JSON clients receive the same terminal validation as streaming clients.
      const frames = (await projected.text()).split('\n\n');
      let content = '', reason: 'stop' | 'length' | null = null;
      for (const frame of frames) {
        if (!frame || frame === 'data: [DONE]') continue;
        const value = JSON.parse(frame.slice(6));
        if (value.error) throw new NovaError('outcome_unconfirmed', 502, 'unknown');
        content += value.choices[0].delta.content || '';
        reason = finishReason(value.choices[0].finish_reason) || reason;
      }
      if (!reason) throw new NovaError('outcome_unconfirmed', 502, 'unknown');
      return Response.json({ id: admission.id, object: 'chat.completion', model: 'galx-nova', choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: reason }] }, { headers: headers() });
    }
    if (input.stream) { await response.body.cancel(); throw new Error('Invalid response'); }
    const reader = response.body.getReader(); let bytes = 0; const chunks: Uint8Array[] = [];
    try { for (;;) { const p = await reader.read(); if (p.done) break; bytes += p.value.byteLength; if (bytes > 2_000_000) throw new Error('Oversized response'); chunks.push(p.value); } }
    finally { await reader.cancel().catch(() => {}); }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8')), choice = data?.choices?.[0];
    if (data.error || typeof choice?.message?.content !== 'string' || choice.message.tool_calls || !finishReason(choice.finish_reason)) throw new Error('Invalid result');
    await finalize('completed'); abort();
    return Response.json({ id: admission.id, object: 'chat.completion', model: 'galx-nova', choices: [{ index: 0, message: { role: 'assistant', content: choice.message.content }, finish_reason: finishReason(choice.finish_reason) }] }, { headers: headers() });
  } catch (error) {
    const failure = error instanceof NovaError ? error : new NovaError(admission ? 'outcome_unconfirmed' : 'access_check_unavailable', 503, admission ? 'unknown' : 'not_accepted');
    // Claim the known result before our own abort can request unknown.
    const settled = admission ? finalize(failure.executionState === 'not_accepted' ? 'not_accepted' : 'unknown') : undefined;
    abort();
    await settled?.catch(() => {});
    return novaFailure(failure);
  } finally {
    if (!streaming) completeLifetime();
  }
}
