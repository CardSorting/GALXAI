import { NextRequest, NextResponse } from 'next/server';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

function authenticateRequest(req: NextRequest, requireAuth = true): { userId: string; isAuthorized: boolean } {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { userId: requireAuth ? '' : 'developer_sandbox', isAuthorized: !requireAuth };
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
 * POST /api/queues/[queueId]/purge
 * Purges tasks from the specified queue.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ queueId: string }> }) {
  const { queueId } = await params;
  const auth = authenticateRequest(req, true);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: { message: 'Unauthorized Gateway API Key or Session Bearer Token required' } }, { status: 401 });
  }

  try {
    let statusFilter: string | undefined;
    try {
      const body = await req.json();
      statusFilter = body.statusFilter;
    } catch {
      // Body is optional
    }

    const engine = GalxTaskQueueEngine.getInstance();
    const purgedCount = engine.purgeQueue(queueId, statusFilter);

    return NextResponse.json({
      success: true,
      queueId,
      purgedCount,
      statusFilter: statusFilter || 'ALL'
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message || 'Failed to purge queue' } }, { status: 500 });
  }
}
