import {
  createChatResourceId,
  type ChatSessionMode,
} from '../core/chat/GalxChatRequestNormalizer';

export const GALX_AGENT_PROTOCOL_VERSION = '2026-09-04';

export interface GalxAgentBootstrap {
  protocolVersion: string;
  deployment: {
    id?: string;
    environment: string;
    skewProtectionEnabled: boolean;
  };
  agent: {
    interactiveEndpoint: string;
    transport: 'sse';
    sessionModes: readonly ChatSessionMode[];
    maxInteractiveDurationSeconds: number;
  };
  security: {
    sameOrigin: true;
    providerKeysAcceptedInBrowser: false;
  };
}

export interface GalxBrowserAgentMessage {
  role: 'system' | 'developer' | 'user' | 'assistant' | 'tool';
  content: unknown;
  name?: string;
  tool_call_id?: string;
  tool_calls?: unknown[];
}

export interface GalxBrowserAgentClientOptions {
  endpoint?: string;
  bootstrapEndpoint?: string | false;
  fetch?: typeof fetch;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  /** Opt-in escape hatch for trusted deployments with an explicitly configured CORS boundary. */
  allowCrossOrigin?: boolean;
}

export interface GalxBrowserAgentTurnInput {
  messages: readonly GalxBrowserAgentMessage[];
  model?: string;
  sessionId?: string;
  sessionMode?: ChatSessionMode;
  turnId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
  signal?: AbortSignal;
  idempotencyKey?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export type GalxBrowserAgentEvent =
  | {
      type: 'response';
      response: Response;
      sessionId?: string;
      sessionMode: ChatSessionMode;
      turnId: string;
    }
  | {
      type: 'text_delta';
      text: string;
      eventId?: string;
      sequence?: number;
      raw: unknown;
    }
  | { type: 'event'; event: string; eventId?: string; raw: unknown }
  | { type: 'done'; eventId?: string; raw?: unknown };

export interface GalxBrowserAgentSessionOptions {
  id?: string;
}

export class GalxBrowserAgentError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'GalxBrowserAgentError';
  }
}

export interface ParsedSseEvent {
  event: string;
  data: string;
  id?: string;
}

function parseSseBlock(block: string): ParsedSseEvent | undefined {
  let event = 'message';
  let id: string | undefined;
  const data: string[] = [];

  for (const rawLine of block.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(':')) continue;
    const separator = rawLine.indexOf(':');
    const field = separator === -1 ? rawLine : rawLine.slice(0, separator);
    let value = separator === -1 ? '' : rawLine.slice(separator + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value || 'message';
    if (field === 'data') data.push(value);
    if (field === 'id' && !value.includes('\u0000')) id = value;
  }

  if (data.length === 0) return undefined;
  return { event, data: data.join('\n'), id };
}

export async function* parseGalxSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ParsedSseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, '\n');

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = parseSseBlock(block);
        if (parsed) yield parsed;
        boundary = buffer.indexOf('\n\n');
      }

      if (done) break;
    }

    const trailing = parseSseBlock(buffer);
    if (trailing) yield trailing;
  } finally {
    reader.releaseLock();
  }
}

function extractTextDelta(payload: any): string {
  if (typeof payload?.choices?.[0]?.delta?.content === 'string') {
    return payload.choices[0].delta.content;
  }
  if (payload?.type === 'response.output_text.delta' && typeof payload.delta === 'string') {
    return payload.delta;
  }
  if (typeof payload?.message?.content === 'string') return payload.message.content;
  if (typeof payload?.response === 'string') return payload.response;
  return '';
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}

function assertSafeEndpoint(endpoint: string, allowCrossOrigin: boolean): void {
  if (allowCrossOrigin || typeof window === 'undefined') return;
  const resolved = new URL(endpoint, window.location.origin);
  if (resolved.origin !== window.location.origin) {
    throw new GalxBrowserAgentError(
      'The browser agent client is same-origin by default. Proxy this request through the server boundary or explicitly opt in to a trusted CORS origin.',
      undefined,
      'cross_origin_agent_endpoint',
    );
  }
}

function linkAbortSignal(source: AbortSignal | undefined, target: AbortController): () => void {
  if (!source) return () => {};
  const abort = () => target.abort(source.reason);
  if (source.aborted) abort();
  else source.addEventListener('abort', abort, { once: true });
  return () => source.removeEventListener('abort', abort);
}

