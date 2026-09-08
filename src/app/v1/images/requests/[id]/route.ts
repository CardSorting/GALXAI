import { NextRequest } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import { publicTaskResponse, publicTaskStatus } from '@/lib/security/public-task-response';
import { imageError, imageHeaders } from '@/lib/security/public-image-http';
import { normalizeImageOutput } from '@/lib/security/normalize-image-output';
import { logImageFailure } from '@/lib/security/private-image-diagnostics';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (!auth.authenticated || !auth.userId) return imageError('unauthorized', requestId);
    const task = GalxTaskQueueEngine.getInstance().getTask((await params).id);
    if (!task || task.userId !== auth.userId || task.target.type !== 'INTERNAL_MODEL' || task.target.taskKind !== 'image_generation') return imageError('not_found', requestId);
    if (req.nextUrl.searchParams.get('snapshot') === 'true') {
      return new Response(JSON.stringify({ task: await publicTaskResponse(task) }), { headers: imageHeaders(requestId, 'application/json') });
    }
    const status = publicTaskStatus(task.status);
    if (status === 'failed' || status === 'cancelled') return imageError('generation_failed', requestId);
    if (status !== 'completed') return new Response(JSON.stringify({ id: task.id, status }), { status: 202, headers: imageHeaders(requestId, 'application/json') });
    return await normalizeImageOutput(task.result!.data, { requestId, userId: auth.userId,
      responseFormat: req.headers.get('accept')?.includes('application/json') ? 'b64_json' : 'binary' });
  } catch (error) { logImageFailure(requestId, error); return imageError('generation_failed', requestId); }
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (!auth.authenticated || !auth.userId) return imageError('unauthorized', requestId);
    const engine = GalxTaskQueueEngine.getInstance();
    const task = engine.getTask((await params).id);
    if (!task || task.userId !== auth.userId || task.target.type !== 'INTERNAL_MODEL' || task.target.taskKind !== 'image_generation') return imageError('not_found', requestId);
    return new Response(JSON.stringify({ id: task.id, cancelled: engine.cancelTask(task.id) }), { headers: imageHeaders(requestId, 'application/json') });
  } catch (error) { logImageFailure(requestId, error); return imageError('generation_failed', requestId); }
}
