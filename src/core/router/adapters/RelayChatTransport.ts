export interface RelayFailureDetails {
  status?: number; upstreamCode?: string; retryAfterMs?: number; shouldRetry?: boolean;
  executionState?: 'unknown' | 'accepted' | 'not_accepted'; requestId?: string; idempotencyScope?: string;
}
export class RelayDispatchError extends Error implements RelayFailureDetails {
  readonly status?: number; readonly upstreamCode?: string; readonly retryAfterMs?: number; readonly shouldRetry?: boolean;
  readonly executionState?: 'unknown' | 'accepted' | 'not_accepted'; readonly requestId?: string; readonly idempotencyScope?: string;
  readonly code = 'relay_unavailable';
  constructor(readonly reason: string, details: RelayFailureDetails = {}) {
    super(details.shouldRetry === false || details.executionState === 'unknown'
      ? 'Execution may have started. Check the existing request before submitting new work.'
      : details.executionState === 'accepted'
        ? 'The request was accepted. Reconnect using its existing job URL.'
        : 'Inference relay unavailable. Please retry shortly.');
    this.name = 'RelayDispatchError';
    Object.assign(this, details);
  }
}

export interface RelayChatOptions {
  taskId?: string;
  idempotencyKey?: string;
  idempotencyScope?: string;
  url: string;
  key?: string;
  payload: Record<string, any>;
  signal?: AbortSignal;
  ttftTimeoutMs: number;
  idleTimeoutMs?: number;
  wallTimeoutMs?: number;
  /** Persist the accepted job before reading its stream. Failure stops retrieval. */
  onAccepted?: (jobId: string) => Promise<void>;
  /** Trusted server-owned reference only. Retrieves existing work; never POSTs. */
  resumeJobId?: string;
}

export interface RelayReceipt {
  id: string; status: 'pending' | 'unknown' | 'not_started' | 'completed'; output: string | null;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
  retainedUntil: number | null;
}

/** A bounded, authenticated read of committed evidence. Never starts work or
 * follows redirects, and never treats a missing receipt as proof of zero usage. */
export async function readRelayReceipt(options: { url: string; key: string; jobId: string; signal: AbortSignal }): Promise<RelayReceipt> {
  const origin = new URL(options.url);
  if (!options.key?.trim() || !/^[a-zA-Z0-9_.:-]{1,4096}$/.test(options.jobId) || origin.username || origin.password ||
      origin.pathname !== '/' || origin.search || origin.hash ||
      !(origin.protocol === 'https:' || (origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)))) throw new RelayDispatchError('invalid_receipt_reference');
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch(new URL(`/v1/jobs/${encodeURIComponent(options.jobId)}/receipt`, origin), {
      headers: { Authorization: `Bearer ${options.key}` }, redirect: 'error',
      signal: AbortSignal.any([options.signal, AbortSignal.timeout(10000)]) });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json') || !response.body) throw new Error('Receipt unavailable');
    reader = response.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      bytes += value.byteLength; if (bytes > 96000) throw new Error('Receipt too large'); chunks.push(value);
    }
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const u = result.usage;
    const validUsage = u && [u.prompt_tokens, u.completion_tokens, u.total_tokens].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000_000) &&
      u.total_tokens > 0 && u.total_tokens === u.prompt_tokens + u.completion_tokens;
    if (result.id !== options.jobId || !['pending', 'unknown', 'not_started', 'completed'].includes(result.status) ||
        !(result.output === null || (typeof result.output === 'string' && Buffer.byteLength(result.output) <= 12000)) ||
        !(result.retainedUntil === null || (Number.isSafeInteger(result.retainedUntil) && result.retainedUntil > Date.now())) ||
        !(u === null || validUsage) || (result.status !== 'completed' && (u !== null || result.output !== null))) throw new Error('Invalid receipt');
    return { id: result.id, status: result.status, output: result.output, retainedUntil: result.retainedUntil,
      usage: u === null ? null : { prompt_tokens: u.prompt_tokens, completion_tokens: u.completion_tokens, total_tokens: u.total_tokens } };
  } catch { throw new RelayDispatchError('receipt_unavailable', { executionState: 'accepted', shouldRetry: false }); }
  finally { await reader?.cancel().catch(() => {}); }
}


