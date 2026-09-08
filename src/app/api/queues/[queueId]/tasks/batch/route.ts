import { hasInternalAccess } from '@/lib/security/internal-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxTaskQueueEngine } from '@/core/queue/GalxTaskQueueEngine';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { GalxPersistence } from '@/lib/storage/GalxPersistence';
import type { BatchCreateTasksRequest } from '@/core/contracts/GalxContracts';

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
 * POST /api/queues/[queueId]/tasks/batch
 * Ingests up to 1000 tasks atomically.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ queueId: string }> }) {
  if (!hasInternalAccess(req.headers)) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  const { queueId } = await params;
  const auth = authenticateRequest(req);
  if (!auth.isAuthorized) {
    return NextResponse.json({ error: { message: 'Unauthorized Gateway API Key' } }, { status: 401 });
  }

  try {
    const body = (await req.json()) as BatchCreateTasksRequest;
    if (!body.tasks || !Array.isArray(body.tasks) || body.tasks.length === 0) {
      return NextResponse.json(
        { error: { message: 'Invalid batch request: tasks must be a non-empty array' } },
        { status: 400 }
      );
    }

    if (body.tasks.length > 1000) {
      return NextResponse.json(
        { error: { message: 'Batch size exceeds maximum limit of 1000 tasks per request' } },
        { status: 400 }
      );
    }

    const tasksWithOptions = body.tasks.map(t => ({
      ...t,
      queueId,
      userId: auth.userId
    }));

    const engine = GalxTaskQueueEngine.getInstance();
    const result = engine.createTasksBatch({ tasks: tasksWithOptions });

    return NextResponse.json(result, {
      status: 202,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Galx-Batch-Count': String(result.createdCount + result.deduplicatedCount)
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || 'Batch creation failed' } },
      { status: 500 }
    );
  }
}
