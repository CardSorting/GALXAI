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

    const apiKeyHeader = req.headers.get('x-api-key') || req.headers.get('authorization');
    if (!authResult.authenticated && apiKeyHeader) {
      return NextResponse.json(
        { type: 'error', error: { type: 'authentication_error', message: authResult.error || 'Invalid API credentials' } },
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

    const mappedModel = (body.model || 'claude-3-7-sonnet').includes('claude') ? body.model : 'claude-3-7-sonnet';
    const isStream = !!body.stream;

    const chatRequest: ChatCompletionRequest = {
      model: mappedModel,
      messages: convertedMessages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 2048,
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

    const parsed = typeof result.body === 'string' ? JSON.parse(result.body) : {};
    const contentText = parsed.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      id: `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      model: mappedModel,
      content: [{ type: 'text', text: contentText }],
      stop_reason: 'end_turn',
      usage: {
        input_tokens: parsed.usage?.prompt_tokens || 30,
        output_tokens: parsed.usage?.completion_tokens || 80
      }
    }, {
      headers: {
        'X-Galx-Model-Resolved': mappedModel,
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