/** Preserve actionable error evidence without replaying or exposing raw provider messages. */
export async function relayFailure(response: Response, reason: string): Promise<RelayDispatchError> {
  const retry = response.headers.get('retry-after');
  const retryAfterMs = retry === null ? undefined : Number.isFinite(Number(retry)) ? Math.max(0, Number(retry) * 1000) : Math.max(0, Date.parse(retry) - Date.now());
  let body: any;
  const reader = response.body?.getReader();
  if (reader) try {
    const decoder = new TextDecoder(); let text = '', size = 0;
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 8192) break; text += decoder.decode(value, { stream: true }); }
    if (size <= 8192) body = JSON.parse(text + decoder.decode());
  } catch { /* HTTP status and headers remain useful even when the body is unavailable. */ }
  finally { await reader.cancel().catch(() => {}); }
  const code = body?.error?.code, state = body?.error?.execution_state;
  return new RelayDispatchError(reason, { status: response.status,
    upstreamCode: typeof code === 'string' && /^[\w.-]{1,128}$/.test(code) ? code : undefined,
    retryAfterMs: Number.isFinite(retryAfterMs) ? retryAfterMs : undefined,
    shouldRetry: response.headers.get('x-should-retry') === 'true' ? true : response.headers.get('x-should-retry') === 'false' ? false : undefined,
    executionState: ['unknown', 'accepted', 'not_accepted'].includes(state) ? state : undefined,
    requestId: response.headers.get('x-request-id') ?? undefined, idempotencyScope: response.headers.get('x-galx-idempotency-scope') ?? undefined });
}

