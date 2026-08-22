import { NextRequest, NextResponse } from 'next/server';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';
import type { BulkRedriveRequest } from '@/core/contracts/GalxContracts';

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
 * POST /api/queues/[queueId]/redrive
 * Bulk re-drives dead-lettered tasks in the specified queue.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ queueId: string }> }
) {
  const { queueId } = await params;
  const auth = authenticateRequest(req);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: { message: 'Unauthorized Gateway API Key' } }, { status: 401 });
  }

  try {
    let body: BulkRedriveRequest = {};
    try {
      body = (await req.json()) as BulkRedriveRequest;
    } catch {
      // Body is optional
    }

    const engine = GalxTaskQueueEngine.getInstance();
    const result = engine.bulkRedrive(queueId, {
      maxTasks: body.maxTasks,
      tag: body.tag,
      userId: auth.userId !== 'anonymous_developer' ? auth.userId : body.userId
    });

    return NextResponse.json(result, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Galx-Redriven-Count': String(result.redrivenCount)
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || 'Bulk redrive failed' } },
      { status: 500 }
    );
  }
}
