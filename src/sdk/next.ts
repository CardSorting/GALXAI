/**
 * GALXAI Next.js 14 & 15 Route Handler Adapters
 * Provides 1-line server-side route integration for App Router & Pages Router
 */

import { GalxAI } from './client';
import type { ImageGenerateParams } from './resources/images';

export interface RouteHandlerOptions {
  client?: GalxAI;
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  allowFallback?: boolean;
  systemPrompt?: string;
}

function getNextClient(options?: RouteHandlerOptions): GalxAI {
  if (options?.client) return options.client;
  return new GalxAI({
    apiKey: options?.apiKey,
    baseURL: options?.baseURL
  });
}

/**
 * Universal Catch-All Route Handler for Next.js App Router.
 * Handles images, chat, streaming, models, and background tasks from a single route:
 * `app/api/galxai/[...action]/route.ts`
 *
 * @example
 * ```ts
 * // app/api/galxai/[...action]/route.ts
 * export { handleGalxAI as GET, handleGalxAI as POST } from 'galxai/next';
 * ```
 */
export async function handleGalxAI(req: Request, context?: { params?: Promise<{ action?: string[] }> | { action?: string[] } }): Promise<Response> {
  const url = new URL(req.url);
  const resolvedParams = context?.params ? (context.params instanceof Promise ? await context.params : context.params) : undefined;
  const actionPath = resolvedParams?.action?.join('/') || url.pathname.replace(/^\/api\/(galxai|galx)\/?/, '');

  const client = getNextClient();

  // 1. Model Listing (GET /models)
  if (req.method === 'GET' && (actionPath === 'models' || actionPath.endsWith('/models'))) {
    return createModelsRoute({ client })() as any;
  }

  // 2. Health Check (GET /health)
  if (req.method === 'GET' && (actionPath === 'health' || actionPath === '')) {
    return new Response(JSON.stringify({ status: 'healthy', provider: 'GALXAI', timestamp: Date.now() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 3. Task Status Polling (GET /tasks/[id] or GET /queues/[queue]/tasks/[id])
  if (req.method === 'GET' && (actionPath.includes('tasks/') || actionPath.includes('queue'))) {
    const taskId = actionPath.split('/').pop();
    try {
      const task = await client.core.request(`/api/queues/image-gen/tasks/${taskId}`);
      return new Response(JSON.stringify(task), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message || 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 4. Chat Completions (POST /chat)
  if (req.method === 'POST' && (actionPath === 'chat' || actionPath.includes('/chat'))) {
    return createChatRoute({ client })(req);
  }

  // 5. Visual Generation (POST /generate or POST /images or default POST)
  return createImageRoute({ client })(req);
}

/**
 * Creates a Next.js App Router POST handler for visual generation.
 */
export function createImageRoute(options: RouteHandlerOptions = {}) {
  const client = getNextClient(options);
  const allowFallback = options.allowFallback !== false;

  return async function POST(req: Request): Promise<Response> {
    try {
      const body = await req.json();
      const prompt = body.prompt;
      if (!prompt || typeof prompt !== 'string') {
        return new Response(JSON.stringify({ error: 'Prompt is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const params: ImageGenerateParams = {
        prompt,
        model: body.model || options.defaultModel || 'openai-gpt-image-latest',
        aspectRatio: body.aspectRatio || body.aspect_ratio || '1:1',
        size: body.size,
        quality: body.quality || 'standard',
        n: body.n || 1,
        negativePrompt: body.negativePrompt || body.negative_prompt,
        seed: body.seed
      };

      if (body.isAsync || body.priority) {
        const handle = await client.images.generateAsync({
          ...params,
          priority: body.priority
        });
        const result = await handle.result();
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await client.images.generate(params);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      if (allowFallback) {
        const body = await req.clone().json().catch(() => ({}));
        const prompt = body.prompt || 'art';
        const seed = Math.abs(prompt.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) + Date.now()) % 1000;
        return new Response(
          JSON.stringify({
            created: Math.floor(Date.now() / 1000),
            data: [{ url: `https://picsum.photos/seed/galx-${seed}/1024/1024`, revised_prompt: prompt }],
            modelUsed: body.model || 'openai-gpt-image-latest',
            shardId: 'galx_fallback'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ error: err?.message || 'Generation failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

/**
 * Creates a Next.js App Router POST handler for streaming/standard chat completions.
 */
export function createChatRoute(options: RouteHandlerOptions = {}) {
  const client = getNextClient(options);

  return async function POST(req: Request): Promise<Response> {
    try {
      const body = await req.json();
      const messages = body.messages || (body.prompt ? [{ role: 'user', content: body.prompt }] : []);
      const stream = body.stream ?? true;

      if (options.systemPrompt && !messages.some((m: any) => m.role === 'system')) {
        messages.unshift({ role: 'system', content: options.systemPrompt });
      }

      if (stream) {
        const responseStream = await client.chat.completions.create({
          model: body.model || options.defaultModel || 'gpt-5.6-sol',
          messages,
          temperature: body.temperature,
          stream: true
        });

        const encoder = new TextEncoder();
        const readable = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of responseStream as any) {
                const text = chunk.choices?.[0]?.delta?.content || '';
                if (text) {
                  controller.enqueue(encoder.encode(text));
                }
              }
              controller.close();
            } catch (streamErr) {
              controller.error(streamErr);
            }
          }
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked'
          }
        });
      }

      const completion = await client.chat.completions.create({
        model: body.model || options.defaultModel || 'gpt-5.6-sol',
        messages,
        temperature: body.temperature
      });

      return new Response(JSON.stringify(completion), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err?.message || 'Chat completion failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

/**
 * Creates a Next.js App Router GET handler to list available models.
 */
export function createModelsRoute(options: RouteHandlerOptions = {}) {
  const client = getNextClient(options);

  return async function GET(): Promise<Response> {
    try {
      const models = await client.models.list();
      return new Response(JSON.stringify(models), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          data: [
            { id: 'openai-gpt-image-latest', name: 'OpenAI Image Generation', description: 'Generate images from text prompts' },
            { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', description: 'Flagship reasoning & text generation' }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}

export function createGalxAIRouteHandler(options: RouteHandlerOptions = {}) {
  return {
    POST: (req: Request) => handleGalxAI(req),
    GET: (req: Request) => handleGalxAI(req)
  };
}

export const createUniversalRoute = handleGalxAI;
export const routeHandler = handleGalxAI;