/** The configured relay is authoritative. Never replay accepted jobs elsewhere. */
export async function executeRelayChat(options: RelayChatOptions) {
  if (!options.key?.trim()) throw new RelayDispatchError('missing_relay_key');
  const origin = new URL(options.url);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) throw new RelayDispatchError('invalid_relay_origin');
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener('abort', abort, { once: true });
  let timer: ReturnType<typeof setTimeout>;
  const arm = (ms: number, reason: string) => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(new RelayDispatchError(reason)), ms);
  };
  arm(options.ttftTimeoutMs, 'first_output_timeout');
  const wall = setTimeout(() => controller.abort(new RelayDispatchError('request_deadline')), options.wallTimeoutMs ?? 120000);
  const cleanup = () => { clearTimeout(timer); clearTimeout(wall); options.signal?.removeEventListener('abort', abort); };
  const headers = { Authorization: `Bearer ${options.key}`, 'Content-Type': 'application/json',
    ...(options.taskId ? { 'X-Galx-Task-Id': options.taskId } : {}),
    ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
    ...(options.idempotencyScope ? { 'X-Galx-Idempotency-Scope': options.idempotencyScope } : {}) };
  const request = async (url: URL, init?: RequestInit) => {
    const response = await fetch(url, { ...init, headers, signal: controller.signal, redirect: 'error' });
    if (!response.ok) {
      throw await relayFailure(response, `relay_http_${response.status}`);
    }
    return response;
  };
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    let job: { id: string; streamUrl: string };
    if (options.resumeJobId !== undefined) {
      if (!/^[a-zA-Z0-9_.:-]{1,4096}$/.test(options.resumeJobId)) throw new RelayDispatchError('invalid_job_reference');
      job = { id: options.resumeJobId, streamUrl: `/v1/jobs/${encodeURIComponent(options.resumeJobId)}/stream` };
    } else {
      const admitted = await request(new URL('/v1/chat/completions', origin), { method: 'POST', body: JSON.stringify(options.payload) });
      if (admitted.status !== 202) throw new RelayDispatchError('expected_async_job');
      job = await admitted.json();
    }
    const streamUrl = new URL(job.streamUrl, origin);
    if (typeof job.id !== 'string' || !/^[a-zA-Z0-9_.:-]{1,4096}$/.test(job.id) || streamUrl.origin !== origin.origin || streamUrl.pathname !== `/v1/jobs/${encodeURIComponent(job.id)}/stream` || streamUrl.search || streamUrl.hash || streamUrl.username || streamUrl.password) {
      throw new RelayDispatchError('invalid_job_stream');
    }
    if (options.resumeJobId === undefined) await options.onAccepted?.(job.id);
    const response = await request(streamUrl);
    if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw new RelayDispatchError('invalid_stream_type');
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    async function* events(): AsyncGenerator<string> {
      let buffer = '';
      while (true) {
        const { done, value } = await reader!.read();
        if (done) throw new RelayDispatchError('stream_ended_without_completion');
        buffer += decoder.decode(value, { stream: true });
        let separator: RegExpExecArray | null;
        while ((separator = /\r?\n\r?\n/.exec(buffer))) {
          const frame = buffer.slice(0, separator.index);
          if (frame.length > 1024 * 1024) throw new RelayDispatchError('stream_event_too_large');
          buffer = buffer.slice(separator.index + separator[0].length);
          const lines = frame.split(/\r?\n/);
          const event = lines.find(line => line.startsWith('event:'))?.slice(6).trim();
          const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
          if (event === 'error' || event === 'cancelled') throw new RelayDispatchError(`job_${event}`);
          if (!data) continue;
          if (data === '[DONE]') { yield data; return; }
          let parsed;
          try { parsed = JSON.parse(data); } catch { throw new RelayDispatchError('malformed_stream_event'); }
          if (parsed.error) throw new RelayDispatchError('job_failed');
          arm(options.idleTimeoutMs ?? 45000, 'stream_idle_timeout');
          yield data;
        }
        if (buffer.length > 1024 * 1024) throw new RelayDispatchError('stream_event_too_large');
      }
    }
    const iterator = events();
    if (options.payload.stream) {
      // Do not claim success before the relay emits a valid event.
      let next = await iterator.next();
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async pull(target) {
          try {
            if (next.done) { cleanup(); await reader?.cancel(); target.close(); return; }
            const data = next.value;
            target.enqueue(encoder.encode(`data: ${data}\n\n`));
            if (data === '[DONE]') { cleanup(); await reader?.cancel(); target.close(); return; }
            next = await iterator.next();
          } catch {
            cleanup(); await reader?.cancel().catch(() => {});
            target.error(new RelayDispatchError('stream_failed'));
          }
        },
        async cancel() { controller.abort(); cleanup(); await reader?.cancel().catch(() => {}); }
      });
      const responseHeaders = { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', 'x-galx-job-id': job.id };
      return { response: new Response(stream, { headers: responseHeaders }), headers: responseHeaders };
    }
    let text = '', reasoning = '', finishReason = 'stop', usage;
    for await (const data of iterator) {
      if (data === '[DONE]') break;
      const event = JSON.parse(data);
      const choice = event.choices?.[0];
      text += choice?.delta?.content || '';
      reasoning += choice?.delta?.reasoning_content || '';
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      if (event.usage) usage = event.usage;
      if (text.length + reasoning.length > 16 * 1024 * 1024) throw new RelayDispatchError('output_too_large');
    }
    await reader.cancel(); cleanup();
    const result = { id: job.id, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: options.payload.model,
      choices: [{ index: 0, message: { role: 'assistant', content: text, ...(reasoning ? { reasoning_content: reasoning } : {}) }, finish_reason: finishReason }],
      ...(usage ? { usage } : {}) };
    return { response: Response.json(result), headers: { 'content-type': 'application/json' } };
  } catch (error) {
    controller.abort(); cleanup(); await reader?.cancel().catch(() => {});
    if (error instanceof RelayDispatchError) throw error;
    throw new RelayDispatchError('relay_transport_failed');
  }
}
