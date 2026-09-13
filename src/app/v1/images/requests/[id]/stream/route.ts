import { after, NextRequest } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { ImageRequestService, imageRequestSnapshot } from '@/lib/images/request-service';
import { imageError, imageHeaders } from '@/lib/security/public-image-http';
import { logImageFailure } from '@/lib/security/private-image-diagnostics';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    if (auth.error === 'AUTH_UNAVAILABLE') return imageError('temporarily_unavailable', requestId, 3);
    if (!auth.authenticated || !auth.userId) return imageError('unauthorized', requestId);
    const service = ImageRequestService.getInstance();
    const task = await service.repository.get(auth.userId,(await params).id);
    if (!task || task.user_id !== auth.userId) return imageError('not_found', requestId);
    // Begin now: after() starts only once the stream finishes. The database claim
    // arbitrates concurrent streams and ordinary status requests.
    if (task.state === 'queued') {
      const work = service.run(auth.userId,task.id);
      after(() => work);
    }
    const encoder = new TextEncoder();
    let closed = false, timer: ReturnType<typeof setTimeout> | undefined;
    let stop = () => {};
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const startedAt = Date.now();
        stop = () => {
          if (closed) return;
          closed = true; clearTimeout(timer); req.signal.removeEventListener('abort',stop); controller.close();
        };
        const emit = async () => {
          if (closed) return;
          try {
            const current = await service.repository.get(auth.userId,task.id);
            if (!current || current.user_id !== auth.userId) throw new Error('Request unavailable');
            const snapshot = await imageRequestSnapshot(current);
            if (closed) return;
            controller.enqueue(encoder.encode(`event: progress\ndata: ${JSON.stringify(snapshot)}\n\n`));
            if (['completed','failed','cancelled'].includes(current.state) || Date.now()-startedAt > 165000) stop();
            else timer = setTimeout(() => { void emit(); },3000);
          } catch (error) {
            logImageFailure(requestId,error);
            if (!closed) {
              controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: { code: 'temporarily_unavailable', request_id: requestId } })}\n\n`));
              stop();
            }
          }
        };
        req.signal.addEventListener('abort',stop,{ once:true });
        if (req.signal.aborted) stop(); else void emit();
      },
      cancel() { closed=true; clearTimeout(timer); req.signal.removeEventListener('abort',stop); },
    });
    return new Response(stream, { headers: imageHeaders(requestId, 'text/event-stream') });
  } catch (error) { logImageFailure(requestId,error); return imageError('temporarily_unavailable', requestId,3); }
}
