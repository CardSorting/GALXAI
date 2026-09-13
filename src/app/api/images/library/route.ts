import { logImageFailure } from '@/lib/security/private-image-diagnostics';
import { publicImageRecord, publicImageSummary } from '@/lib/security/public-image-record';
import { NextRequest, NextResponse } from 'next/server';
import { ImageLibraryRepository } from '@/lib/supabase/repositories/ImageLibraryRepository';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { InvalidImageLibraryQuery, readImageLibraryQuery } from '@/lib/images/library-cursor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/images/library
 * Returns the user's visual library filtered by search, aspect ratio, session, and favorite status.
 * Compact cursor pages avoid full-library summaries during browsing.
 */
export async function GET(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    if (authResult.error === 'AUTH_UNAVAILABLE') return NextResponse.json({ success: false, error: 'Your session could not be checked. Try again shortly.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '3' } });
    if (!authResult.authenticated || !authResult.userId || authResult.userId === 'anonymous_developer') {
      return NextResponse.json({ success: false, error: 'Sign in to view your image library.' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
    }

    const userId = authResult.userId;
    const options = readImageLibraryQuery(req.nextUrl.searchParams);

    const repo = ImageLibraryRepository.getInstance();
    const libraryResult = await repo.getLibrary(userId, options);

    return NextResponse.json({
      success: true,
      userId,
      total: libraryResult.totalCount,
      limit: options.limit,
      nextCursor: libraryResult.nextCursor,
      previousCursor: libraryResult.previousCursor || null,
      stats: libraryResult.stats ? { totalImages: libraryResult.stats.totalImages, totalBytes: libraryResult.stats.totalBytes,
        favoriteCount: libraryResult.stats.favoriteCount, sessionCount: libraryResult.stats.sessionCount,
        aspectRatios: Object.fromEntries(Object.entries(libraryResult.stats.aspectRatios).filter(([key, value]) => /^\d+:\d+$/.test(key) && typeof value === 'number')) } : null,
      availableSessions: libraryResult.availableSessions.map(item => ({ sessionId: item.sessionId, count: item.count })),
      records: libraryResult.records.map(record => options.includeSummary === false ? publicImageSummary(record) : publicImageRecord(record))
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err: unknown) {
    if (err instanceof InvalidImageLibraryQuery) return NextResponse.json({ success: false, error: 'Check your library filters and try again.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
    logImageFailure(crypto.randomUUID(), err);
    return NextResponse.json(
      { success: false, error: 'The image library is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '3' } }
    );
  }
}
