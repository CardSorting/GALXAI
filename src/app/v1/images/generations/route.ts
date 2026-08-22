import { NextRequest, NextResponse } from 'next/server';
import { galxRouter } from '@/core/router/GalxModelRouter';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import type { ImageGenerationRequest } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * Universal OpenAI-Compatible POST /v1/images/generations Endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    let userId = 'anonymous_developer';
    let isPriorityUser = false;

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token.startsWith('galx_live_')) {
        const hash = GalxCryptoVault.hashApiKey(token);
        const foundKey = GalxPersistence.getInstance().getGatewayKeys().find(k => k.keyHash === hash && !k.revoked);
        if (foundKey) {
          userId = foundKey.userId;
          isPriorityUser = true;
        }
      } else if (token.startsWith('session_') || token.startsWith('user_')) {
        userId = token;
      }
    }

    const body = (await req.json()) as ImageGenerationRequest;
    if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
      return NextResponse.json(
        { error: { message: 'Missing required parameter: prompt', type: 'invalid_request_error' } },
        { status: 400 }
      );
    }

    const requestId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const result = await galxRouter.routeImageGeneration({
      request: body,
      userId,
      requestId,
      isPriorityUser
    });

    return NextResponse.json(result, {
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    const message = error.message || 'Image Generation Failed';
    const isRateLimited = message.includes('reached maximum simultaneous concurrent gateway allocation');
    const isUnavailable = message.includes('No healthy') || message.includes('in cooldown') || message.includes('saturated');
    const isBadRequest = message.includes('Unsupported image model') || message.includes('Missing required');

    const status = isRateLimited ? 429 : isUnavailable ? 503 : isBadRequest ? 400 : 500;
    const errorType = isRateLimited
      ? 'rate_limit_error'
      : isUnavailable
      ? 'service_unavailable_error'
      : isBadRequest
      ? 'invalid_request_error'
      : 'api_error';

    return NextResponse.json(
      {
        error: {
          message,
          type: errorType,
          code: isRateLimited ? 'rate_limit_exceeded' : isUnavailable ? 'all_shards_cooldown' : 'image_generation_failed'
        }
      },
      {
        status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          ...(isRateLimited ? { 'Retry-After': '1' } : {})
        }
      }
    );
  }
}
