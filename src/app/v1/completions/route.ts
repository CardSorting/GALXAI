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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, X-Galx-Shard-Preference',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Universal Legacy OpenAI POST /v1/completions Endpoint.
 * Ingests prompt-based completion requests from legacy Python and Node.js SDKs.
 */
export async function POST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: { message: authResult.error || 'Authentication required.', type: 'invalid_request_error', code: 'invalid_api_key' } },
        { status: 401 }
      );
    }

    const rawBody = (await req.json().catch(() => ({}))) as any;
    const requestedModel = rawBody.model || 'gpt-5.6-sol';
    const modelSpec = ModelCatalog.resolveModel(requestedModel);
    const promptStr = rawBody.prompt ?? rawBody.input ?? rawBody.text ?? 'Hello';
    const promptArray = Array.isArray(promptStr) ? promptStr.join('\n') : String(promptStr);

    const chatRequest: ChatCompletionRequest = {
      model: modelSpec.id,
      messages: [{ role: 'user', content: promptArray }],
      temperature: rawBody.temperature !== undefined ? parseFloat(String(rawBody.temperature)) : 0.7,
      max_tokens: rawBody.max_tokens ?? rawBody.max_completion_tokens ?? 2048,
      stream: false
    };

    const requestId = `cmpl_req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const result = await galxRouter.routeChatCompletion({
      request: chatRequest,
      userId: authResult.userId,
      requestId,
      isPriorityUser: authResult.isPriorityUser,
      headers: req.headers
    });

    const parsed = typeof result.body === 'string' ? JSON.parse(result.body) : {};
    const textOutput = parsed.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      id: `cmpl-${Date.now()}`,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: modelSpec.id,
      choices: [
        {
          text: textOutput,
          index: 0,
          logprobs: null,
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: parsed.usage?.prompt_tokens || 20,
        completion_tokens: parsed.usage?.completion_tokens || 50,
        total_tokens: (parsed.usage?.prompt_tokens || 20) + (parsed.usage?.completion_tokens || 50)
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Galx-Model-Resolved': modelSpec.id,
        'X-Galx-Shard-Id': result.shardId
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || 'Internal completion error', type: 'api_error' } },
      { status: 500 }
    );
  }
}
