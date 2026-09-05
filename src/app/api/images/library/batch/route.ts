import { NextRequest, NextResponse } from 'next/server';
import { ImageLibraryRepository } from '@/lib/supabase/repositories/ImageLibraryRepository';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/images/library/batch
 * Executes multi-row atomic batch operations:
 * - action: 'delete': Deletes multiple assets from L1, DB, and R2 in 1 network hop.
 * - action: 'favorite': Sets favorite true/false across multiple assets.
 * - action: 'flush': Forces immediate synchronization of BroccoliDB buffer to PostgreSQL & R2.
 */
export async function POST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    if (!authResult.authenticated || !authResult.userId || authResult.userId === 'anonymous_developer') {
      return NextResponse.json({ success: false, error: 'Sign in to manage your image library.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = authResult.userId;

    const repo = ImageLibraryRepository.getInstance();

    // 1. Batch Delete
    if (body.action === 'delete') {
      const assetIds = sanitizeAssetIds(body.assetIds);
      if (assetIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No assetIds provided for batch deletion' },
          { status: 400 }
        );
      }

      const deletedCount = await repo.batchDeleteAssets(userId, assetIds);
      return NextResponse.json({
        success: true,
        action: 'delete',
        deletedCount,
        assetIds
      });
    }

    // 2. Batch Favorite
    if (body.action === 'favorite') {
      const assetIds = sanitizeAssetIds(body.assetIds);
      const isFavorite = Boolean(body.isFavorite);
      if (assetIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No assetIds provided for batch favorite' },
          { status: 400 }
        );
      }

      const updatedCount = await repo.batchSetFavorite(userId, assetIds, isFavorite);

      return NextResponse.json({
        success: true,
        action: 'favorite',
        updatedCount,
        isFavorite
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid batch action. Supported: "delete" or "favorite"' },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error('[API /api/images/library/batch] POST Error:', err);
    return NextResponse.json(
      { success: false, error: 'The image library action could not be completed.' },
      { status: 500 }
    );
  }
}

function sanitizeAssetIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 160))]
    .slice(0, 500);
}
