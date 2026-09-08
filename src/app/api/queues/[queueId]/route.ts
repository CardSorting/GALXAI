import { hasInternalAccess } from '@/lib/security/internal-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
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
 * GET /api/queues/[queueId]
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ queueId: string }> }) {
  if (!hasInternalAccess(req.headers)) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  const { queueId } = await params;
  const auth = authenticateRequest(req);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: { message: 'Unauthorized Gateway API Key' } }, { status: 401 });
  }

  const engine = GalxTaskQueueEngine.getInstance();
  const queue = engine.getQueue(queueId);
  if (!queue) {
    return NextResponse.json({ error: { message: `Queue '${queueId}' not found` } }, { status: 404 });
  }

  const stats = engine.getQueueStats(queueId);
  return NextResponse.json({
    queue: {
      ...queue,
      telemetry: stats
    }
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}

/**
 * PATCH /api/queues/[queueId]
 * Update state (e.g. pause, resume), rate limits, or retry policies.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ queueId: string }> }) {
  if (!hasInternalAccess(req.headers)) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  const { queueId } = await params;
  const auth = authenticateRequest(req);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: { message: 'Unauthorized Gateway API Key' } }, { status: 401 });
  }

  try {
    const body = await req.json();
    const engine = GalxTaskQueueEngine.getInstance();
    const existing = engine.getQueue(queueId);
    if (!existing) {
      return NextResponse.json({ error: { message: `Queue '${queueId}' not found` } }, { status: 404 });
    }

    if (body.action === 'pause') {
      engine.pauseQueue(queueId);
    } else if (body.action === 'resume') {
      engine.resumeQueue(queueId);
    }

    const updated = engine.createOrUpdateQueue({
      ...existing,
      ...body,
      id: queueId,
      name: body.name || existing.name
    });

    const stats = engine.getQueueStats(queueId);
    return NextResponse.json({
      queue: {
        ...updated,
        telemetry: stats
      }
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Failed to update queue' } }, { status: 500 });
  }
}

/**
 * DELETE /api/queues/[queueId]
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ queueId: string }> }) {
  if (!hasInternalAccess(req.headers)) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  const { queueId } = await params;
  const auth = authenticateRequest(req);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: { message: 'Unauthorized Gateway API Key' } }, { status: 401 });
  }

  try {
    const engine = GalxTaskQueueEngine.getInstance();
    const deleted = engine.deleteQueue(queueId);
    if (!deleted) {
      return NextResponse.json({ error: { message: `Queue '${queueId}' not found` } }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedQueueId: queueId }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Failed to delete queue' } }, { status: 400 });
  }
}
