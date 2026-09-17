/**
 * GALXAI Developer SDK: First-Class ChatCompletionStream Runner
 * Event-driven streaming, snapshot accumulation, and Web Response adapters.
 * Directly mirrors OpenAI SDK `beta.chat.completions.stream` and Anthropic `messages.stream`.
 */

import type {
  ChatCompletionChunk,
  ChatCompletionResponse,
  ChatMessage
} from '../core/contracts/GalxContracts';
import { APIError } from './errors';

type StreamEventListener<T = any> = (data: T) => void;
type ContentEventListener = (delta: string, snapshot: string) => void;

export interface StreamMetrics {
  timeToFirstTokenMs?: number;
  tokensPerSecond?: number;
  totalDurationMs: number;
  totalTokens: number;
}

export class ChatCompletionStream implements AsyncIterable<ChatCompletionChunk>, PromiseLike<ChatCompletionResponse> {
  private readonly sourceStream: AsyncIterable<ChatCompletionChunk>;
  private readonly abortController?: AbortController;

  private accumulatedText = '';
  private chunks: ChatCompletionChunk[] = [];
  private toolCalls: Map<number, { id?: string; type: string; function: { name: string; arguments: string } }> = new Map();
  private finalResponsePromise?: Promise<ChatCompletionResponse>;

  private readonly startTimeMs = Date.now();
  private firstTokenTimeMs?: number;
  private endTimeMs?: number;
  private tokenCount = 0;
  private transformFn?: (delta: string) => string;

  private readonly listeners: {
    chunk: Set<StreamEventListener<ChatCompletionChunk>>;
    content: Set<ContentEventListener>;
    tool_call: Set<StreamEventListener<any>>;
    error: Set<StreamEventListener<Error>>;
    end: Set<() => void>;
  } = {
    chunk: new Set(),
    content: new Set(),
    tool_call: new Set(),
    error: new Set(),
    end: new Set()
  };

  private isConsumed = false;
  private isDone = false;
  private consumptionPromise?: Promise<ChatCompletionResponse>;
  private completionObserved = false;
  private failure?: Error;

  constructor(sourceStream: AsyncIterable<ChatCompletionChunk>, abortController?: AbortController) {
    this.sourceStream = sourceStream;
    this.abortController = abortController;
  }

  /**
   * Diagnostics: retrieves real-time streaming metrics including TTFT and tokens-per-second.
   */
  public get metrics(): StreamMetrics {
    const now = this.endTimeMs || Date.now();
    const duration = Math.max(1, now - this.startTimeMs);
    const ttft = this.firstTokenTimeMs ? this.firstTokenTimeMs - this.startTimeMs : undefined;
    const tps = this.tokenCount > 0 ? Number(((this.tokenCount / (duration / 1000))).toFixed(1)) : 0;

    return {
      timeToFirstTokenMs: ttft,
      tokensPerSecond: tps,
      totalDurationMs: duration,
      totalTokens: this.tokenCount
    };
  }

  /**
   * Chains a transformer function to modify streaming text deltas in flight before emitting.
   */
  public pipeThrough(transform: (delta: string) => string): this {
    const prevTransform = this.transformFn;
    if (prevTransform) {
      this.transformFn = (d) => transform(prevTransform(d));
    } else {
      this.transformFn = transform;
    }
    return this;
  }

  /**
   * Registers an event listener on the stream.
   *
   * @example
   * ```ts
   * stream.on('content', (delta, snapshot) => console.log(delta));
   * ```
   */
  public on(event: 'chunk', listener: StreamEventListener<ChatCompletionChunk>): this;
  public on(event: 'content', listener: ContentEventListener): this;
  public on(event: 'tool_call', listener: StreamEventListener<any>): this;
  public on(event: 'error', listener: StreamEventListener<Error>): this;
  public on(event: 'end', listener: () => void): this;
  public on(event: string, listener: any): this {
    if (event === 'chunk') this.listeners.chunk.add(listener);
    else if (event === 'content') this.listeners.content.add(listener);
    else if (event === 'tool_call') this.listeners.tool_call.add(listener);
    else if (event === 'error') this.listeners.error.add(listener);
    else if (event === 'end') this.listeners.end.add(listener);

    // Auto-start background consumption if an event listener is added
    this.ensureConsuming();
    return this;
  }

  /**
   * Removes an event listener.
   */
  public off(event: string, listener: any): this {
    if (event === 'chunk') this.listeners.chunk.delete(listener);
    else if (event === 'content') this.listeners.content.delete(listener);
    else if (event === 'tool_call') this.listeners.tool_call.delete(listener);
    else if (event === 'error') this.listeners.error.delete(listener);
    else if (event === 'end') this.listeners.end.delete(listener);
    return this;
  }

  /**
   * Aborts the active stream.
   */
  public abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  private ensureConsuming(): Promise<ChatCompletionResponse> {
    if (this.failure) return Promise.reject(this.failure);
    if (this.isDone) return Promise.resolve(this.buildFinalResponse());
    if (this.isConsumed && !this.consumptionPromise) return Promise.reject(new APIError('The response stream is incomplete.',502,'incomplete_stream'));
    if (!this.consumptionPromise) {
      this.consumptionPromise = this.consumeAll();
    }
    return this.consumptionPromise;
  }

