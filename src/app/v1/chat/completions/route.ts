import { NextRequest, NextResponse } from 'next/server';
import { galxRouter } from '@/core/router/GalxModelRouter';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import type { ChatCompletionRequest } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';

// Handle CORS Pre-flight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Galx-Shard-Preference, X-Galx-Async, X-Galx-Queue, X-Galx-Webhook-Url, X-Galx-Priority, X-Galx-Delay-Ms, Idempotency-Key, Prefer',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * Universal OpenAI-Compatible POST /v1/chat/completions Endpoint.
 * Supports synchronous streaming/JSON and asynchronous CloudTasks queue execution.
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

    // 3. Asynchronous Queue Processing (CloudTasks / CloudRun pattern)
    const isAsync = req.headers.get('x-galx-async') === 'true' || req.headers.get('prefer') === 'respond-async';
    if (isAsync) {
      const targetQueue = req.headers.get('x-galx-queue') || 'llm-batch';
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
          taskKind: 'chat_completion',
          chatPayload: body,
          isPriorityUser,
          webhookCompletionUrl: webhookUrl
        }
      });

      return NextResponse.json(
        {
          id: task.id,
          object: 'chat.completion.async',
          status: task.status,
          queue: task.queueId,
          created: Math.floor(task.createdAtMs / 1000),
          model: body.model,
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

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 4. Synchronous Route through GALXAI Credential Pool
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
    const message = error.message || 'Internal Router Error';
    const isRateLimited = message.includes('reached maximum simultaneous concurrent gateway allocation');
    const isUnavailable = message.includes('No healthy') || message.includes('in cooldown') || message.includes('saturated');
    const isBadRequest = message.includes('Unsupported model') || message.includes('Missing required');

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
          code: isRateLimited ? 'rate_limit_exceeded' : isUnavailable ? 'all_shards_cooldown' : 'router_dispatch_failed'
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
