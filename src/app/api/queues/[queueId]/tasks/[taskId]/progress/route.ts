import { NextRequest, NextResponse } from 'next/server';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';
import type { TaskProgressUpdate } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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
 * POST /api/queues/[queueId]/tasks/[taskId]/progress
 * Worker progress reporting endpoint.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ queueId: string; taskId: string }> }
) {
  const { queueId, taskId } = await params;
  const auth = authenticateRequest(req);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: { message: 'Unauthorized Gateway API Key' } }, { status: 401 });
  }

  try {
    const body = (await req.json()) as TaskProgressUpdate;
    if (typeof body.percentage !== 'number') {
      return NextResponse.json({ error: { message: 'Missing required numeric field: percentage (0-100)' } }, { status: 400 });
    }

    const engine = GalxTaskQueueEngine.getInstance();
    const task = engine.getTask(taskId);
    if (!task || task.queueId !== queueId) {
      return NextResponse.json({ error: { message: `Task '${taskId}' not found in queue '${queueId}'` } }, { status: 404 });
    }

    const updated = engine.updateTaskProgress(taskId, body);

    return NextResponse.json({
      success: updated,
      taskId,
      progress: engine.getTask(taskId)?.progress
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Failed to update progress' } }, { status: 500 });
  }
}
