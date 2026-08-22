/**
 * GALXAI Developer SDK: Fluent Prompt & Async Task Builder
 * Method-chaining ergonomics inspired by Stripe, Prisma, and LangChain.
 */

import type { ChatMessage, ChatCompletionResponse, ChatCompletionChunk } from '../core/contracts/GalxContracts';
import type { ChatCompletionAsyncParams, AsyncTaskHandle } from './types';
import type { CompletionsResource } from './resources/chat';

export class ChatCompletionBuilder {
  private readonly completions: CompletionsResource;
  private _model: string;
  private _messages: ChatMessage[] = [];
  private _temperature?: number;
  private _maxTokens?: number;
  private _stream = false;
  private _asyncParams?: Partial<ChatCompletionAsyncParams>;

  constructor(completions: CompletionsResource, model = 'gpt-5.6-sol') {
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

  public async execute(): Promise<ChatCompletionResponse | AsyncIterable<ChatCompletionChunk> | AsyncTaskHandle<ChatCompletionResponse>> {
    if (this._asyncParams) {
      return this.completions.createAsync({
        model: this._model,
        messages: this._messages,
        temperature: this._temperature,
        max_tokens: this._maxTokens,
        ...this._asyncParams
      });
    }

    if (this._stream) {
      return this.completions.create({
        model: this._model,
        messages: this._messages,
        temperature: this._temperature,
        max_tokens: this._maxTokens,
        stream: true
      });
    }

    return this.completions.create({
      model: this._model,
      messages: this._messages,
      temperature: this._temperature,
      max_tokens: this._maxTokens,
      stream: false
    });
  }
}
