import { NextRequest } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { ImageRequestService, imageRequestResponse, imageRequestSnapshot } from '@/lib/images/request-service';
import { imageError, imageHeaders } from '@/lib/security/public-image-http';
import { logImageFailure } from '@/lib/security/private-image-diagnostics';
import { enforceDeveloperApiKeyAccess } from '@/lib/security/developer-access';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (auth.error === 'AUTH_UNAVAILABLE') return imageError('temporarily_unavailable', requestId, 3);
    if (!auth.authenticated || !auth.userId) return imageError('unauthorized', requestId);
    const developerDenied = await enforceDeveloperApiKeyAccess(req, auth.authType);
    if (developerDenied) return developerDenied;
    const service = ImageRequestService.getInstance();
    const task = await service.repository.get(auth.userId,(await params).id);
    if (!task || task.user_id !== auth.userId) return imageError('not_found', requestId);
    service.resume(task);
    if (req.nextUrl.searchParams.get('snapshot') === 'true') {
      return new Response(JSON.stringify({ task: await imageRequestSnapshot(task) }), { headers: imageHeaders(requestId, 'application/json') });
    }
    if (task.state === 'failed' && task.failure_code === 'generation_not_started') return imageError('generation_not_started', requestId, 5);
    if (task.state === 'failed' || task.state === 'cancelled') return imageError('generation_failed', requestId);
    if (task.state !== 'completed') {
      const headers = imageHeaders(requestId, 'application/json'); headers.set('Retry-After', '3');
      return new Response(JSON.stringify({ id: task.id, status: task.state }), { status: 202, headers });
    }
    return await imageRequestResponse(task,requestId,Boolean(req.headers.get('accept')?.includes('application/json')));
  } catch (error) { logImageFailure(requestId, error); return imageError('temporarily_unavailable', requestId, 3); }
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (auth.error === 'AUTH_UNAVAILABLE') return imageError('temporarily_unavailable', requestId, 3);
    if (!auth.authenticated || !auth.userId) return imageError('unauthorized', requestId);
    const developerDenied = await enforceDeveloperApiKeyAccess(req, auth.authType);
    if (developerDenied) return developerDenied;
    const service = ImageRequestService.getInstance();
    const task = await service.repository.get(auth.userId,(await params).id);
    if (!task || task.user_id !== auth.userId) return imageError('not_found', requestId);
    return new Response(JSON.stringify({ id: task.id, cancelled: await service.repository.cancel(auth.userId,task.id) }), { headers: imageHeaders(requestId, 'application/json') });
  } catch (error) { logImageFailure(requestId, error); return imageError('temporarily_unavailable', requestId, 3); }
}
