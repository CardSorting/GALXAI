import { NextRequest, NextResponse } from 'next/server';
import { galxRouter } from '@/core/router/GalxModelRouter';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { ModelCatalog } from '@/core/router/ModelCatalog';
import type { ChatCompletionRequest } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
 * Native Ollama-Compatible POST /api/generate Endpoint.
 * Allows OpenWebUI, Continue.dev, Ollama CLI, and Aider to connect directly to GALXAI.
 */
export async function POST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    let rawBody: any = {};
    try {
      const text = await req.text();
      if (!text || text.trim() === '') {
        rawBody = { prompt: 'Hello' };
      } else {
        try {
          rawBody = JSON.parse(text);
        } catch {
          rawBody = { prompt: text.trim() };
        }
      }
    } catch {
      rawBody = { prompt: 'Hello' };
    }
    const requestedModel = rawBody.model || 'gpt-5.6-sol';
    const modelSpec = ModelCatalog.resolveModel(requestedModel);
    const promptStr = rawBody.prompt ?? rawBody.input ?? rawBody.text ?? 'Hello';
    const isStream = rawBody.stream !== false; // Ollama defaults stream to true

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (rawBody.system) {
      messages.push({ role: 'system', content: String(rawBody.system) });
    }
    messages.push({ role: 'user', content: String(promptStr) });

    const chatRequest: ChatCompletionRequest = {
      model: modelSpec.id,
      messages: messages as any,
      temperature: rawBody.options?.temperature ?? 0.7,
      max_tokens: rawBody.options?.num_predict ?? 2048,
      stream: isStream
    };

    const requestId = `ollama_gen_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const result = await galxRouter.routeChatCompletion({
      request: chatRequest,
      userId: authResult.userId || 'ollama_user',
      requestId,
      isPriorityUser: authResult.isPriorityUser,
      headers: req.headers
    });

    const createdAt = new Date().toISOString();

    // Streaming NDJSON for Ollama clients
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
                      response: deltaText,
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
              response: contentText,
              done: false
            };
            await writer.write(encoder.encode(JSON.stringify(ollamaChunk) + '\n'));
          }

          // Final completion chunk
          const finalChunk = {
            model: modelSpec.id,
            created_at: createdAt,
            response: '',
            done: true,
            done_reason: 'stop',
            total_duration: 125000000,
            load_duration: 1200000,
            prompt_eval_count: 24,
            eval_count: 68
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
      response: contentText,
      done: true,
      done_reason: 'stop',
      total_duration: 180000000,
      load_duration: 1500000,
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
      { error: err.message || 'Internal error processing Ollama generate request' },
      { status: 500 }
    );
  }
}

/**
 * Universal GET /api/generate Endpoint.
 * Allows instant browser address bar queries: /api/generate?prompt=Hello&model=sol
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const prompt = url.searchParams.get('prompt') || url.searchParams.get('q') || url.searchParams.get('input') || 'Hello';
  const model = url.searchParams.get('model') || 'gpt-5.6-sol';
  const stream = url.searchParams.get('stream') !== 'false';

  const syntheticReq = new NextRequest(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({ model, prompt, stream })
  });

  return POST(syntheticReq);
}
