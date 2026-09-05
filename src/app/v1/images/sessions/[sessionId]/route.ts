import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxR2AssetAdapter } from '@/workers/cloudflare/GalxR2AssetAdapter';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-galx-session-id, x-session-id, Idempotency-Key'
    }
  });
}

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /v1/images/sessions/[sessionId]
 * Returns all generated visual assets and manifest associated with a specific user session.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json(
        { error: { message: 'Missing sessionId in route parameters', code: 'missing_session_id' } },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);
    const userId = authResult.userId || req.headers.get('x-galx-user-id') || 'anonymous_developer';

    const r2Adapter = GalxR2AssetAdapter.getInstance();
    const [images, manifest] = await Promise.all([
      r2Adapter.listSessionImages(userId, sessionId),
      r2Adapter.getSessionManifest(userId, sessionId),
    ]);

    return NextResponse.json(
      {
        object: 'list',
        session_id: sessionId,
        user_id: userId,
        manifest: manifest || null,
        total: images.length,
        data: images,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-transform',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || 'Failed to list session images', code: 'session_list_failed' } },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

/**
 * DELETE /v1/images/sessions/[sessionId]
 * Performs an atomic cascade purge of all visual assets and metadata for this session in Cloudflare R2 and BroccoliDB.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json(
        { error: { message: 'Missing sessionId in route parameters', code: 'missing_session_id' } },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);
    const userId = authResult.userId || req.headers.get('x-galx-user-id') || 'anonymous_developer';

    const r2Adapter = GalxR2AssetAdapter.getInstance();
    const result = await r2Adapter.deleteSessionImages(userId, sessionId);

    return NextResponse.json(
      {
        object: 'session.deleted',
        session_id: sessionId,
        user_id: userId,
        deleted_count: result.deletedCount,
        status: 'ok',
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || 'Failed to purge session images', code: 'session_purge_failed' } },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
