import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';

/**
 * DELETE /api/auth/sessions/[id]
 * Revokes a specific remote session by session ID.
 */
export async function DELETE(
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
        { status: 401 }
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
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Session ${id} successfully revoked.`
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to revoke session' },
      { status: 500 }
    );
  }
}
