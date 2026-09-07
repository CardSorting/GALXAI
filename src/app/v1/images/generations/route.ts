import { RelayDispatchError } from '@/core/router/adapters/RelayChatTransport';
import { ImageCapacityError } from '@/core/router/ImageCapacityError';
import { NextRequest, NextResponse } from 'next/server';
import { galxRouter, GalxModelRouter } from '@/core/router/GalxModelRouter';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { GalxSeatTierEngine } from '@/core/subscription/GalxSeatTierEngine';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import { ModelCatalog } from '@/core/router/ModelCatalog';
import type { ImageGenerationRequest } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Galx-Async, X-Galx-Queue, X-Galx-Webhook-Url, X-Galx-Priority, X-Galx-Delay-Ms, Idempotency-Key, Prefer, X-Galx-Session-Affinity, x-galx-session-affinity',
      'Access-Control-Expose-Headers': 'X-Galx-Session-Affinity, Retry-After'
    }
  });
}

/**
 * Universal OpenAI/Midjourney/Stability-Compatible POST /v1/images/generations Endpoint.
 * Governed seamlessly by sovereign Seat Subscription Tiers with zero frontend key leakage.
 */
export async function POST(req: NextRequest) {
  const requestId = `img_${crypto.randomUUID()}`;
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    const seatEngine = GalxSeatTierEngine.getInstance();
    const entitlement = await seatEngine.resolveUserSeatTier(authResult);

    if (entitlement.isCapped) {
      return NextResponse.json(
        {
          error: {
            message: 'Monthly seat compute quota reached. Please contact your organization administrator to increase limits.',
            type: 'rate_limit_error',
            code: 'seat_spend_cap_exceeded',
            tier: entitlement.tier
          }
        },
        { status: 429, headers: { 'Access-Control-Allow-Origin': '*', 'Retry-After': '60' } }
      );
    }

    const userId = authResult.userId || 'anonymous_developer';
    const isPriorityUser = entitlement.isPriorityUser;

    const rawBody = (await req.json().catch(() => ({}))) as any;
    const promptStr = rawBody.prompt ?? rawBody.text ?? rawBody.description ?? rawBody.input ?? rawBody.image_prompt ?? '';
    const resolvedPrompt = Array.isArray(promptStr) ? promptStr.join(' ') : String(promptStr || 'A futuristic AI landscape');

    // Universal Aspect Ratio & Dimensions Normalizer
    let resolvedSize: any = rawBody.size;
    if (!resolvedSize) {
      if (rawBody.aspect_ratio || rawBody.aspectRatio) {
        const ar = String(rawBody.aspect_ratio || rawBody.aspectRatio).trim();
        if (ar === '16:9' || ar === '16/9') resolvedSize = '1792x1024';
        else if (ar === '9:16' || ar === '9/16') resolvedSize = '1024x1792';
        else if (ar === '4:3' || ar === '4/3') resolvedSize = '1024x768';
        else if (ar === '3:2' || ar === '3/2') resolvedSize = '1536x1024';
        else if (ar === '1:1') resolvedSize = '1024x1024';
        else resolvedSize = '1024x1024';
      } else if (rawBody.width && rawBody.height) {
        resolvedSize = `${rawBody.width}x${rawBody.height}`;
      } else {
        resolvedSize = '1024x1024';
      }
    }

    // Resolve model alias
    const requestedModel = rawBody.model || 'openai-gpt-image-2';
    const resolvedModelSpec = ModelCatalog.resolveModel(requestedModel);
    const resolvedModelId = resolvedModelSpec.category === 'image' ? resolvedModelSpec.id : 'openai-gpt-image-2';

    const sessionId =
      req.headers.get('x-galx-session-id') ||
      req.headers.get('x-session-id') ||
      rawBody.session_id ||
      rawBody.sessionId ||
      'default';

    const idempotencyKey =
      req.headers.get('idempotency-key') ||
      rawBody.idempotency_key ||
      rawBody.idempotencyKey ||
      undefined;

    const body: ImageGenerationRequest = {
      prompt: resolvedPrompt,
      model: resolvedModelId,
      n: Number(rawBody.n || rawBody.num_images || rawBody.count || rawBody.batch_size || 1),
      size: resolvedSize,
      quality: rawBody.quality || 'standard',
      response_format: rawBody.response_format || rawBody.responseFormat || rawBody.format || 'url',
      user: rawBody.user,
      sessionId,
      idempotencyKey
    };

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

    const result = await galxRouter.routeImageGeneration({
      request: body,
      userId,
      requestId,
      isPriorityUser,
      headers: req.headers,
      signal: req.signal
    });

    const currentWindows = seatEngine.calculateRollingWindows(userId, entitlement.tier);

    const resHeaders: Record<string, string> = {
      'X-Request-Id': requestId,
      'X-Galx-Request-Id': requestId,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'X-Galx-Session-Affinity, Retry-After, X-Request-Id, X-Galx-Request-Id',
      'X-Galx-ZDR-Verified': 'true',
      'X-Galx-ZDR-Retention': '0s',
      'X-Galx-AI-Generated': 'true',
      'X-Galx-Seat-Tier': entitlement.tier,
      'X-Galx-Seat-Role': entitlement.role,
      'X-Galx-Seat-5Hour-Remaining-Pct': String(currentWindows.fiveHourWindow.percentRemaining),
      'X-Galx-Seat-5Hour-Refresh-In': currentWindows.fiveHourWindow.refreshIn,
      'X-Galx-Seat-Weekly-Remaining-Pct': String(currentWindows.weeklyWindow.percentRemaining),
      'X-Galx-Seat-Weekly-Refresh-In': currentWindows.weeklyWindow.refreshIn
    };
    if (result.execution) {
      resHeaders['X-Galx-Execution-Model'] = result.execution.executionModel;
      resHeaders['X-Galx-Routing-Mode'] = result.execution.routingMode;
      resHeaders['Access-Control-Expose-Headers'] += ', X-Galx-Execution-Model, X-Galx-Routing-Mode';
    }
    if (result.shardId) {
      const affinityTicket = GalxCryptoVault.sealAffinityTicket(result.shardId);
      resHeaders['X-Galx-Session-Affinity'] = affinityTicket;
      resHeaders['Set-Cookie'] = `galx_session_affinity=${encodeURIComponent(affinityTicket)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400`;
    }

    return NextResponse.json(result, {
      headers: resHeaders
    });
  } catch (error: any) {
    if (error instanceof ImageCapacityError) {
      return NextResponse.json({ error: {
        message: error.message, type: 'service_unavailable_error', code: error.code,
        request_id: requestId, retry_after_seconds: error.retryAfterSeconds
      } }, { status: error.status, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Retry-After, X-Request-Id, X-Galx-Request-Id',
        'Retry-After': String(error.retryAfterSeconds),
        'X-Should-Retry': 'true',
        'X-Request-Id': requestId,
        'X-Galx-Request-Id': requestId
      } });
    }
    const rawMessage = error.message || 'Image Generation Failed';
    const message = GalxModelRouter.sanitizeUpstreamError(rawMessage);
    const isRateLimited =
      rawMessage.includes('maximum simultaneous') ||
      rawMessage.includes('Rate limit') ||
      rawMessage.includes('capacity_constrained') ||
      rawMessage.includes('temporarily constrained') ||
      rawMessage.includes('shards available') ||
      rawMessage.includes('pool_exhausted');
    const isUnavailable =
      error instanceof RelayDispatchError ||
      rawMessage.includes('No healthy') ||
      rawMessage.includes('in cooldown') ||
      rawMessage.includes('saturated') ||
      rawMessage.includes('all_shards_cooldown');
    const isBadRequest = rawMessage.includes('Unsupported image model') || rawMessage.includes('Missing required');

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
          code: error instanceof RelayDispatchError ? error.code : isRateLimited ? 'capacity_constrained' : isUnavailable ? 'capacity_saturated' : 'image_generation_failed'
        }
      },
      {
        status,
        headers: {
          // A timeout after dispatch may already have generated an image.
          // Do not let an SDK's default 5xx retries duplicate that work.
          'X-Should-Retry': 'false',
          'X-Request-Id': requestId,
          'X-Galx-Request-Id': requestId,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Retry-After, X-Request-Id, X-Galx-Request-Id, X-Galx-Session-Affinity',
          ...(isRateLimited
            ? {
                'Retry-After': '5'
              }
            : {})
        }
      }
    );
  }
}
