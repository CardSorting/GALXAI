import { NextRequest, NextResponse } from 'next/server';
import { galxRouter } from '@/core/router/GalxModelRouter';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import type { ImageGenerationRequest } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Galx-Async, X-Galx-Queue, X-Galx-Webhook-Url, X-Galx-Priority, X-Galx-Delay-Ms, Idempotency-Key, Prefer'
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

    // Asynchronous Queue Processing
    const isAsync = req.headers.get('x-galx-async') === 'true' || req.headers.get('prefer') === 'respond-async';
    if (isAsync) {
      const targetQueue = req.headers.get('x-galx-queue') || 'image-gen';
      const webhookUrl = req.headers.get('x-galx-webhook-url') || undefined;
      const idempotencyKey = req.headers.get('idempotency-key') || undefined;
      const priorityHeader = req.headers.get('x-galx-priority');
      const priority = priorityHeader ? parseInt(priorityHeader, 10) : 50;
      const delayHeader = req.headers.get('x-galx-delay-ms');
      const delayMs = delayHeader ? parseInt(delayHeader, 10) : undefined;

      const queueEngine = GalxTaskQueueEngine.getInstance();
      const { task, deduplicated } = queueEngine.createTask({
        queueId: targetQueue,
        userId,
        idempotencyKey,
        priority,
        delayMs,
        target: {
          type: 'INTERNAL_MODEL',
          taskKind: 'image_generation',
          imagePayload: body,
          isPriorityUser,
          webhookCompletionUrl: webhookUrl
        }
      });

      return NextResponse.json(
        {
          id: task.id,
          object: 'image.generation.async',
          status: task.status,
          queue: task.queueId,
          created: Math.floor(task.createdAtMs / 1000),
          task_url: `/api/queues/${task.queueId}/tasks/${task.id}`,
          deduplicated
        },
        {
          status: 202,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Location': `/api/queues/${task.queueId}/tasks/${task.id}`,
            'X-Galx-Task-Id': task.id,
            'X-Galx-Queue-Id': task.queueId
          }
        }
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
