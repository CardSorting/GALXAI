import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { galxRouter, GalxModelRouter } from '@/core/router/GalxModelRouter';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import type { ChatCompletionRequest } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Handle CORS Pre-flight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-beta, x-galx-session-affinity, X-Galx-Session-Affinity',
      'Access-Control-Expose-Headers': 'X-Galx-Session-Affinity, X-Galx-Model-Resolved, Retry-After',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Universal Anthropic-Compatible POST /v1/messages Endpoint.
 * Allows Anthropic SDK, Claude Code, Windsurf, and Cursor to point directly to GALXAI.
 * Supports tool calling (input_schema <-> JSON Schema), thinking blocks, and SSE streaming.
 */
async function previewPOST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    if (!authResult.authenticated) {
      return NextResponse.json(
        { type: 'error', error: { type: 'authentication_error', message: authResult.error || 'Authentication required. Please provide a valid API key via x-api-key or Authorization header.' } },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const systemPrompt = typeof body.system === 'string' ? body.system : Array.isArray(body.system) ? body.system.map((s: any) => s.text || '').join('\n') : '';
    const anthropicMessages = body.messages || [];

    if (!Array.isArray(anthropicMessages) || anthropicMessages.length === 0) {
      return NextResponse.json(
        { type: 'error', error: { type: 'invalid_request_error', message: 'messages must be a non-empty array' } },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Convert Anthropic messages format to standard ChatCompletionRequest format
    const convertedMessages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: any; tool_call_id?: string; tool_calls?: any[] }> = [];
    if (systemPrompt) {
      convertedMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of anthropicMessages) {
      if (typeof msg.content === 'string') {
        convertedMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      } else if (Array.isArray(msg.content)) {
        const toolResults = msg.content.filter((c: any) => c.type === 'tool_result');
        const toolUses = msg.content.filter((c: any) => c.type === 'tool_use');
        const textBlocks = msg.content.filter((c: any) => c.type === 'text' || !c.type);

        if (toolResults.length > 0) {
          for (const tr of toolResults) {
            convertedMessages.push({
              role: 'tool',
              content: typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content || ''),
              tool_call_id: tr.tool_use_id
            });
          }
        } else if (toolUses.length > 0) {
          const toolCalls = toolUses.map((tu: any) => ({
            id: tu.id,
            type: 'function',
            function: {
              name: tu.name,
              arguments: typeof tu.input === 'string' ? tu.input : JSON.stringify(tu.input || {})
            }
          }));
          convertedMessages.push({
            role: 'assistant',
            content: textBlocks.map((t: any) => t.text || '').join('\n'),
            tool_calls: toolCalls
          });
        } else {
          const contentStr = msg.content.map((c: any) => c.text || JSON.stringify(c)).join('\n');
          convertedMessages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: contentStr
          });
        }
      }
    }

    // Convert Anthropic Tools to standard OpenAI Function Tools
    let tools: any[] | undefined = undefined;
    if (body.tools && Array.isArray(body.tools)) {
      tools = body.tools.map((t: any) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema || t.parameters || {}
        }
      }));
    }

    const requestedModel = body.model || 'galx-nova';
    const isStream = body.stream === true || body.stream === 'true' || body.stream === 1;

    const chatRequest: ChatCompletionRequest = {
      model: requestedModel,
      messages: convertedMessages as any,
      temperature: body.temperature !== undefined ? parseFloat(String(body.temperature)) : 0.7,
      max_tokens: body.max_tokens ?? body.max_completion_tokens ?? 2048,
      stream: isStream,
      tools
    };

    const requestId = `msg_req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Route through GALXAI Credential Fleet with Safe Harbor 18, ZDR & GDPR Safeguards
    const result = await galxRouter.routeChatCompletion({
      request: chatRequest,
      userId: authResult.userId,
      requestId,
      isPriorityUser: authResult.isPriorityUser,
      headers: req.headers
    });

    // Handle Streaming for Anthropic SDK clients
    if (isStream && result.body) {
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const encoder = new TextEncoder();
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      (async () => {
        try {
          // 1. message_start
          await writer.write(encoder.encode(`event: message_start\ndata: ${JSON.stringify({
            type: 'message_start',
            message: {
              id: msgId,
              type: 'message',
              role: 'assistant',
              model: requestedModel,
              content: [],
              stop_reason: null,
              stop_sequence: null,
              usage: { input_tokens: 25, output_tokens: 1 }
            }
          })}\n\n`));

          // 2. content_block_start
          await writer.write(encoder.encode(`event: content_block_start\ndata: ${JSON.stringify({
            type: 'content_block_start',
            index: 0,
            content_block: { type: 'text', text: '' }
          })}\n\n`));

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
                    await writer.write(encoder.encode(`event: content_block_delta\ndata: ${JSON.stringify({
                      type: 'content_block_delta',
                      index: 0,
                      delta: { type: 'text_delta', text: deltaText }
                    })}\n\n`));
                  }
                } catch {}
              }
            }
          } else if (typeof result.body === 'string') {
            const parsed = JSON.parse(result.body);
            const contentText = parsed.choices?.[0]?.message?.content || '';
            await writer.write(encoder.encode(`event: content_block_delta\ndata: ${JSON.stringify({
              type: 'content_block_delta',
              index: 0,
              delta: { type: 'text_delta', text: contentText }
            })}\n\n`));
          }

          // 3. content_block_stop
          await writer.write(encoder.encode(`event: content_block_stop\ndata: ${JSON.stringify({
            type: 'content_block_stop',
            index: 0
          })}\n\n`));

          // 4. message_delta
          await writer.write(encoder.encode(`event: message_delta\ndata: ${JSON.stringify({
            type: 'message_delta',
            delta: { stop_reason: 'end_turn', stop_sequence: null },
            usage: { output_tokens: 50 }
          })}\n\n`));

          // 5. message_stop
          await writer.write(encoder.encode(`event: message_stop\ndata: ${JSON.stringify({
            type: 'message_stop'
          })}\n\n`));

          await writer.close();
        } catch (streamErr) {
          try {
            await writer.abort(streamErr);
          } catch {}
        }
      })();

      const streamHeaders: Record<string, string> = {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Galx-Model-Resolved': requestedModel,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'X-Galx-Session-Affinity, X-Galx-Model-Resolved, Retry-After'
      };
      if (result.shardId) {
        const affinityTicket = GalxCryptoVault.sealAffinityTicket(result.shardId);
        streamHeaders['X-Galx-Session-Affinity'] = affinityTicket;
        streamHeaders['Set-Cookie'] = `galx_session_affinity=${encodeURIComponent(affinityTicket)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400`;
      }

      return new Response(readable, {
        headers: streamHeaders
      });
    }

    // Non-Streaming response
    const parsed = typeof result.body === 'string' ? JSON.parse(result.body) : {};
    const firstChoice = parsed.choices?.[0];
    const messageObj = firstChoice?.message || {};
    const contentBlocks: any[] = [];

    if (messageObj.reasoning_content || messageObj.reasoning) {
      contentBlocks.push({
        type: 'thinking',
        thinking: messageObj.reasoning_content || messageObj.reasoning
      });
    }

    if (messageObj.content) {
      contentBlocks.push({
        type: 'text',
        text: messageObj.content
      });
    }

    let stopReason = 'end_turn';
    if (messageObj.tool_calls && Array.isArray(messageObj.tool_calls) && messageObj.tool_calls.length > 0) {
      stopReason = 'tool_use';
      for (const tc of messageObj.tool_calls) {
        let parsedInput = {};
        try {
          parsedInput = typeof tc.function?.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function?.arguments || {};
        } catch {}
        contentBlocks.push({
          type: 'tool_use',
          id: tc.id || `tool_${Date.now()}`,
          name: tc.function?.name || '',
          input: parsedInput
        });
      }
    }

    if (contentBlocks.length === 0) {
      contentBlocks.push({ type: 'text', text: '' });
    }

    const resHeaders: Record<string, string> = {
      'X-Galx-Model-Resolved': requestedModel,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'X-Galx-Session-Affinity, X-Galx-Model-Resolved, Retry-After'
    };
    if (result.shardId) {
      const affinityTicket = GalxCryptoVault.sealAffinityTicket(result.shardId);
      resHeaders['X-Galx-Session-Affinity'] = affinityTicket;
      resHeaders['Set-Cookie'] = `galx_session_affinity=${encodeURIComponent(affinityTicket)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400`;
    }

    return NextResponse.json({
      id: `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      model: requestedModel,
      content: contentBlocks,
      stop_reason: stopReason,
      usage: {
        input_tokens: parsed.usage?.prompt_tokens || 30,
        output_tokens: parsed.usage?.completion_tokens || 80
      }
    }, {
      headers: resHeaders
    });
  } catch (err: any) {
    const rawMessage = err?.message || 'Internal server error';
    const safeError = GalxModelRouter.sanitizeUpstreamError(rawMessage);
    const isRateOrCapacity =
      err.status === 429 ||
      err.code === 'capacity_constrained' ||
      rawMessage.includes('capacity_constrained') ||
      rawMessage.includes('temporarily constrained') ||
      rawMessage.includes('temporarily saturated') ||
      rawMessage.includes('rate limit') ||
      rawMessage.includes('pool_exhausted') ||
      rawMessage.includes('429');

    if (isRateOrCapacity) {
      return NextResponse.json(
        { type: 'error', error: { type: 'rate_limit_error', message: safeError } },
        {
          status: 429,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'Retry-After, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, X-RateLimit-Reset, X-Galx-Request-Id, X-Galx-Session-Affinity',
            'Retry-After': '2',
            'RateLimit-Limit': '60',
            'RateLimit-Remaining': '0',
            'RateLimit-Reset': '2',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 2)
          }
        }
      );
    }

    return NextResponse.json(
      { type: 'error', error: { type: 'api_error', message: safeError } },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

/**
 * Universal GET /v1/messages Endpoint.
 * Allows instant testing of Anthropic-compatible endpoint via browser or URL query parameters:
 * e.g. /v1/messages?prompt=Hello&model=claude-3-7-sonnet
 */
async function previewGET(req: NextRequest) {
  const url = new URL(req.url);
  const prompt = url.searchParams.get('prompt') || url.searchParams.get('q') || url.searchParams.get('message') || url.searchParams.get('input') || 'Hello Claude';
  const model = url.searchParams.get('model') || 'claude-3-7-sonnet';
  const stream = url.searchParams.get('stream') === 'true';

  const syntheticReq = new NextRequest(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream
    })
  });

  return previewPOST(syntheticReq);
}

export const POST = withDeveloperAccess(previewPOST);
export const GET = withDeveloperAccess(previewGET);
