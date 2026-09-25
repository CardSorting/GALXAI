import type { PublicImageArtifact } from './image-artifact';

export type PublicImageErrorCode = 'generation_not_started' | 'free_generation_paused' | 'free_generation_busy' | 'free_quota_exhausted' | 'image_plan_required' | 'image_allowance_exhausted' | 'image_allowance_unavailable' | 'publishing_forbidden' | 'invalid_request' | 'unauthorized' | 'rate_limited' | 'generation_failed' | 'unsupported_input' | 'timeout' | 'temporarily_unavailable' | 'not_found' | 'idempotency_conflict';
const errors: Record<PublicImageErrorCode, { status: number; message: string }> = {
  generation_not_started: { status: 503, message: 'Your image generation did not start. Please try again shortly.' },
  free_generation_paused: { status: 429, message: 'Private image creation is temporarily unavailable. Try again later.' },
  free_generation_busy: { status: 429, message: 'Private image creation is temporarily unavailable. Try again later.' },
  free_quota_exhausted: { status: 402, message: 'Creation allowance exhausted. Review your image plan to continue private creation.' },
  image_plan_required: { status: 402, message: 'A paid GALX Images tier is required for private creation.' },
  image_allowance_exhausted: { status: 402, message: 'Creation allowance exhausted. Review your plan to continue private creation.' },
  image_allowance_unavailable: { status: 503, message: 'Your creation allowance is temporarily unavailable. No image request was dispatched.' },
  publishing_forbidden: { status: 403, message: 'Human accounts cannot publish Works to GALX.' },
  invalid_request: { status: 400, message: 'Check the image request and try again.' },
  idempotency_conflict: { status: 409, message: 'This retry key was used for a different request. Check the original request before starting another.' },
  unauthorized: { status: 401, message: 'Sign in to use private creation.' },
  rate_limited: { status: 429, message: 'Your request limit has been reached. Try again later.' },
  generation_failed: { status: 502, message: 'The image could not be generated. Contact support with the request ID if this continues.' },
  unsupported_input: { status: 400, message: 'The requested input or output format is not supported.' },
  timeout: { status: 504, message: 'The request timed out. Check its status before submitting again.' },
  temporarily_unavailable: { status: 503, message: 'Image generation is temporarily unavailable. Try again later.' },
  not_found: { status: 404, message: 'The image or request was not found.' },
};

export function imageHeaders(requestId: string, contentType: string): Headers {
  return new Headers({
    'Content-Type': contentType, 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff', 'X-Request-Id': requestId,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'X-Request-Id, Retry-After, Location, X-Should-Retry',
  });
}
export function imageError(code: PublicImageErrorCode, requestId: string, retryAfter?: number): Response {
  const { status, message } = errors[code];
  const headers = imageHeaders(requestId, 'application/json');
  // Retain the SDK retry veto: ambiguous generation must not be duplicated automatically.
  headers.set('X-Should-Retry', 'false');
  if (retryAfter && Number.isFinite(retryAfter)) headers.set('Retry-After', String(Math.max(1, Math.min(3600, Math.ceil(retryAfter)))));
  return new Response(JSON.stringify({ error: { code, message, request_id: requestId } }), { status, headers });
}
export function imageBytesResponse(artifact: PublicImageArtifact, requestId: string): Response {
  return new Response(new Uint8Array(artifact.bytes), { status: 200, headers: imageHeaders(requestId, artifact.contentType) });
}

/** Receives only normalized artifacts and public download URLs, never an upstream result. */
export function imageJsonResponse(images: Array<{ b64_json: string } | { url: string }>, requestId: string, created = Math.floor(Date.now() / 1000)): Response {
  const data = images.map(item => 'b64_json' in item ? { b64_json: item.b64_json } : { url: item.url });
  return new Response(JSON.stringify({ created, data }), { status: 200, headers: imageHeaders(requestId, 'application/json') });
}
