import { NextRequest, NextResponse } from 'next/server';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Ultra-flat direct AI execution endpoint.
 * POST /api/run
 * Body: { prompt: string, model?: string, type?: 'chat' | 'image' | 'workflow', background?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt || '';
    const model = body.model || 'gpt-5.6-sol';
    const type = body.type || 'chat';
    const isBackground = !!body.background;

    if (!prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const queueEngine = GalxTaskQueueEngine.getInstance();
    const targetQueue = type === 'image' ? 'image-gen' : type === 'workflow' ? 'agent-swarms' : 'default';

    let targetPayload: any = {
      type: 'INTERNAL_MODEL',
      taskKind: type === 'image' ? 'image_generation' : 'chat_completion',
      chatPayload: {
        model,
        messages: [{ role: 'user', content: prompt }]
      }
    };

    if (type === 'image') {
      targetPayload = {
        type: 'INTERNAL_MODEL',
        taskKind: 'image_generation',
        imagePayload: {
          prompt,
          model: 'openai-gpt-image-2'
        }
      };
    }

    // Create the task in the authoritative BroccoliDB substrate
    const { task } = queueEngine.createTask({
      queueId: targetQueue,
      userId: 'user_instant',
      priority: 80,
      target: targetPayload
    });

    // If caller wants background execution, return the task handle immediately
    if (isBackground) {
      return NextResponse.json({
        id: task.id,
        status: task.status,
        queueId: targetQueue,
        taskUrl: `/api/queues/${targetQueue}/tasks/${task.id}`
      });
    }

    // Wait up to 10s for fast completion
    const startTime = Date.now();
    const maxWaitMs = 10000;
    while (Date.now() - startTime < maxWaitMs) {
      const current = GalxPersistence.getInstance().taskTable.get(task.id);
      if (current && current.status === 'COMPLETED') {
        const resultText = typeof current.result?.data === 'string'
          ? current.result.data
          : current.result?.data?.choices?.[0]?.message?.content || current.result?.data || '';

        return NextResponse.json({
          id: current.id,
          status: 'COMPLETED',
          result: resultText,
          data: current.result?.data,
          timeMs: (current.result?.completedAtMs || Date.now()) - current.createdAtMs
        });
      }

      if (current && (current.status === 'DEAD_LETTERED' || current.status === 'CANCELLED' || current.status === 'EXPIRED')) {
        return NextResponse.json({
          id: current.id,
          status: current.status,
          error: current.lastError?.message || 'Execution failed'
        }, { status: 500 });
      }

      await new Promise(r => setTimeout(r, 100));
    }

    // If still in progress after 10s, return the in-flight status so client can stream
    return NextResponse.json({
      id: task.id,
      status: 'RUNNING',
      inFlight: true,
      taskUrl: `/api/queues/${targetQueue}/tasks/${task.id}`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
