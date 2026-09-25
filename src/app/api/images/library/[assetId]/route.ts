import { logImageFailure } from '@/lib/security/private-image-diagnostics';
import { publicImageRecord } from '@/lib/security/public-image-record';
import { NextRequest, NextResponse } from 'next/server';
import { ImageLibraryRepository } from '@/lib/supabase/repositories/ImageLibraryRepository';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/images/library/[assetId]
 * Fetches a single visual generation record by ID.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);
    if (authResult.error === 'AUTH_UNAVAILABLE') return NextResponse.json({ success: false, error: 'Your session could not be checked. Try again shortly.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '3' } });
    if (!authResult.authenticated || !authResult.userId || authResult.userId === 'anonymous_developer') {
      return NextResponse.json({ success: false, error: 'Sign in to view this image.' }, { status: 401 });
    }
    if (!isValidAssetId(assetId)) {
      return NextResponse.json({ success: false, error: 'Invalid asset ID.' }, { status: 400 });
    }
    const userId = authResult.userId;

    const repo = ImageLibraryRepository.getInstance();
    const record = await repo.getAsset(userId, assetId);

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Asset not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      record: publicImageRecord(record)
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err: unknown) {
    logImageFailure(crypto.randomUUID(), err);
    return NextResponse.json(
      { success: false, error: 'The image could not be loaded.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/images/library/[assetId]
 * Updates asset metadata, e.g. toggling favorite or updating tags.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);
    if (authResult.error === 'AUTH_UNAVAILABLE') return NextResponse.json({ success: false, error: 'Your session could not be checked. Try again shortly.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '3' } });
    if (!authResult.authenticated || !authResult.userId || authResult.userId === 'anonymous_developer') {
      return NextResponse.json({ success: false, error: 'Sign in to manage this image.' }, { status: 401 });
    }
    if (!isValidAssetId(assetId)) {
      return NextResponse.json({ success: false, error: 'Invalid asset ID.' }, { status: 400 });
    }
    const userId = authResult.userId;

    const body = await req.json().catch(() => ({}));
    const repo = ImageLibraryRepository.getInstance();
    if (Object.prototype.hasOwnProperty.call(body, 'visibility') || Object.prototype.hasOwnProperty.call(body, 'isPublic')) {
      return NextResponse.json({ success: false, error: 'publishing_forbidden' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
    }

    let updated = null;
    let hasMutations = false;

    if (typeof body.isFavorite === 'boolean') {
      hasMutations = true;
      updated = await repo.toggleFavorite(userId, assetId, body.isFavorite);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: 'Asset not found or unauthorized' },
          { status: 404 }
        );
      }
    }

    if (!hasMutations) {
      return NextResponse.json(
        { success: false, error: 'No valid update properties provided. Supported: isFavorite' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      record: publicImageRecord(updated!)
    });
  } catch (err: unknown) {
    logImageFailure(crypto.randomUUID(), err);
    return NextResponse.json(
      { success: false, error: 'The image could not be updated.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/images/library/[assetId]
 * Permanently deletes the asset from L1 buffer, PostgreSQL, and Cloudflare R2.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);
    if (authResult.error === 'AUTH_UNAVAILABLE') return NextResponse.json({ success: false, error: 'Your session could not be checked. Try again shortly.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '3' } });
    if (!authResult.authenticated || !authResult.userId || authResult.userId === 'anonymous_developer') {
      return NextResponse.json({ success: false, error: 'Sign in to manage this image.' }, { status: 401 });
    }
    if (!isValidAssetId(assetId)) {
      return NextResponse.json({ success: false, error: 'Invalid asset ID.' }, { status: 400 });
    }
    const userId = authResult.userId;

    const repo = ImageLibraryRepository.getInstance();
    const deleted = await repo.deleteAsset(userId, assetId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Asset not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      assetId,
      deleted: true
    });
  } catch (err: unknown) {
    logImageFailure(crypto.randomUUID(), err);
    return NextResponse.json(
      { success: false, error: 'The image could not be deleted.' },
      { status: 500 }
    );
  }
}

function isValidAssetId(value: string): boolean {
  return value.length > 0 && value.length <= 160 && /^[A-Za-z0-9._:-]+$/.test(value);
}
