import { NextRequest, NextResponse } from 'next/server';
import { ImageLibraryRepository } from '@/lib/supabase/repositories/ImageLibraryRepository';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import type { ImageLibraryFilterOptions } from '@/core/contracts/GalxContracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/images/library
 * Returns the user's visual library filtered by search, aspect ratio, session, and favorite status.
 * Backed by BroccoliDB L1 read shield for 0ms, zero-egress responses.
 */
export async function GET(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    if (!authResult.authenticated || !authResult.userId || authResult.userId === 'anonymous_developer') {
      return NextResponse.json({ success: false, error: 'Sign in to view your image library.' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const userId = authResult.userId;
    const requestedLimit = Number(searchParams.get('limit') || 48);
    const requestedSort = searchParams.get('sort');
    const search = searchParams.get('search')?.trim();

    const options: ImageLibraryFilterOptions = {
      sessionId: searchParams.get('sessionId') || undefined,
      aspectRatio: searchParams.get('aspectRatio') || undefined,
      isFavorite: searchParams.has('isFavorite')
        ? searchParams.get('isFavorite') === 'true'
        : undefined,
      search: search ? search.slice(0, 200) : undefined,
      sort: requestedSort === 'oldest' ? 'oldest' : 'newest',
      limit: Number.isSafeInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 48,
      cursor: searchParams.get('cursor') || undefined
    };

    const repo = ImageLibraryRepository.getInstance();
    const libraryResult = await repo.getLibrary(userId, options);

    return NextResponse.json({
      success: true,
      userId,
      total: libraryResult.totalCount,
      limit: options.limit,
      nextCursor: libraryResult.nextCursor,
      stats: libraryResult.stats,
      availableSessions: libraryResult.availableSessions,
      records: libraryResult.records
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err: unknown) {
    console.error('[API /api/images/library] GET Error:', err);
    return NextResponse.json(
      { success: false, error: 'The image library is temporarily unavailable.' },
      { status: 500 }
    );
  }
}
