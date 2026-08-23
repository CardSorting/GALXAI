/**
 * GALXAI Developer SDK: Stateful Conversation Thread Manager
 * Automates multi-turn context retention, system prompt pinning, auto-truncation, and streaming replies.
 */

import type { ChatMessage } from '../core/contracts/GalxContracts';
import { TokenOptimizer } from './tokens';
import type { GalxAI } from './client';

export interface ThreadOptions {
  model?: string;
  system?: string;
  systemPrompt?: string;
  maxTokens?: number;
}

export class ConversationThread {
  private readonly client: GalxAI;
  private readonly model: string;
  private readonly systemPrompt?: string;
  private readonly maxTokens: number;
  private messages: ChatMessage[] = [];

  constructor(client: GalxAI, options: ThreadOptions = {}) {
    this.client = client;
    this.model = options.model || 'gpt-5.6-sol';
    this.systemPrompt = options.system || options.systemPrompt;
    this.maxTokens = options.maxTokens ?? 100_000;

    if (this.systemPrompt) {
      this.messages.push({ role: 'system', content: this.systemPrompt });
    }
  }

  /**
   * Appends a user message to the thread.
   */
  public user(content: string | any[]): this {
    this.messages.push({ role: 'user', content });
    return this;
  }

  /**
   * Appends an assistant message to the thread.
   */
  public assistant(content: string): this {
    this.messages.push({ role: 'assistant', content });
    return this;
  }

  /**
   * Sends the thread to the model and returns the assistant's reply string.
   */
  public async reply(userInput?: string): Promise<string> {
    if (userInput) {
      this.user(userInput);
    }

    const truncated = TokenOptimizer.truncateToFit(this.messages, this.maxTokens);
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: truncated,
      stream: false
    });

    const replyText = res.choices[0]?.message?.content || '';
    this.assistant(replyText);
    return replyText;
  }

  /**
   * Streams the assistant's reply and appends it to the thread history once finished.
   */
  public async *streamReply(userInput?: string): AsyncIterable<string> {
    if (userInput) {
      this.user(userInput);
    }

    const truncated = TokenOptimizer.truncateToFit(this.messages, this.maxTokens);
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: truncated,
      stream: true
    });

    let accumulated = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        accumulated += delta;
        yield delta;
      }
    }

    this.assistant(accumulated);
  }

  /**
   * Returns a copy of the thread history.
   */
  public getHistory(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * Resets thread history while preserving the system prompt.
   */
  public clear(): this {
    this.messages = this.systemPrompt ? [{ role: 'system', content: this.systemPrompt }] : [];
    return this;
  }
}
