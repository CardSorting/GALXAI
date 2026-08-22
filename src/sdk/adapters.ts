/**
 * GALXAI Developer SDK: Web & Vercel AI SDK Protocol Adapters
 * Enables zero-boilerplate streaming integration in Next.js App Router and edge handlers.
 */

import type { ChatCompletionChunk } from '../core/contracts/GalxContracts';

export class StreamAdapters {
  /**
   * Converts a GALXAI token chunk async iterator into a plain text stream.
   */
  public toTextStream(chunks: AsyncIterable<ChatCompletionChunk>): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chunks) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });
  }

  /**
   * Converts a GALXAI token chunk async iterator into an HTTP Response with text/event-stream headers.
   */
  public toTextStreamResponse(
    chunks: AsyncIterable<ChatCompletionChunk>,
    init: ResponseInit = {}
  ): Response {
    const stream = this.toTextStream(chunks);
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
   * Converts a GALXAI token chunk async iterator into a Vercel AI SDK AI-Stream / Data Stream protocol format (`0:"token"\n`).
   * Compatible with Vercel `useChat` and `useCompletion` frontend hooks.
   */
  public toDataStreamResponse(
    chunks: AsyncIterable<ChatCompletionChunk>,
    init: ResponseInit = {}
  ): Response {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chunks) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              // Vercel AI SDK protocol: 0:"<json-encoded-text>"\n
              const line = `0:${JSON.stringify(content)}\n`;
              controller.enqueue(encoder.encode(line));
            }
          }
          // Finish line (e.g. data: [DONE])
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
}
