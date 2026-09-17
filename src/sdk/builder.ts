/**
 * GALXAI Developer SDK: Fluent Prompt & Async Task Builder
 * Method-chaining ergonomics inspired by Stripe, Prisma, and LangChain.
 * Supports direct `await builder` (thenable) and `for await (const chunk of builder)` (AsyncIterable).
 */

import type { ChatMessage, ChatCompletionResponse, ChatCompletionChunk } from '../core/contracts/GalxContracts';
import type { ChatCompletionAsyncParams, AsyncTaskHandle, RequestOptions } from './types';
import type { CompletionsResource } from './resources/chat';
import { ChatCompletionStream } from './stream';
import { zodResponseFormat } from './structured';
import { safeParseJSON } from './json-repair';

export class PromptTemplate {
  private readonly template: string;
  private readonly defaults: Record<string, any>;

  constructor(template: string, defaults: Record<string, any> = {}) {
    this.template = template;
    this.defaults = defaults;
  }

  /**
   * Formats the prompt template by substituting {{variable}} placeholders.
   */
  public format(variables: Record<string, any> = {}): string {
    const merged = { ...this.defaults, ...variables };
    return this.template.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_, key) => {
      if (merged[key] !== undefined) {
        const val = merged[key];
        return typeof val === 'object' ? JSON.stringify(val) : String(val);
      }
      return `{{${key}}}`;
    });
  }
}

/**
 * Creates a reusable prompt template with {{var}} variable interpolation.
 *
 * @example
 * ```ts
 * const tpl = promptTemplate("Explain {{topic}} in {{language}}");
 * const prompt = tpl.format({ topic: "quantum entanglement", language: "French" });
 * ```
 */
export function promptTemplate(template: string, defaultVars?: Record<string, any>): PromptTemplate {
  return new PromptTemplate(template, defaultVars);
}

export class ChatCompletionBuilder implements PromiseLike<ChatCompletionResponse | AsyncTaskHandle<ChatCompletionResponse>>, AsyncIterable<string> {
  private readonly completions: CompletionsResource;
  private _model: string;
  private _messages: ChatMessage[] = [];
  private _temperature?: number;
  private _maxTokens?: number;
  private _stream = false;
  private _tools?: any[];
  private _responseFormat?: any;
  private _requestOptions?: RequestOptions;
  private _asyncParams?: Partial<ChatCompletionAsyncParams>;

  constructor(completions: CompletionsResource, model = 'gpt-5-6-luna-low') {
    this.completions = completions;
    this._model = model;
  }

  public model(model: string): this {
    this._model = model;
    return this;
  }

  public system(content: string): this {
    this._messages.push({ role: 'system', content });
    return this;
  }

  public user(content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>): this {
    this._messages.push({ role: 'user', content });
    return this;
  }

  public assistant(content: string): this {
    this._messages.push({ role: 'assistant', content });
    return this;
  }

  public message(role: 'system' | 'user' | 'assistant' | 'developer', content: string): this {
    this._messages.push({ role, content });
    return this;
  }

  /**
   * Adds an in-context few-shot demonstration example.
   *
   * @example
   * ```ts
   * builder
   *   .example("Translate 'Hello'", "Bonjour")
   *   .example("Translate 'Goodbye'", "Au revoir")
   *   .user("Translate 'Thank you'");
   * ```
   */
  public example(userPrompt: string, assistantReply: string): this {
    this.user(userPrompt);
    this.assistant(assistantReply);
    return this;
  }

  public temperature(temp: number): this {
    this._temperature = temp;
    return this;
  }

  public maxTokens(tokens: number): this {
    this._maxTokens = tokens;
    return this;
  }

  public stream(enabled = true): this {
    this._stream = enabled;
    return this;
  }

  public tools(tools: any[]): this {
    this._tools = tools;
    return this;
  }

  public options(options: RequestOptions): this {
    this._requestOptions = options;
    return this;
  }

  public async(params: {
    queue?: string;
    groupId?: string;
    tag?: string;
    priority?: number;
    delayMs?: number;
    idempotencyKey?: string;
    webhookCompletionUrl?: string;
  } = {}): this {
    this._asyncParams = params;
    return this;
  }

  /**
   * Returns a first-class `ChatCompletionStream` runner with event listeners and Web stream adapters.
   */
  public streamRunner(): ChatCompletionStream {
    return this.completions.stream({
      model: this._model,
      messages: this._messages,
      temperature: this._temperature,
      max_tokens: this._maxTokens,
      tools: this._tools
    }, this._requestOptions);
  }

  /**
   * Executes the prompt and enforces structured JSON extraction against a JSON Schema or Zod schema.
   */
  public async json<T = any>(schema: any, schemaName = 'structured_output'): Promise<T> {
    const isZod = schema && (schema._def !== undefined || typeof schema.safeParse === 'function');
    const format = isZod ? zodResponseFormat(schema, schemaName) : {
      type: 'json_schema' as const,
      json_schema: { name: schemaName, strict: true, schema }
    };

    const res = await this.completions.create({
      model: this._model,
      messages: this._messages,
      temperature: this._temperature,
      max_tokens: this._maxTokens,
      response_format: format,
      stream: false
    }, this._requestOptions);

    const raw = res.choices[0]?.message?.content || '{}';
    let parsed: any = safeParseJSON(raw);
    if (isZod && typeof schema.safeParse === 'function') {
      const v = schema.safeParse(parsed);
      if (v.success) parsed = v.data;
    }
    return parsed as T;
  }

  /**
   * Directly executes the completion request.
   */
  public async execute(): Promise<ChatCompletionResponse | AsyncIterable<ChatCompletionChunk> | AsyncTaskHandle<ChatCompletionResponse>> {
    if (this._asyncParams) {
      return this.completions.createAsync({
        model: this._model,
        messages: this._messages,
        temperature: this._temperature,
        max_tokens: this._maxTokens,
        tools: this._tools,
        ...this._asyncParams
      }, this._requestOptions);
    }

    if (this._stream) {
      return this.completions.create({
        model: this._model,
        messages: this._messages,
        temperature: this._temperature,
        max_tokens: this._maxTokens,
        tools: this._tools,
        response_format: this._responseFormat,
        stream: true
      }, this._requestOptions);
    }

    return this.completions.create({
      model: this._model,
      messages: this._messages,
      temperature: this._temperature,
      max_tokens: this._maxTokens,
      tools: this._tools,
      response_format: this._responseFormat,
      stream: false
    }, this._requestOptions);
  }

  /**
   * Thenable interface: enables `await builder` without calling `.execute()`.
   */
  public then<TResult1 = ChatCompletionResponse | AsyncTaskHandle<ChatCompletionResponse>, TResult2 = never>(
    onfulfilled?: ((value: ChatCompletionResponse | AsyncTaskHandle<ChatCompletionResponse>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return (this.execute() as Promise<ChatCompletionResponse | AsyncTaskHandle<ChatCompletionResponse>>).then(onfulfilled, onrejected);
  }

  /**
   * AsyncIterable interface: enables `for await (const token of builder)` streaming.
   */
  public async *[Symbol.asyncIterator](): AsyncIterator<string> {
    this._stream = true;
    const streamRes = await this.execute();
    if (streamRes && typeof (streamRes as any)[Symbol.asyncIterator] === 'function') {
      for await (const chunk of streamRes as AsyncIterable<ChatCompletionChunk>) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          yield delta;
        }
      }
    }
  }
}
