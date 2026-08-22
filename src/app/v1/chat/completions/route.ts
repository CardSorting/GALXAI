import { NextRequest, NextResponse } from 'next/server';
import { galxRouter } from '@/core/router/GalxModelRouter';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import type { ChatCompletionRequest } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';

// Handle CORS Pre-flight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Galx-Shard-Preference',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Universal OpenAI-Compatible POST /v1/chat/completions Endpoint.
 * Supports both JSON response and real-time Server-Sent Events (SSE) streaming.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const authHeader = req.headers.get('authorization') || '';
    let userId = 'anonymous_developer';
    let isPriorityUser = false;

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token.startsWith('galx_live_')) {
        const hash = GalxCryptoVault.hashApiKey(token);
        const persistence = GalxPersistence.getInstance();
        const foundKey = persistence.getGatewayKeys().find(k => k.keyHash === hash && !k.revoked);
        if (foundKey) {
          userId = foundKey.userId;
          isPriorityUser = true;
          // Update usage asynchronously
          const updatedKey = {
            ...foundKey,
            totalRequests: foundKey.totalRequests + 1,
            lastUsedAtMs: Date.now()
          };
          persistence.saveGatewayKey(updatedKey);
        } else {
          return NextResponse.json(
            { error: { message: 'Invalid or revoked GALXAI Gateway API Key', type: 'invalid_request_error', code: 'invalid_api_key' } },
            { status: 401 }
          );
        }
      } else if (token.startsWith('session_') || token.startsWith('user_')) {
        userId = token;
      }
    }

    // 2. Parse & Validate Body
    const body = (await req.json()) as ChatCompletionRequest;
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: { message: 'Missing required parameter: messages must be a non-empty array', type: 'invalid_request_error' } },
        { status: 400 }
      );
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 3. Route through GALXAI Credential Pool
    const result = await galxRouter.routeChatCompletion({
      request: body,
      userId,
      requestId,
      isPriorityUser
    });

    // 4. Return formatted response with CORS headers
    const headers = new Headers(result.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('X-Galx-Request-Id', requestId);
    headers.set('X-Galx-Shard-Id', result.shardId);
    headers.set('X-Galx-Model', result.modelUsed);
    headers.set('X-Galx-Provider', result.provider);

    return new Response(result.body, {
      status: result.statusCode,
      headers
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          message: error.message || 'Internal Router Error',
          type: 'api_error',
          code: 'router_dispatch_failed'
        }
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}