function assertNoPrivilegedBrowserHeaders(headers: Record<string, string> | undefined): void {
  if (!headers) return;
  const forbidden = Object.keys(headers).find((name) => {
    const normalized = name.toLowerCase();
    return normalized === 'authorization' || normalized === 'x-api-key' || normalized === 'x-galx-key';
  });
  if (forbidden) {
    throw new GalxBrowserAgentError(
      `${forbidden} cannot be supplied as a persistent browser-client header. Use getAccessToken for an ephemeral user session or keep provider credentials behind the server boundary.`,
      400,
      'privileged_browser_header_rejected',
    );
  }
}

export class GalxBrowserAgentClient {
  private readonly endpoint: string;
  private readonly bootstrapEndpoint: string | false;
  private readonly fetchImpl: typeof fetch;
  private readonly options: GalxBrowserAgentClientOptions;
  private bootstrapPromise?: Promise<GalxAgentBootstrap | undefined>;

  constructor(options: GalxBrowserAgentClientOptions = {}) {
    this.endpoint = options.endpoint || '/v1/chat/completions';
    this.bootstrapEndpoint = options.bootstrapEndpoint === undefined
      ? '/api/client/bootstrap'
      : options.bootstrapEndpoint;
    this.fetchImpl = options.fetch || globalThis.fetch;
    if (!this.fetchImpl) throw new Error('A Fetch API implementation is required.');
    this.options = options;
    assertNoPrivilegedBrowserHeaders(options.headers);
    assertSafeEndpoint(this.endpoint, Boolean(options.allowCrossOrigin));
    if (this.bootstrapEndpoint) {
      assertSafeEndpoint(this.bootstrapEndpoint, Boolean(options.allowCrossOrigin));
    }
  }

  public startSession(options: GalxBrowserAgentSessionOptions = {}): GalxBrowserAgentSession {
    return new GalxBrowserAgentSession(this, options.id || createChatResourceId('session'), 'new');
  }

  public resumeSession(sessionId: string): GalxBrowserAgentSession {
    if (!sessionId.trim()) throw new TypeError('sessionId must be non-empty.');
    return new GalxBrowserAgentSession(this, sessionId, 'continue');
  }

