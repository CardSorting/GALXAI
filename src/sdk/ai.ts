/**
 * GALXAI: Vercel AI SDK Provider Shim
 *
 * Allows developers using `@ai-sdk/openai` or Vercel AI SDK Core (`streamText`, `generateText`)
 * to import directly:
 * `import { createGalxAI, galxai } from "@galxai/sdk/ai"`
 */

import { GalxAI } from './client';
import type { ClientOptions } from './types';
import { toTextStreamResponse, toDataStreamResponse } from './adapters';

export interface GalxAIProviderOptions extends ClientOptions {
  baseURL?: string;
  apiKey?: string;
}

export class GalxAIModelWrapper {
  constructor(
    public readonly modelId: string,
    public readonly client: GalxAI
  ) {}

  public async generateText(promptOrMessages: string | any[]): Promise<{ text: string; usage?: any }> {
    const messages = typeof promptOrMessages === 'string'
      ? [{ role: 'user', content: promptOrMessages }]
      : promptOrMessages;

    const res = await this.client.chat.completions.create({
      model: this.modelId,
      messages,
      stream: false
    });

    return {
      text: res.choices[0]?.message?.content || '',
      usage: res.usage
    };
  }

  public async streamText(promptOrMessages: string | any[]): Promise<{
    textStream: AsyncIterable<string>;
    toTextStreamResponse: () => Response;
    toDataStreamResponse: () => Response;
  }> {
    const messages = typeof promptOrMessages === 'string'
      ? [{ role: 'user', content: promptOrMessages }]
      : promptOrMessages;

    const stream = await this.client.chat.completions.create({
      model: this.modelId,
      messages,
      stream: true
    });

    async function* textGenerator() {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) yield delta;
      }
    }

    return {
      textStream: textGenerator(),
      toTextStreamResponse: () => toTextStreamResponse(textGenerator()),
      toDataStreamResponse: () => toDataStreamResponse(textGenerator())
    };
  }
}

export function createGalxAI(options?: GalxAIProviderOptions) {
  const client = new GalxAI(options);

  const provider = (modelId: string) => {
    return new GalxAIModelWrapper(modelId, client);
  };

  provider.languageModel = (modelId: string) => provider(modelId);
  provider.textEmbeddingModel = (modelId: string) => ({
    modelId,
    client
  });

  return provider;
}

export const galxai = createGalxAI();
export default galxai;
