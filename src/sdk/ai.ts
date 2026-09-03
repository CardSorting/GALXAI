/**
 * GALXAI: Vercel AI SDK Provider Shim
 *
 * Allows developers using `@ai-sdk/openai` or Vercel AI SDK Core (`streamText`, `generateText`)
 * to import directly:
 * `import { createGalxAI, galxai } from "galxai/ai"`
 */

import { GalxAI } from './client';
import type { ClientOptions, RequestOptions } from './types';
import { toTextStreamResponse, toDataStreamResponse } from './adapters';
import { safeParseJSON } from './json-repair';
import { zodToJsonSchema } from './structured';

export interface GalxAIProviderOptions extends ClientOptions {
  baseURL?: string;
  apiKey?: string;
}

export class GalxAIModelWrapper {
  public readonly specificationVersion = 'v1';
  public readonly defaultObjectGenerationMode = 'json';

  constructor(
    public readonly modelId: string,
    public readonly client: GalxAI
  ) {}

  /**
   * Conformance implementation for Vercel AI SDK LanguageModelV1.doGenerate
   */
  public async doGenerate(options: any): Promise<{
    text?: string;
    toolCalls?: any[];
    finishReason: string;
    usage: { promptTokens: number; completionTokens: number };
    rawCall: { rawPrompt: any; rawSettings: any };
  }> {
    const prompt = options.prompt || [];
    const messages = typeof prompt === 'string'
      ? [{ role: 'user', content: prompt }]
      : Array.isArray(prompt)
      ? prompt
      : [{ role: 'user', content: String(prompt) }];

    const res = await this.client.chat.completions.create({
      model: this.modelId,
      messages: messages as any,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: false
    });

    const choice = res.choices[0];
    return {
      text: choice?.message?.content || undefined,
      toolCalls: choice?.message?.tool_calls,
      finishReason: choice?.finish_reason || 'stop',
      usage: {
        promptTokens: res.usage?.prompt_tokens || 0,
        completionTokens: res.usage?.completion_tokens || 0
      },
      rawCall: { rawPrompt: options.prompt, rawSettings: options }
    };
  }

  /**
   * Conformance implementation for Vercel AI SDK LanguageModelV1.doStream
   */
  public async doStream(options: any): Promise<{
    stream: ReadableStream<any>;
    rawCall: { rawPrompt: any; rawSettings: any };
  }> {
    const prompt = options.prompt || [];
    const messages = typeof prompt === 'string'
      ? [{ role: 'user', content: prompt }]
      : Array.isArray(prompt)
      ? prompt
      : [{ role: 'user', content: String(prompt) }];

    const rawStream = await this.client.chat.completions.create({
      model: this.modelId,
      messages: messages as any,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: true
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of rawStream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              controller.enqueue({ type: 'text-delta', textDelta: delta });
            }
          }
          controller.enqueue({ type: 'finish', finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 } });
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return {
      stream,
      rawCall: { rawPrompt: options.prompt, rawSettings: options }
    };
  }

  public async generateText(promptOrMessages: string | any[], options?: RequestOptions): Promise<{ text: string; usage?: any }> {
    const messages = typeof promptOrMessages === 'string'
      ? [{ role: 'user', content: promptOrMessages }]
      : promptOrMessages;

    const res = await this.client.chat.completions.create({
      model: this.modelId,
      messages,
      stream: false
    }, options);

    return {
      text: res.choices[0]?.message?.content || '',
      usage: res.usage
    };
  }

  public async streamText(promptOrMessages: string | any[], options?: RequestOptions): Promise<{
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
    }, options);

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

  public async generateObject<T = any>(prompt: string, schema: any, options?: RequestOptions): Promise<{ object: T; usage?: any }> {
    const jsonSchema = zodToJsonSchema(schema);
    const res = await this.client.chat.structured<T>({
      model: this.modelId,
      messages: [{ role: 'user', content: prompt }],
      schema: jsonSchema
    }, options);

    return {
      object: res
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

  provider.generateText = async (modelId: string, prompt: string | any[]) => {
    return provider(modelId).generateText(prompt);
  };

  provider.streamText = async (modelId: string, prompt: string | any[]) => {
    return provider(modelId).streamText(prompt);
  };

  provider.generateObject = async (modelId: string, prompt: string, schema: any) => {
    return provider(modelId).generateObject(prompt, schema);
  };

  return provider;
}

export const galxai = createGalxAI();
export default galxai;
