/**
 * GALXAI Express & Node HTTP Middleware Adapters
 * Provides plug-and-play middleware for Express, Fastify, and standard Node.js servers.
 */

import { GalxAI } from '../client';
import type { ImageGenerateParams } from '../resources/images';

export interface ExpressAdapterOptions {
  client?: GalxAI;
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
}

function getClient(options?: ExpressAdapterOptions): GalxAI {
  if (options?.client) return options.client;
  return new GalxAI({
    apiKey: options?.apiKey,
    baseURL: options?.baseURL
  });
}

/**
 * Creates an Express.js middleware handler for visual generation.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { createExpressImageHandler } from 'galxai/express';
 *
 * const app = express();
 * app.use(express.json());
 * app.post('/api/generate', createExpressImageHandler());
 * ```
 */
export function createExpressImageHandler(options: ExpressAdapterOptions = {}) {
  const client = getClient(options);

  return async function expressImageHandler(req: any, res: any) {
    try {
      const { prompt, model, aspectRatio, size, quality, n, priority, isAsync } = req.body || {};

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const params: ImageGenerateParams = {
        prompt,
        model: model || options.defaultModel || 'openai-gpt-image-latest',
        aspectRatio: aspectRatio || '1:1',
        size,
        quality: quality || 'standard',
        n: n || 1
      };

      if (isAsync || priority) {
        const handle = await client.images.generateAsync({
          ...params,
          priority
        });
        const result = await handle.result();
        return res.json(result);
      }

      const result = await client.images.generate(params);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Generation failed' });
    }
  };
}

/**
 * Creates an Express.js middleware handler for chat completions & token streaming.
 *
 * @example
 * ```ts
 * import { createExpressChatHandler } from 'galxai/express';
 * app.post('/api/chat', createExpressChatHandler());
 * ```
 */
export function createExpressChatHandler(options: ExpressAdapterOptions = {}) {
  const client = getClient(options);

  return async function expressChatHandler(req: any, res: any) {
    try {
      const { prompt, messages: rawMessages, model, stream = true, temperature } = req.body || {};
      const messages = rawMessages || (prompt ? [{ role: 'user', content: prompt }] : []);

      if (stream) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        const responseStream = await client.chat.completions.create({
          model: model || options.defaultModel || 'gpt-5.6-sol',
          messages,
          temperature,
          stream: true
        });

        for await (const chunk of responseStream as any) {
          const text = chunk.choices?.[0]?.delta?.content || '';
          if (text) {
            res.write(text);
          }
        }
        return res.end();
      }

      const completion = await client.chat.completions.create({
        model: model || options.defaultModel || 'gpt-5.6-sol',
        messages,
        temperature
      });

      return res.json(completion);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Chat completion failed' });
    }
  };
}