  public getBootstrap(): Promise<GalxAgentBootstrap | undefined> {
    if (!this.bootstrapEndpoint) return Promise.resolve(undefined);
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.fetchImpl(this.bootstrapEndpoint, {
        method: 'GET',
        credentials: this.options.credentials || 'same-origin',
        headers: { Accept: 'application/json' },
      }).then(async (response) => {
        if (!response.ok) return undefined;
        const bootstrap = await response.json() as GalxAgentBootstrap;
        if (bootstrap.protocolVersion !== GALX_AGENT_PROTOCOL_VERSION) {
          throw new GalxBrowserAgentError(
            `Unsupported agent protocol ${bootstrap.protocolVersion}. Reload the client to obtain the matching deployment.`,
            409,
            'agent_protocol_mismatch',
          );
        }
        return bootstrap;
      }).catch((error) => {
        this.bootstrapPromise = undefined;
        if (error instanceof GalxBrowserAgentError) throw error;
        return undefined;
      });
    }
    return this.bootstrapPromise;
  }

  public async *streamTurn(input: GalxBrowserAgentTurnInput): AsyncGenerator<GalxBrowserAgentEvent> {
    assertNoPrivilegedBrowserHeaders(input.headers);
    const mode = input.sessionMode || (input.sessionId ? 'continue' : 'stateless');
    if (mode === 'stateless' && input.sessionId) {
      throw new GalxBrowserAgentError('A stateless turn cannot name a session.', 400, 'invalid_session_identity');
    }
    if (mode !== 'stateless' && !input.sessionId) {
      throw new GalxBrowserAgentError('A durable turn requires a sessionId.', 400, 'missing_session_identity');
    }

    const turnId = input.turnId || createChatResourceId('turn');
    const bootstrap = await this.getBootstrap();
    const accessToken = await this.options.getAccessToken?.();
    const headers: Record<string, string> = {
      Accept: 'text/event-stream, application/json',
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey || turnId,
      'X-Galx-Client': 'browser-agent/1',
      'X-Galx-Protocol-Version': GALX_AGENT_PROTOCOL_VERSION,
      'X-Galx-Session-Mode': mode,
      'X-Galx-Turn-Id': turnId,
      ...this.options.headers,
      ...input.headers,
    };
    if (input.sessionId) headers['X-Galx-Session-Id'] = input.sessionId;
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (bootstrap?.deployment.skewProtectionEnabled && bootstrap.deployment.id) {
      headers['X-Deployment-Id'] = bootstrap.deployment.id;
    }

    const controller = new AbortController();
    const unlinkAbort = linkAbortSignal(input.signal, controller);
    let response: Response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        credentials: this.options.credentials || 'same-origin',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          ...input.body,
          model: input.model || input.body?.model || 'galx-nova',
          messages: input.messages,
          stream: true,
          conversation_id: input.sessionId,
          session_mode: mode,
          turn_id: turnId,
          user_message_id: input.userMessageId,
          assistant_message_id: input.assistantMessageId,
        }),
      });
    } catch (error) {
      unlinkAbort();
      throw error;
    }

    try {
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = errorBody?.error?.message || errorBody?.error || `Agent request failed with status ${response.status}.`;
        throw new GalxBrowserAgentError(
          String(message),
          response.status,
          errorBody?.error?.code || errorBody?.code,
          parseRetryAfter(response.headers.get('retry-after')),
        );
      }

      const resolvedSessionId = response.headers.get('x-galx-conversation-id') || input.sessionId;
      if (input.sessionId && resolvedSessionId && resolvedSessionId !== input.sessionId) {
        throw new GalxBrowserAgentError(
          'The server acknowledged a different session than the client requested.',
          409,
          'session_identity_mismatch',
        );
      }

      yield { type: 'response', response, sessionId: resolvedSessionId, sessionMode: mode, turnId };

      const contentType = response.headers.get('content-type') || '';
      if (!response.body || !contentType.includes('text/event-stream')) {
        const payload = await response.json().catch(() => undefined);
        const text = payload?.choices?.[0]?.message?.content || payload?.output_text || '';
        if (text) yield { type: 'text_delta', text, raw: payload };
        yield { type: 'done', raw: payload };
        return;
      }

      let emittedDone = false;
      for await (const event of parseGalxSseStream(response.body)) {
        if (event.data === '[DONE]') {
          emittedDone = true;
          yield { type: 'done', eventId: event.id };
          continue;
        }

        let payload: any = event.data;
        try {
          payload = JSON.parse(event.data);
        } catch {
          // A named extension event may deliberately contain text rather than JSON.
        }

        if (event.event === 'error' || payload?.type === 'error') {
          throw new GalxBrowserAgentError(
            payload?.error?.message || payload?.message || 'The agent stream reported an error.',
            undefined,
            payload?.error?.code || payload?.code || 'agent_stream_error',
          );
        }

        const text = extractTextDelta(payload);
        if (text) {
          yield {
            type: 'text_delta',
            text,
            eventId: event.id,
            sequence: Number.isSafeInteger(payload?.sequence_number) ? payload.sequence_number : undefined,
            raw: payload,
          };
        } else {
          yield { type: 'event', event: event.event, eventId: event.id, raw: payload };
        }
      }

      if (!emittedDone) yield { type: 'done' };
    } finally {
      unlinkAbort();
    }
  }
}

export class GalxBrowserAgentSession {
  private activeController?: AbortController;
  private nextMode: Extract<ChatSessionMode, 'new' | 'continue'>;

  constructor(
    private readonly client: GalxBrowserAgentClient,
    readonly sessionId: string,
    initialMode: Extract<ChatSessionMode, 'new' | 'continue'>,
  ) {
    this.nextMode = initialMode;
  }

  public async *stream(
    input: Omit<GalxBrowserAgentTurnInput, 'sessionId' | 'sessionMode' | 'signal'> & { signal?: AbortSignal },
  ): AsyncGenerator<GalxBrowserAgentEvent> {
    if (this.activeController) {
      throw new GalxBrowserAgentError(
        `Session ${this.sessionId} already has an active turn.`,
        409,
        'session_turn_in_progress',
      );
    }

    const controller = new AbortController();
    const unlinkAbort = linkAbortSignal(input.signal, controller);
    this.activeController = controller;
    try {
      for await (const event of this.client.streamTurn({
        ...input,
        sessionId: this.sessionId,
        sessionMode: this.nextMode,
        signal: controller.signal,
      })) {
        if (event.type === 'response') {
          this.nextMode = 'continue';
        }
        yield event;
      }
    } finally {
      unlinkAbort();
      this.activeController = undefined;
    }
  }

  /** Interrupts only the browser transport. It does not claim authoritative execution cancellation. */
  public interruptTransport(reason = 'client_transport_interrupted'): void {
    this.activeController?.abort(reason);
  }
}
