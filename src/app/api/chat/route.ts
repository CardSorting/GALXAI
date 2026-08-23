import { NextRequest, NextResponse } from 'next/server';
import { galxRouter } from '@/core/router/GalxModelRouter';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { ModelCatalog } from '@/core/router/ModelCatalog';
import type { ChatCompletionRequest } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, X-Galx-Shard-Preference'
    }
  });
}

/**
 * Native Ollama & Universal Chat POST /api/chat Endpoint.
 * Ingests Ollama messages format and streaming NDJSON chunks.
 */
export async function POST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    const rawBody = (await req.json().catch(() => ({}))) as any;
    const requestedModel = rawBody.model || 'gpt-5.6-sol';
    const modelSpec = ModelCatalog.resolveModel(requestedModel);
    const isStream = rawBody.stream !== false; // Ollama defaults stream to true

    const rawMessages = rawBody.messages || [];
    const normalizedMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (Array.isArray(rawMessages) && rawMessages.length > 0) {
      for (const msg of rawMessages) {
        if (typeof msg === 'string') {
          normalizedMessages.push({ role: 'user', content: msg });
        } else if (msg && typeof msg === 'object') {
          normalizedMessages.push({
            role: msg.role || 'user',
            content: msg.content || msg.text || ''
          });
        }
      }
    } else if (rawBody.prompt) {
      normalizedMessages.push({ role: 'user', content: String(rawBody.prompt) });
    }

    if (normalizedMessages.length === 0) {
      normalizedMessages.push({ role: 'user', content: 'Hello' });
    }

    const chatRequest: ChatCompletionRequest = {
      model: modelSpec.id,
      messages: normalizedMessages as any,
      temperature: rawBody.options?.temperature ?? 0.7,
      max_tokens: rawBody.options?.num_predict ?? 2048,
      stream: isStream
    };

    const requestId = `ollama_chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const result = await galxRouter.routeChatCompletion({
      request: chatRequest,
      userId: authResult.userId || 'ollama_user',
      requestId,
      isPriorityUser: authResult.isPriorityUser,
      headers: req.headers
    });

    const createdAt = new Date().toISOString();

    // Streaming NDJSON
    if (isStream && result.body) {
      const encoder = new TextEncoder();
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      (async () => {
        try {
          if (typeof (result.body as any).getReader === 'function') {
            const reader = (result.body as ReadableStream<Uint8Array>).getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;
                const jsonStr = trimmed.replace(/^data:\s*/, '');
                if (jsonStr === '[DONE]') continue;
                try {
                  const chunk = JSON.parse(jsonStr);
                  const deltaText = chunk.choices?.[0]?.delta?.content || '';
                  if (deltaText) {
                    const ollamaChunk = {
                      model: modelSpec.id,
                      created_at: createdAt,
                      message: {
                        role: 'assistant',
                        content: deltaText
                      },
                      done: false
                    };
                    await writer.write(encoder.encode(JSON.stringify(ollamaChunk) + '\n'));
                  }
                } catch {}
              }
            }
          } else if (typeof result.body === 'string') {
            const parsed = JSON.parse(result.body);
            const contentText = parsed.choices?.[0]?.message?.content || '';
            const ollamaChunk = {
              model: modelSpec.id,
              created_at: createdAt,
              message: {
                role: 'assistant',
                content: contentText
              },
              done: false
            };
            await writer.write(encoder.encode(JSON.stringify(ollamaChunk) + '\n'));
          }

          // Final completion chunk
          const finalChunk = {
            model: modelSpec.id,
            created_at: createdAt,
            message: {
              role: 'assistant',
              content: ''
            },
            done: true,
            done_reason: 'stop',
            total_duration: 140000000,
            load_duration: 1300000,
            prompt_eval_count: 28,
            eval_count: 72
          };
          await writer.write(encoder.encode(JSON.stringify(finalChunk) + '\n'));
          await writer.close();
        } catch (streamErr) {
          try {
            await writer.abort(streamErr);
          } catch {}
        }
      })();

      return new Response(readable, {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'X-Galx-Model-Resolved': modelSpec.id
        }
      });
    }

    // Non-Streaming Response
    const parsed = typeof result.body === 'string' ? JSON.parse(result.body) : {};
    const contentText = parsed.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      model: modelSpec.id,
      created_at: createdAt,
      message: {
        role: 'assistant',
        content: contentText
      },
      done: true,
      done_reason: 'stop',
      total_duration: 190000000,
      load_duration: 1600000,
      prompt_eval_count: parsed.usage?.prompt_tokens || 20,
      eval_count: parsed.usage?.completion_tokens || 60
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Galx-Model-Resolved': modelSpec.id
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal error processing Ollama chat request' },
      { status: 500 }
    );
  }
}
