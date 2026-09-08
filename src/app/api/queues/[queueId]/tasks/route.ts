import { hasInternalAccess } from '@/lib/security/internal-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';
import type { TaskStatus, CreateTaskOptions } from '@/core/contracts/GalxContracts';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key'
    }
  });
}

function authenticateRequest(req: NextRequest): { userId: string; isAuthorized: boolean } {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { userId: 'anonymous_developer', isAuthorized: true };
  }
  const token = authHeader.substring(7).trim();
  if (token.startsWith('galx_live_')) {
    const hash = GalxCryptoVault.hashApiKey(token);
    const persistence = GalxPersistence.getInstance();
    const foundKey = persistence.getGatewayKeys().find(k => k.keyHash === hash && !k.revoked);
    if (foundKey) {
      return { userId: foundKey.userId, isAuthorized: true };
    }
    return { userId: '', isAuthorized: false };
  }
  return { userId: token, isAuthorized: true };
}

/**
 * GET /api/queues/[queueId]/tasks
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ queueId: string }> }) {
  if (!hasInternalAccess(req.headers)) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  const { queueId } = await params;
  const auth = authenticateRequest(req);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: { message: 'Unauthorized Gateway API Key' } }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as TaskStatus | undefined;
  const tag = searchParams.get('tag') || undefined;
  const limit = searchParams.has('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
  const offset = searchParams.has('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

  const engine = GalxTaskQueueEngine.getInstance();
  const queue = engine.getQueue(queueId);
  if (!queue) {
    return NextResponse.json({ error: { message: `Queue '${queueId}' not found` } }, { status: 404 });
  }

  const { tasks, totalCount } = engine.listTasks(queueId, {
    status,
    tag,
    userId: auth.userId !== 'anonymous_developer' ? auth.userId : undefined,
    limit,
    offset
  });

  return NextResponse.json({
    queueId,
    tasks,
    totalCount,
    limit,
    offset
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}

/**
 * POST /api/queues/[queueId]/tasks
 * Enqueues a task to the specified queue.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ queueId: string }> }) {
  if (!hasInternalAccess(req.headers)) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  const { queueId } = await params;
  const auth = authenticateRequest(req);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: { message: 'Unauthorized Gateway API Key' } }, { status: 401 });
  }

  try {
    const body = await req.json();
    const idempotencyHeader = req.headers.get('idempotency-key');
    const idempotencyKey = body.idempotencyKey || idempotencyHeader || undefined;

    if (!body.target || typeof body.target !== 'object') {
      return NextResponse.json(
        { error: { message: 'Missing required field: target (must be HTTP_PUSH, INTERNAL_MODEL, or PULL_WORKER)' } },
        { status: 400 }
      );
    }

    const engine = GalxTaskQueueEngine.getInstance();
    const taskOptions: CreateTaskOptions = {
      id: body.id,
      queueId,
      userId: auth.userId,
      idempotencyKey,
      tag: body.tag,
      priority: body.priority,
      scheduleTimeMs: body.scheduleTimeMs,
      delayMs: body.delayMs,
      target: body.target
    };

    const { task, deduplicated } = engine.createTask(taskOptions);

    const status = deduplicated ? 200 : 202;
    const responseHeaders = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Location': `/api/queues/${queueId}/tasks/${task.id}`,
      'X-Galx-Task-Id': task.id,
      'X-Galx-Task-Status': task.status
    });

    return NextResponse.json({
      task,
      deduplicated,
      taskUrl: `/api/queues/${queueId}/tasks/${task.id}`
    }, {
      status,
      headers: responseHeaders
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || 'Failed to create task' } },
      { status: 500 }
    );
  }
}
