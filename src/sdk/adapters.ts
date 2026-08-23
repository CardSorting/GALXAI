/**
 * GALXAI Developer SDK: Web & Vercel AI SDK Protocol Adapters
 * Enables zero-boilerplate streaming integration in Next.js App Router and edge handlers.
 */

import type { ChatCompletionChunk } from '../core/contracts/GalxContracts';

export type StreamInput =
  | AsyncIterable<ChatCompletionChunk>
  | AsyncIterable<string>
  | ReadableStream<Uint8Array>
  | Response
  | Promise<any>;

export class StreamAdapters {
  /**
   * Converts any GALXAI stream or token chunk iterator into a standard Uint8Array ReadableStream.
   */
  public toTextStream(input: StreamInput): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        try {
          const resolved = await Promise.resolve(input);

          // If already a ReadableStream
          if (resolved instanceof ReadableStream) {
            const reader = resolved.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            controller.close();
            return;
          }

          // If a Fetch Response
          if (resolved instanceof Response && resolved.body) {
            const reader = resolved.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            controller.close();
            return;
          }

          // If an AsyncIterable of chunks or strings
          if (resolved && typeof (resolved as any)[Symbol.asyncIterator] === 'function') {
            for await (const chunk of resolved as AsyncIterable<any>) {
              if (typeof chunk === 'string') {
                controller.enqueue(encoder.encode(chunk));
              } else if (chunk?.choices?.[0]?.delta?.content) {
                controller.enqueue(encoder.encode(chunk.choices[0].delta.content));
              } else if (chunk instanceof Uint8Array) {
                controller.enqueue(chunk);
              }
            }
            controller.close();
            return;
          }

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });
  }

  /**
   * Converts a stream into a plain text HTTP Response with streaming headers.
   */
  public toTextStreamResponse(input: StreamInput, init: ResponseInit = {}): Response {
    const stream = this.toTextStream(input);
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(stream, {
      ...init,
      headers
    });
  }

  /**
   * Converts a stream into a Vercel AI SDK Data Stream protocol format (`0:"token"\n`).
   * Compatible with Vercel `useChat` and `useCompletion` frontend hooks.
   */
  public toDataStreamResponse(input: StreamInput, init: ResponseInit = {}): Response {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const resolved = await Promise.resolve(input);
          if (resolved && typeof (resolved as any)[Symbol.asyncIterator] === 'function') {
            for await (const chunk of resolved as AsyncIterable<any>) {
              const text = typeof chunk === 'string' ? chunk : chunk?.choices?.[0]?.delta?.content;
              if (text) {
                // Vercel AI SDK line protocol: 0:"<json-encoded-text>"\n
                controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`));
              }
            }
          }
          // Finish line
          controller.enqueue(encoder.encode('d:{"finishReason":"stop"}\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    headers.set('x-vercel-ai-data-stream', 'v1');
    headers.set('Cache-Control', 'no-cache, no-transform');

    return new Response(stream, {
      ...init,
      headers
    });
  }

  /**
   * Converts a stream into a standard Server-Sent Events (SSE) Response.
   */
  public toSSEResponse(input: StreamInput, init: ResponseInit = {}): Response {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const resolved = await Promise.resolve(input);
          if (resolved && typeof (resolved as any)[Symbol.asyncIterator] === 'function') {
            for await (const chunk of resolved as AsyncIterable<any>) {
              const payload = typeof chunk === 'string' ? { content: chunk } : chunk;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'text/event-stream; charset=utf-8');
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('Connection', 'keep-alive');

    return new Response(stream, {
      ...init,
      headers
    });
  }
}

const defaultAdapters = new StreamAdapters();

export function toTextStream(input: StreamInput): ReadableStream<Uint8Array> {
  return defaultAdapters.toTextStream(input);
}

export function toTextStreamResponse(input: StreamInput, init?: ResponseInit): Response {
  return defaultAdapters.toTextStreamResponse(input, init);
}

export function toDataStreamResponse(input: StreamInput, init?: ResponseInit): Response {
  return defaultAdapters.toDataStreamResponse(input, init);
}

export function toSSEResponse(input: StreamInput, init?: ResponseInit): Response {
  return defaultAdapters.toSSEResponse(input, init);
}
