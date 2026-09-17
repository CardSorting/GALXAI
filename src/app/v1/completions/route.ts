import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { galxRouter, GalxModelRouter } from '@/core/router/GalxModelRouter';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-galx-session-affinity, X-Galx-Session-Affinity',
      'Access-Control-Expose-Headers': 'X-Galx-Session-Affinity, X-Galx-Model-Resolved, Retry-After',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Universal Legacy OpenAI POST /v1/completions Endpoint.
 * Ingests prompt-based completion requests from legacy Python and Node.js SDKs.
 */
async function previewPOST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: { message: authResult.error || 'Authentication required.', type: 'invalid_request_error', code: 'invalid_api_key' } },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const rawBody = (await req.json().catch(() => ({}))) as any;
    const requestedModel = rawBody.model || 'galx-nova';
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

    const resHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'X-Galx-Session-Affinity, X-Galx-Model-Resolved, Retry-After',
      'X-Galx-Model-Resolved': modelSpec.id
    };
    if (result.shardId) {
      const affinityTicket = GalxCryptoVault.sealAffinityTicket(result.shardId);
      resHeaders['X-Galx-Session-Affinity'] = affinityTicket;
      resHeaders['Set-Cookie'] = `galx_session_affinity=${encodeURIComponent(affinityTicket)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400`;
    }

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
      headers: resHeaders
    });
  } catch (err: any) {
    const rawMessage = err?.message || 'Internal completion error';
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
        {
          error: {
            message: safeError,
            type: 'rate_limit_error',
            code: 'capacity_constrained'
          }
        },
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
      { error: { message: safeError, type: 'api_error' } },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export const POST = withDeveloperAccess(previewPOST);
