import { NextRequest, NextResponse } from 'next/server';
import { galxRouter } from '@/core/router/GalxModelRouter';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import { ModelCatalog } from '@/core/router/ModelCatalog';
import type { ImageGenerationRequest } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
 * Universal OpenAI/Midjourney/Stability-Compatible POST /v1/images/generations Endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: { message: authResult.error || 'Authentication required. Please provide a valid Authorization header with Bearer token or API key.', type: 'invalid_request_error', code: 'invalid_api_key' } },
        { status: 401 }
      );
    }

    const userId = authResult.userId;
    const isPriorityUser = authResult.isPriorityUser;

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

    const body: ImageGenerationRequest = {
      prompt: resolvedPrompt,
      model: resolvedModelId,
      n: Number(rawBody.n || rawBody.num_images || rawBody.count || rawBody.batch_size || 1),
      size: resolvedSize,
      quality: rawBody.quality || 'standard',
      response_format: rawBody.response_format || rawBody.responseFormat || rawBody.format || 'url',
      user: rawBody.user
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

    const requestId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const result = await galxRouter.routeImageGeneration({
      request: body,
      userId,
      requestId,
      isPriorityUser,
      headers: req.headers
    });

    return NextResponse.json(result, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Galx-ZDR-Verified': 'true',
        'X-Galx-ZDR-Retention': '0s',
        'X-Galx-AI-Generated': 'true'
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
