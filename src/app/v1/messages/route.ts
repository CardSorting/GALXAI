import { NextRequest, NextResponse } from 'next/server';
import { galxRouter } from '@/core/router/GalxModelRouter';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import type { ChatCompletionRequest } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';

// Handle CORS Pre-flight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-beta, X-Galx-Shard-Preference',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Universal Anthropic-Compatible POST /v1/messages Endpoint.
 * Allows Anthropic SDK, Claude Code, and Windsurf to point directly to GALXAI.
 */
export async function POST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    if (!authResult.authenticated) {
      return NextResponse.json(
        { type: 'error', error: { type: 'authentication_error', message: authResult.error || 'Authentication required. Please provide a valid API key via x-api-key or Authorization header.' } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const systemPrompt = typeof body.system === 'string' ? body.system : Array.isArray(body.system) ? body.system.map((s: any) => s.text || '').join('\n') : '';
    const anthropicMessages = body.messages || [];

    if (!Array.isArray(anthropicMessages) || anthropicMessages.length === 0) {
      return NextResponse.json(
        { type: 'error', error: { type: 'invalid_request_error', message: 'messages must be a non-empty array' } },
        { status: 400 }
      );
    }

    // Convert Anthropic messages format to standard ChatCompletionRequest format
    const convertedMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (systemPrompt) {
      convertedMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of anthropicMessages) {
      let contentStr = '';
      if (typeof msg.content === 'string') {
        contentStr = msg.content;
      } else if (Array.isArray(msg.content)) {
        contentStr = msg.content.map((c: any) => c.text || JSON.stringify(c)).join('\n');
      }
      convertedMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: contentStr
      });
    }

    const requestedModel = body.model || 'claude-3-7-sonnet';
    const isStream = body.stream === true || body.stream === 'true' || body.stream === 1;

    const chatRequest: ChatCompletionRequest = {
      model: requestedModel,
      messages: convertedMessages as any,
      temperature: body.temperature !== undefined ? parseFloat(String(body.temperature)) : 0.7,
      max_tokens: body.max_tokens ?? body.max_completion_tokens ?? 2048,
      stream: isStream
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

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Galx-Model-Resolved': requestedModel,
          'X-Galx-Shard-Id': result.shardId,
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Non-Streaming response
    const parsed = typeof result.body === 'string' ? JSON.parse(result.body) : {};
    const contentText = parsed.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      id: `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      model: requestedModel,
      content: [{ type: 'text', text: contentText }],
      stop_reason: 'end_turn',
      usage: {
        input_tokens: parsed.usage?.prompt_tokens || 30,
        output_tokens: parsed.usage?.completion_tokens || 80
      }
    }, {
      headers: {
        'X-Galx-Model-Resolved': requestedModel,
        'X-Galx-Shard-Id': result.shardId,
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { type: 'error', error: { type: 'api_error', message: err.message || 'Internal server error' } },
      { status: 500 }
    );
  }
}
