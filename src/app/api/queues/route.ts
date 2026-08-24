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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
 * GET /api/queues
 * Lists all task queues with live telemetry stats and rates.
 */
export async function GET(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: { message: 'Unauthorized Gateway API Key' } }, { status: 401 });
  }

  const engine = GalxTaskQueueEngine.getInstance();
  const queues = engine.listQueues();
  const stats = engine.getAllQueueStats();

  return NextResponse.json({
    queues: queues.map(q => {
      const qStat = stats.find(s => s.queueId === q.id);
      return {
        ...q,
        telemetry: qStat
      };
    })
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}

/**
 * POST /api/queues
 * Creates or updates a named queue configuration.
 */
export async function POST(req: NextRequest) {
  const auth = authenticateRequest(req);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: { message: 'Unauthorized Gateway API Key' } }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.id || typeof body.id !== 'string' || !body.name) {
      return NextResponse.json(
        { error: { message: 'Missing required parameters: id and name are required' } },
        { status: 400 }
      );
    }

    const engine = GalxTaskQueueEngine.getInstance();
    const createdQueue = engine.createOrUpdateQueue(body);

    return NextResponse.json({ queue: createdQueue }, {
      status: 201,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || 'Failed to create queue' } },
      { status: 500 }
    );
  }
}
