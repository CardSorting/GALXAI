import type { GalxAI } from './client';
import { decodeImageBase64, sanitizeImageArtifact, type ImageFormat } from '../lib/security/image-artifact';
import { imageBytesResponse, imageError, imageJsonResponse } from '../lib/security/public-image-http';

/** Node server adapters share the same artifact-only response contract. */
export async function serveImageRequest(client: GalxAI, request: Request, defaultModel?: string): Promise<Response> {
  const id = crypto.randomUUID();
  let body;
  try { body = await request.json(); } catch { return imageError('invalid_request', id); }
  if (!body || typeof body.prompt !== 'string' || !body.prompt.trim()) return imageError('invalid_request', id);
  const format = body.response_format ?? body.responseFormat ?? (request.headers.get('accept')?.includes('application/json') ? 'b64_json' : 'binary');
  if (!['binary', 'url', 'b64_json'].includes(format) || (body.output_format !== undefined && !['png', 'jpeg', 'webp'].includes(body.output_format))) return imageError('unsupported_input', id);
  if (format === 'binary' && (body.n ?? 1) !== 1) return imageError('invalid_request', id);
  try {
    const params = { prompt: body.prompt, model: body.model || defaultModel || 'galx-nova-image',
      aspectRatio: body.aspectRatio || body.aspect_ratio, size: body.size, quality: body.quality,
      n: body.n ?? 1, response_format: 'b64_json' as const };
    const result = body.isAsync || body.priority
      ? await (await client.images.generateAsync({ ...params, priority: body.priority })).result()
      : await client.images.generate(params);
    if (!Array.isArray(result.data) || !result.data.length || result.data.length > 4 || (format === 'binary' && result.data.length !== 1)) throw new Error('Invalid image count');
    const artifacts = await Promise.all(result.data.map(item => sanitizeImageArtifact(decodeImageBase64(item.b64_json), body.output_format as ImageFormat | undefined)));
    if (format === 'binary') return imageBytesResponse(artifacts[0], id);
    return imageJsonResponse(artifacts.map(item => format === 'url'
      ? { url: `data:${item.contentType};base64,${item.bytes.toString('base64')}` }
      : { b64_json: item.bytes.toString('base64') }), id);
  } catch (error) {
    const status = (error as { status?: number })?.status;
    return imageError(status === 401 ? 'unauthorized' : status === 429 ? 'rate_limited' : status === 504 ? 'timeout' : 'generation_failed', id);
  }
}
