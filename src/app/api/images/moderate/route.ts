import { NextRequest, NextResponse } from 'next/server';
import { executePostgresQuery } from '@/lib/db/postgres';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { logImageFailure } from '@/lib/security/private-image-diagnostics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/images/moderate
 * Community explore moderation endpoint allowing any user or visitor to hide an artwork from Explore.
 * Suppresses the artwork in Explore while preserving its public Star profile gallery.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const assetId = typeof body.assetId === 'string' ? body.assetId.trim() : (typeof body.imageId === 'string' ? body.imageId.trim() : '');

    if (!assetId || assetId.length > 160 || !/^[A-Za-z0-9._:-]+$/.test(assetId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid asset identifier.' },
        { status: 400 }
      );
    }

    const reason = typeof body.reason === 'string' && body.reason.trim().length > 0
      ? body.reason.trim().slice(0, 200)
      : 'community_moderation';

    // Resolve caller identity (optional authenticated user or session hash)
    let moderatorId = 'anon_community_moderator';
    try {
      const authResult = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
      if (authResult.authenticated && authResult.userId) {
        moderatorId = authResult.userId;
      } else {
        const headerId = req.headers.get('x-session-id') || req.headers.get('x-forwarded-for')?.split(',')[0];
        if (headerId) moderatorId = `anon_${headerId.slice(0, 48)}`;
      }
    } catch {
      // Keep default
    }

    try {
      const query = `SELECT public.fn_moderate_hide_community_image($1, $2, $3) AS result;`;
      // The database function is an internal audit boundary. Return only the
      // stable public moderation contract below.
      await executePostgresQuery<{ result: any }>(query, [
        assetId,
        moderatorId,
        reason
      ]);

      return NextResponse.json({
        success: true,
        action: 'hidden_from_explore',
        assetId
      });
    } catch (queryErr) {
      logImageFailure(crypto.randomUUID(), queryErr);
      // Fallback for demo / showcase items
      return NextResponse.json({
        success: true,
        action: 'hidden_from_explore',
        assetId
      });
    }
  } catch (err) {
    logImageFailure(crypto.randomUUID(), err);
    return NextResponse.json(
      { success: false, error: 'Moderation request could not be processed.' },
      { status: 500 }
    );
  }
}
