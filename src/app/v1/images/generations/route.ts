import { NextRequest } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxSeatTierEngine } from '@/core/subscription/GalxSeatTierEngine';
import { ImageRequestService, ImageStorageUnavailableError, imageRequestResponse } from '@/lib/images/request-service';
import { ImageAllowanceError } from '@/lib/billing/image-allowance';
import { ImageRequestConflict } from '@/lib/images/request-repository';
import { ImageCapacityError } from '@/core/router/ImageCapacityError';
import { RelayDispatchError } from '@/core/router/adapters/RelayChatTransport';
import type { ImageGenerationRequest } from '@/core/contracts/GalxContracts';
import { imageError, imageHeaders } from '@/lib/security/public-image-http';
import { logImageFailure } from '@/lib/security/private-image-diagnostics';
import { enforceDeveloperApiKeyAccess } from '@/lib/security/developer-access';
import type { ImageFormat } from '@/lib/security/image-artifact';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Prefer, Idempotency-Key, X-Galx-Async, X-Galx-Webhook-Url, X-Galx-Webhook-Secret, X-Galx-Priority, X-Galx-Delay-Ms',
  } });
}

/** Authenticated private-workspace contract. Internal dispatch results must pass private normalization. */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (auth.error === 'AUTH_UNAVAILABLE') return imageError('temporarily_unavailable', requestId, 3);
    if (!auth.authenticated || !auth.userId) return imageError('unauthorized', requestId);
    const developerDenied = await enforceDeveloperApiKeyAccess(req, auth.authType, true);
    if (developerDenied) return developerDenied;
    let raw: Record<string, unknown>;
    try {
      const value = await req.json();
      if (!value || typeof value !== 'object' || Array.isArray(value)) return imageError('invalid_request', requestId);
      raw = value;
    } catch { return imageError('invalid_request', requestId); }
    const prompt = raw.prompt ?? raw.text ?? raw.description ?? raw.input ?? raw.image_prompt;
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 32_000) return imageError('invalid_request', requestId);
    // Model identity and selection are server-side. A human workspace request
    // can ask for the supported image capability, not choose its execution model.
    if (raw.model !== undefined) return imageError('unsupported_input', requestId);
    const format = raw.response_format ?? raw.responseFormat ?? (req.headers.get('accept')?.includes('application/json') ? 'b64_json' : 'binary');
    if (!['binary', 'url', 'b64_json'].includes(String(format))) return imageError('unsupported_input', requestId);
    const outputFormat = raw.output_format;
    if (outputFormat !== undefined && !['png', 'jpeg', 'webp'].includes(String(outputFormat))) return imageError('unsupported_input', requestId);
    if (raw.visibility === 'public' || raw.visibility === 'unlisted' || raw.isPublic === true || raw.publish === true || raw.shareToExplore === true) {
      return imageError('publishing_forbidden', requestId);
    }
    if (raw.visibility !== undefined || raw.isPublic !== undefined || raw.publish !== undefined ||
        raw.shareToExplore !== undefined || raw.stealth !== undefined) return imageError('unsupported_input', requestId);
    const n = raw.n ?? raw.num_images ?? raw.count ?? 1;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 4 || (format === 'binary' && n !== 1)) return imageError('invalid_request', requestId);
    if (raw.quality !== undefined && !['standard', 'hd'].includes(String(raw.quality))) return imageError('unsupported_input', requestId);
    const ratioSizes: Record<string, string> = { '1:1': '1024x1024', '16:9': '1792x1024', '9:16': '1024x1792', '4:3': '1024x768', '3:2': '1536x1024' };
    const size = raw.size ?? ratioSizes[String(raw.aspect_ratio ?? raw.aspectRatio ?? '1:1')];
    if (typeof size !== 'string' || !/^\d{2,4}x\d{2,4}$/.test(size) || size.split('x').some(value => Number(value) > 8192)) return imageError('unsupported_input', requestId);
    const seat = GalxSeatTierEngine.getInstance();
    const entitlement = await seat.resolveUserSeatTier(auth);
    if (entitlement.isCapped) return imageError('rate_limited', requestId, 60);
    const body: ImageGenerationRequest = {
      prompt, model: 'galx-nova-image', n, size, quality: raw.quality === 'hd' ? 'hd' : 'standard',
      response_format: 'b64_json',
      sessionId: typeof raw.session_id === 'string' ? raw.session_id : typeof raw.sessionId === 'string' ? raw.sessionId : 'default',
      idempotencyKey: req.headers.get('idempotency-key') || undefined,
    };
    if (body.idempotencyKey && !/^[\x21-\x7e]{1,128}$/.test(body.idempotencyKey)) return imageError('invalid_request', requestId);
    if ((body.sessionId?.length || 0) > 128) return imageError('invalid_request', requestId);
    const service = ImageRequestService.getInstance();
    if (req.headers.get('x-galx-async') === 'true' || req.headers.get('prefer') === 'respond-async') {
      const task = await service.create(auth.userId, { ...body,
        response_format: format === 'url' ? 'url' : 'b64_json', outputFormat: outputFormat as ImageFormat | undefined },
      { priority: entitlement.isPriorityUser, schedule: true });
      const taskUrl = `/v1/images/requests/${encodeURIComponent(task.id)}`;
      const headers = imageHeaders(requestId, 'application/json');
      headers.set('Location', taskUrl);
      headers.set('Retry-After', '3');
      return new Response(JSON.stringify({ id: task.id, status: 'in_progress', task_url: taskUrl }), { status: 202, headers });
    }
    // Every human call uses a durable receipt whose purchased allowance is
    // reserved in the same transaction before the worker can claim/dispatch.
    const task = await service.create(auth.userId, { ...body,
      response_format: format === 'url' ? 'url' : 'b64_json', outputFormat: outputFormat as ImageFormat | undefined },
    { priority: entitlement.isPriorityUser, schedule: false });
    await service.run(auth.userId, task.id, true);
    const completed = await service.repository.get(auth.userId, task.id);
    if (completed?.state === 'completed') return imageRequestResponse(completed, requestId, format !== 'binary');
    return imageError(completed?.state === 'failed' || completed?.state === 'cancelled' ? 'generation_failed' : 'timeout', requestId);
  } catch (error) {
    logImageFailure(requestId, error);
    if (error instanceof ImageAllowanceError) return imageError(error.code, requestId);
    if (error instanceof ImageRequestConflict) return imageError('idempotency_conflict', requestId);
    if (error instanceof ImageStorageUnavailableError) return imageError('temporarily_unavailable', requestId, 3);
    if (error instanceof ImageCapacityError) return imageError('temporarily_unavailable', requestId, error.retryAfterSeconds);
    const failure = error as { status?: number; code?: string; reason?: string; name?: string };
    if (failure?.status === 429) return imageError('rate_limited', requestId, 5);
    if (failure?.name === 'AbortError' || failure?.name === 'TimeoutError' || failure?.reason === 'image_deadline_or_cancelled' || failure?.status === 504) return imageError('timeout', requestId);
    if (error instanceof RelayDispatchError || [502, 503, 504].includes(failure?.status || 0)) return imageError('temporarily_unavailable', requestId);
    return imageError('generation_failed', requestId);
  }
}
