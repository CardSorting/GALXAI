import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * DELETE /api/auth/sessions/[id]
 * Revokes a specific remote session by session ID.
 */
async function previewDELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authEngine = GalxAuthEngine.getInstance();
    const auth = await authEngine.resolveAuthIdentity(req);

    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid session bearer token is required' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const success = await authEngine.revokeSessionById(
      id,
      auth.userId,
      'User terminated specific device session'
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Session not found or belongs to another user' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Session ${id} successfully revoked.`
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to revoke session' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export const DELETE = withDeveloperAccess(previewDELETE);
