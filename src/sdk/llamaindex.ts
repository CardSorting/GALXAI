/**
 * GALXAI: LlamaIndex Integration Shim
 *
 * Provides drop-in LLM classes compatible with LlamaIndex RAG pipelines:
 * `import { GalxLLM } from "@galxai/sdk/llamaindex"`
 */

import { GalxAI } from './client';
import type { ClientOptions } from './types';
import type { ChatMessage } from '../core/contracts/GalxContracts';

export interface GalxLLMParams extends ClientOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class GalxLLM {
  public readonly model: string;
  public readonly temperature: number;
  public readonly maxTokens?: number;
  private readonly client: GalxAI;

  constructor(params: GalxLLMParams = {}) {
    const { model, temperature, maxTokens, ...clientOpts } = params;
    this.model = model || 'gpt-5.6-sol';
    this.temperature = temperature ?? 0.2;
    this.maxTokens = maxTokens;
    this.client = new GalxAI(clientOpts);
  }

  public async complete(prompt: string): Promise<{ text: string }> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: false
    });

    return {
      text: res.choices[0]?.message?.content || ''
    };
  }

  public async chat(messages: Array<{ role: string; content: string }>): Promise<{ message: { content: string } }> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: messages as ChatMessage[],
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: false
    });

    return {
      message: {
        content: res.choices[0]?.message?.content || ''
      }
    };
  }
}

export default GalxLLM;
