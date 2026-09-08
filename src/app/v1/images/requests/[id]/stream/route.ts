import { NextRequest } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import { GalxQueueEventBus } from '@/core/queue/GalxQueueEventBus';
import { publicTaskResponse, publicTaskStatus } from '@/lib/security/public-task-response';
import { imageError, imageHeaders } from '@/lib/security/public-image-http';
import { logImageFailure } from '@/lib/security/private-image-diagnostics';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (!auth.authenticated || !auth.userId) return imageError('unauthorized', requestId);
    const engine = GalxTaskQueueEngine.getInstance();
    const task = engine.getTask((await params).id);
    if (!task || task.userId !== auth.userId || task.target.type !== 'INTERNAL_MODEL' || task.target.taskKind !== 'image_generation') return imageError('not_found', requestId);
    const encoder = new TextEncoder();
    let unsubscribe = () => {};
    let closed = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let pending = Promise.resolve();
        const emit = async () => {
          if (closed) return;
          try {
            const current = engine.getTask(task.id);
            if (!current || current.userId !== auth.userId) throw new Error('Request unavailable');
            const snapshot = await publicTaskResponse(current);
            if (closed) return;
            controller.enqueue(encoder.encode(`event: progress\ndata: ${JSON.stringify(snapshot)}\n\n`));
            if (['completed', 'failed', 'cancelled'].includes(publicTaskStatus(current.status))) {
              closed = true; unsubscribe(); controller.close();
            }
          } catch (error) {
            logImageFailure(requestId, error);
            if (!closed) { controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: { code: 'generation_failed', request_id: requestId } })}\n\n`)); closed = true; unsubscribe(); controller.close(); }
          }
        };
        unsubscribe = GalxQueueEventBus.getInstance().subscribeTask(task.id, () => { pending = pending.then(emit); });
        pending = pending.then(emit);
        req.signal.addEventListener('abort', () => { if (!closed) { closed = true; unsubscribe(); controller.close(); } }, { once: true });
      },
      cancel() { closed = true; unsubscribe(); },
    });
    return new Response(stream, { headers: imageHeaders(requestId, 'text/event-stream') });
  } catch (error) { logImageFailure(requestId, error); return imageError('generation_failed', requestId); }
}