  private async consumeAll(): Promise<ChatCompletionResponse> {
    this.isConsumed = true;
    try {
      for await (const chunk of this.sourceStream) {
        this.processChunk(chunk);
      }
      this.assertCompletion();
      this.endTimeMs = Date.now();
      this.isDone = true;
      this.listeners.end.forEach(fn => fn());
      return this.buildFinalResponse();
    } catch (err: any) {
      this.failure = err;
      this.endTimeMs = Date.now();
      this.listeners.error.forEach(fn => fn(err));
      throw err;
    }
  }

  private processChunk(chunk: ChatCompletionChunk): void {
    if ((chunk as any).error) throw APIError.fromResponse(503,chunk);
    if (['stop','length','content_filter','tool_calls'].includes(chunk.choices?.[0]?.finish_reason ?? '')) this.completionObserved = true;
    this.chunks.push(chunk);
    this.listeners.chunk.forEach(fn => fn(chunk));

    const choice = chunk.choices?.[0];
    if (choice?.delta) {
      let deltaText = choice.delta.content;
      if (deltaText) {
        if (!this.firstTokenTimeMs) {
          this.firstTokenTimeMs = Date.now();
        }
        this.tokenCount++;
        if (this.transformFn) {
          deltaText = this.transformFn(deltaText);
        }
        this.accumulatedText += deltaText;
        this.listeners.content.forEach(fn => fn(deltaText!, this.accumulatedText));
      }

      const tcDeltas = (choice.delta as any).tool_calls;
      if (Array.isArray(tcDeltas)) {
        for (const tc of tcDeltas) {
          const idx = tc.index ?? 0;
          if (!this.toolCalls.has(idx)) {
            this.toolCalls.set(idx, {
              id: tc.id || `call_${Date.now()}_${idx}`,
              type: tc.type || 'function',
              function: {
                name: tc.function?.name || '',
                arguments: tc.function?.arguments || ''
              }
            });
          } else {
            const existing = this.toolCalls.get(idx)!;
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.function.name += tc.function.name;
            if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
          }
          this.listeners.tool_call.forEach(fn => fn(this.toolCalls.get(idx)));
        }
      }
    }
  }

  private buildFinalResponse(): ChatCompletionResponse {
    const lastChunk = this.chunks[this.chunks.length - 1];
    const toolsArray = Array.from(this.toolCalls.values());

    const message = {
      role: 'assistant',
      content: this.accumulatedText || null,
      tool_calls: toolsArray.length > 0 ? toolsArray : undefined
    };

    return {
      id: lastChunk?.id || `chat_${Date.now()}`,
      object: 'chat.completion',
      created: lastChunk?.created || Math.floor(Date.now() / 1000),
      model: lastChunk?.model || 'gpt-5-6-luna-low',
      choices: [
        {
          index: 0,
          message,
          finish_reason: (lastChunk?.choices?.[0]?.finish_reason as any) || (toolsArray.length > 0 ? 'tool_calls' : 'stop')
        }
      ],
      usage: (lastChunk as any)?.usage || {
        prompt_tokens: 0,
        completion_tokens: Math.ceil(this.accumulatedText.length / 4),
        total_tokens: Math.ceil(this.accumulatedText.length / 4)
      }
    };
  }

  /**
   * Async iterator support for `for await (const chunk of stream)`.
   */
  public async *[Symbol.asyncIterator](): AsyncIterator<ChatCompletionChunk> {
    if (this.failure) throw this.failure;
    if (this.isConsumed) {
      if (!this.isDone) throw new APIError('The response stream is already being consumed or was interrupted.',409,'incomplete_stream');
      for (const chunk of this.chunks) {
        yield chunk;
      }
      return;
    }

    this.isConsumed = true;
    try {
      for await (const chunk of this.sourceStream) {
        this.processChunk(chunk);
        yield chunk;
      }
      this.assertCompletion();
      this.isDone = true;
      this.listeners.end.forEach(fn => fn());
    } catch (err: any) {
      this.failure = err;
      this.listeners.error.forEach(fn => fn(err));
      throw err;
    }
  }

  private assertCompletion() {
    if (!this.completionObserved) throw new APIError('The response stream ended before completion. Check its status before continuing.',502,'incomplete_stream');
  }

  /**
   * Awaits completion and returns the final synthesized text.
   */
  public async finalText(): Promise<string> {
    await this.ensureConsuming();
    return this.accumulatedText;
  }

  /**
   * Awaits completion and returns the fully assembled ChatCompletionResponse.
   */
  public async finalChatCompletion(): Promise<ChatCompletionResponse> {
    return this.ensureConsuming();
  }

  /**
   * PromiseLike implementation allowing `await stream`.
   */
  public then<TResult1 = ChatCompletionResponse, TResult2 = never>(
    onfulfilled?: ((value: ChatCompletionResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.ensureConsuming().then(onfulfilled, onrejected);
  }

  /**
   * Converts the stream into a standard Web API `ReadableStream<Uint8Array>` text stream.
   */
  public toReadableStream(): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const self = this;

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of self) {
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });
  }

  /**
   * Returns a streaming plain-text HTTP Response (Content-Type: text/plain).
   */
  public toTextStreamResponse(init: ResponseInit = {}): Response {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(this.toReadableStream(), {
      ...init,
      headers
    });
  }

  /**
   * Returns a Vercel AI SDK Data Stream protocol Response (0:"token"\n).
   */
  public toDataStreamResponse(init: ResponseInit = {}): Response {
    const encoder = new TextEncoder();
    const self = this;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of self) {
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    headers.set('X-Vercel-AI-Data-Stream', 'v1');
    headers.set('Cache-Control', 'no-cache, no-transform');

    return new Response(stream, {
      ...init,
      headers
    });
  }
}
