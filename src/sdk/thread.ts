/**
 * GALXAI Developer SDK: Stateful Conversation Thread Manager
 * Automates multi-turn context retention, branch forking, session persistence, and auto-truncation.
 */

import type { ChatMessage } from '../core/contracts/GalxContracts';
import { TokenOptimizer } from './tokens';
import type { GalxAI } from './client';
import type { RequestOptions } from './types';
import { createChatResourceId, type ChatSessionMode } from '../core/chat/GalxChatRequestNormalizer';

export interface ThreadOptions {
  /** Durable logical identity. Omit to start a new isolated conversation. */
  id?: string;
  sessionId?: string;
  conversationId?: string;
  model?: string;
  system?: string;
  systemPrompt?: string;
  maxTokens?: number;
  messages?: ChatMessage[];
}

export interface ThreadExportState {
  /** Optional only for backwards compatibility with pre-session SDK snapshots. */
  id?: string;
  model: string;
  systemPrompt?: string;
  maxTokens: number;
  messages: ChatMessage[];
}

export class ConversationThread {
  private readonly client: GalxAI;
  private id: string;
  private nextSessionMode: ChatSessionMode;
  private activeTurn = false;
  private model: string;
  private systemPrompt?: string;
  private readonly maxTokens: number;
  private messages: ChatMessage[] = [];

  constructor(client: GalxAI, options: ThreadOptions = {}) {
    this.client = client;
    const suppliedId = options.id || options.sessionId || options.conversationId;
    this.id = suppliedId || createChatResourceId('session');
    this.nextSessionMode = suppliedId ? 'continue' : 'new';
    this.model = options.model || 'gpt-5.6-sol';
    this.systemPrompt = options.system || options.systemPrompt;
    this.maxTokens = options.maxTokens ?? 100_000;

    if (options.messages && options.messages.length > 0) {
      this.messages = [...options.messages];
    } else if (this.systemPrompt) {
      this.messages.push({ role: 'system', content: this.systemPrompt });
    }
  }

  /** Stable logical identity; it is deliberately independent of the shared client. */
  public get sessionId(): string {
    return this.id;
  }

  /**
   * Sets or overrides the system prompt instructions.
   */
  public system(content: string): this {
    this.systemPrompt = content;
    const existingSysIdx = this.messages.findIndex(m => m.role === 'system');
    if (existingSysIdx !== -1) {
      this.messages[existingSysIdx] = { role: 'system', content };
    } else {
      this.messages.unshift({ role: 'system', content });
    }
    return this;
  }

  /**
   * Appends a developer/system message to the thread.
   */
  public developer(content: string): this {
    this.messages.push({ role: 'developer', content } as any);
    return this;
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
  public async reply(userInput?: string, options?: RequestOptions): Promise<string> {
    if (this.activeTurn) {
      throw new Error(`Conversation ${this.id} already has an active turn.`);
    }
    this.activeTurn = true;
    if (userInput) {
      this.user(userInput);
    }

    try {
      const truncated = TokenOptimizer.truncateToFit(this.messages, this.maxTokens);
      const turnId = createChatResourceId('turn');
      const res = await this.client.chat.completions.create({
        model: this.model,
        messages: truncated,
        stream: false,
        conversation_id: this.id,
        session_mode: this.nextSessionMode,
        turn_id: turnId,
        user_message_id: turnId,
        assistant_message_id: `${turnId.slice(0, 52)}:a`,
      }, options);

      const replyText = res.choices[0]?.message?.content || '';
      this.assistant(replyText);
      this.nextSessionMode = 'continue';
      return replyText;
    } finally {
      this.activeTurn = false;
    }
  }

  /**
   * Fluent alias for `reply(userInput)`.
   */
  public async run(userInput?: string, options?: RequestOptions): Promise<string> {
    return this.reply(userInput, options);
  }

  /**
   * Streams the assistant's reply and appends it to the thread history once finished.
   */
  public async *streamReply(userInput?: string, options?: RequestOptions): AsyncIterable<string> {
    if (this.activeTurn) {
      throw new Error(`Conversation ${this.id} already has an active turn.`);
    }
    this.activeTurn = true;
    if (userInput) {
      this.user(userInput);
    }

    try {
      const truncated = TokenOptimizer.truncateToFit(this.messages, this.maxTokens);
      const turnId = createChatResourceId('turn');
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: truncated,
        stream: true,
        conversation_id: this.id,
        session_mode: this.nextSessionMode,
        turn_id: turnId,
        user_message_id: turnId,
        assistant_message_id: `${turnId.slice(0, 52)}:a`,
      }, options);

      // The server establishes a `new` session before opening the provider stream.
      this.nextSessionMode = 'continue';
      let accumulated = '';
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          accumulated += delta;
          yield delta;
        }
      }

      this.assistant(accumulated);
    } finally {
      this.activeTurn = false;
    }
  }

  /**
   * Fluent alias for `streamReply(userInput)`.
   */
  public async *stream(userInput?: string, options?: RequestOptions): AsyncIterable<string> {
    yield* this.streamReply(userInput, options);
  }

  /**
   * Clones this thread at its current state into a new isolated branch.
   */
  public fork(modelOverride?: string): ConversationThread {
    return new ConversationThread(this.client, {
      model: modelOverride || this.model,
      system: this.systemPrompt,
      maxTokens: this.maxTokens,
      messages: [...this.messages]
    });
  }

  /**
   * Calculates total estimated tokens currently stored in thread history.
   */
  public totalTokens(): number {
    return TokenOptimizer.estimateMessagesTokens(this.messages);
  }

  /**
   * Exports thread history and state for persistence to database, sessionStorage, or Redis.
   */
  public export(): ThreadExportState {
    return {
      id: this.id,
      model: this.model,
      systemPrompt: this.systemPrompt,
      maxTokens: this.maxTokens,
      messages: [...this.messages]
    };
  }

  /**
   * Imports a previously exported thread state snapshot.
   */
  public import(state: ThreadExportState): this {
    if (this.activeTurn) throw new Error(`Cannot import state while conversation ${this.id} is active.`);
    this.id = state.id || createChatResourceId('session');
    this.nextSessionMode = state.id ? 'continue' : 'new';
    this.model = state.model || this.model;
    this.systemPrompt = state.systemPrompt;
    this.messages = [...(state.messages || [])];
    return this;
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
    if (this.activeTurn) throw new Error(`Cannot clear conversation ${this.id} while a turn is active.`);
    this.id = createChatResourceId('session');
    this.nextSessionMode = 'new';
    this.messages = this.systemPrompt ? [{ role: 'system', content: this.systemPrompt }] : [];
    return this;
  }
}
