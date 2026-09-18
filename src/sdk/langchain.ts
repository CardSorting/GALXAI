/**
 * GALXAI: LangChain Integration Shim
 *
 * Provides drop-in chat model classes compatible with LangChain runnables and prompt pipelines:
 * `import { ChatGalxAI } from "@galxai/sdk/langchain"`
 */

import { GalxAI } from './client';
import type { ClientOptions } from './types';
import type { ChatMessage } from '../core/contracts/GalxContracts';

export interface ChatGalxAIParams extends ClientOptions {
  modelName?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

export class ChatGalxAI {
  public readonly modelName: string;
  public readonly temperature: number;
  public readonly maxTokens?: number;
  public readonly streaming: boolean;
  private readonly client: GalxAI;

  constructor(fields: ChatGalxAIParams = {}) {
    const { modelName, model, temperature, maxTokens, streaming, ...clientOpts } = fields;
    this.modelName = model || modelName || 'galx-nova';
    this.temperature = temperature ?? 0.7;
    this.maxTokens = maxTokens;
    this.streaming = streaming ?? false;
    this.client = new GalxAI(clientOpts);
  }

  private normalizeMessages(messages: any[]): ChatMessage[] {
    return messages.map((m) => {
      if (typeof m === 'string') {
        return { role: 'user', content: m };
      }
      if (m && typeof m === 'object') {
        const role = m._getType?.() === 'human' || m.role === 'user'
          ? 'user'
          : m._getType?.() === 'system' || m.role === 'system'
          ? 'system'
          : 'assistant';
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        return { role, content };
      }
      return { role: 'user', content: String(m) };
    });
  }

  public async invoke(input: any): Promise<{ content: string; additional_kwargs: any }> {
    const rawMessages = Array.isArray(input) ? input : [input];
    const messages = this.normalizeMessages(rawMessages);

    const res = await this.client.chat.completions.create({
      model: this.modelName,
      messages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: false
    });

    return {
      content: res.choices[0]?.message?.content || '',
      additional_kwargs: {
        usage: res.usage,
        model: res.model
      }
    };
  }

  public async *stream(input: any): AsyncIterable<{ content: string }> {
    const rawMessages = Array.isArray(input) ? input : [input];
    const messages = this.normalizeMessages(rawMessages);

    const stream = await this.client.chat.completions.create({
      model: this.modelName,
      messages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: true
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield { content: delta };
      }
    }
  }
}

export default ChatGalxAI;
