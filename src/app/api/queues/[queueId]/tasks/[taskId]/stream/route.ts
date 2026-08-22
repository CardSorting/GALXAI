import { NextRequest, NextResponse } from 'next/server';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import { GalxQueueEventBus } from '@/core/queue/GalxQueueEventBus';
import type { GalxQueueEvent } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';

/**
 * GET /api/queues/[queueId]/tasks/[taskId]/stream
 * Real-Time Server-Sent Events (SSE) stream for task lifecycle, progress %, and stdout/stderr logs.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ queueId: string; taskId: string }> }
) {
  const { queueId, taskId } = await params;
  const engine = GalxTaskQueueEngine.getInstance();
  const task = engine.getTask(taskId);

  if (!task || task.queueId !== queueId) {
    return NextResponse.json({ error: { message: `Task '${taskId}' not found in queue '${queueId}'` } }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const eventBus = GalxQueueEventBus.getInstance();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial state snapshot
      const initialPayload = JSON.stringify({
        event: 'INITIAL_STATE',
        task: {
          id: task.id,
          queueId: task.queueId,
          status: task.status,
          priority: task.priority,
          progress: task.progress,
          scheduleTimeMs: task.scheduleTimeMs,
          attempts: task.attempts.length,
          result: task.result
        }
      });
      controller.enqueue(encoder.encode(`event: snapshot\ndata: ${initialPayload}\n\n`));

      // 2. If task already in terminal state, finish immediately
      if (['COMPLETED', 'DEAD_LETTERED', 'CANCELLED', 'EXPIRED'].includes(task.status)) {
        controller.enqueue(encoder.encode(`event: done\ndata: {"status": "${task.status}"}\n\n`));
        controller.close();
        return;
      }

      // 3. Subscribe to real-time events
      const unsubscribe = eventBus.subscribeTask(taskId, (event: GalxQueueEvent) => {
        try {
          const sseMessage = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(sseMessage));

          if (['TASK_COMPLETED', 'TASK_DEAD_LETTERED', 'TASK_CANCELLED', 'TASK_EXPIRED'].includes(event.type)) {
            controller.enqueue(encoder.encode(`event: done\ndata: {"status": "${event.type}"}\n\n`));
            unsubscribe();
            controller.close();
          }
        } catch {
          unsubscribe();
        }
      });

      // Keepalive heartbeat every 15s
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
