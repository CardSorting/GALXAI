import { hasInternalAccess } from '@/lib/security/internal-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import { GalxQueueEventBus } from '@/core/queue/GalxQueueEventBus';
import type { GalxQueueEvent } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/queues/[queueId]/stream
 * Real-Time Server-Sent Events (SSE) stream for all queue events and telemetry.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ queueId: string }> }
) {
  if (!hasInternalAccess(req.headers)) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  const { queueId } = await params;
  const engine = GalxTaskQueueEngine.getInstance();
  const queue = engine.getQueue(queueId);

  if (!queue) {
    return NextResponse.json({ error: { message: `Queue '${queueId}' not found` } }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const eventBus = GalxQueueEventBus.getInstance();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial queue stats
      const stats = engine.getQueueStats(queueId);
      controller.enqueue(encoder.encode(`event: queue_stats\ndata: ${JSON.stringify(stats)}\n\n`));

      const unsubscribe = eventBus.subscribeQueue(queueId, (event: GalxQueueEvent) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
        } catch {
          unsubscribe();
        }
      });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 15000);
      heartbeat.unref();

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
