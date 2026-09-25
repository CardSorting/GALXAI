import { NextRequest, NextResponse } from 'next/server';
import { executePostgresQuery } from '@/lib/db/postgres';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { handleExploreHideMutation } from '@/lib/images/explore-hide';
import type { ParticipantKind } from '@/lib/community/participant-handle';
import {
  normalizePublicParticipantHandle,
  sanitizePublicImageUrl,
} from '@/lib/community/participant-handle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface PublicFeedItem {
  id: string;
  prompt: string;
  aspect_ratio: string;
  dimensions: string;
  public_url: string;
  thumbnail_url?: string;
  created_at: string;
  lqip: string | null;
  likes_count?: number;
  remix_count?: number;
  views_count?: number;
  author: {
    displayName: string;
    handle: string | null;
    avatarUrl: string | null;
    participantKind: ParticipantKind;
  };
}

const ALLOWED_ASPECT_RATIOS = new Set(['1:1', '16:9', '9:16', '3:2', '4:3', '2:3', '3:4']);

/**
 * GET /api/images/feed
 * High-concurrency anti-locking public stream of completed generated images.
 * Queries user_image_library joined with HOT user_image_stats.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const limitParam = parseInt(searchParams.get('limit') || '24', 10);
  const limit = Math.max(1, Math.min(Number.isFinite(limitParam) ? limitParam : 24, 48));
  const cursor = searchParams.get('cursor');
  const aspectRatio = searchParams.get('aspect_ratio');
  const q = searchParams.get('q')?.trim();
  const sort = searchParams.get('sort') || 'recent';
  const tag = searchParams.get('tag')?.toLowerCase().trim();
  const rawAuthorHandle = searchParams.get('author_handle')?.trim();
  const requestedId = searchParams.get('image_id') || searchParams.get('id') || searchParams.get('image');

  if (rawAuthorHandle && !normalizePublicParticipantHandle(rawAuthorHandle)) {
    return NextResponse.json({ success: false, error: 'Invalid creator handle.' }, { status: 400 });
  }
  const authorHandle = rawAuthorHandle ? normalizePublicParticipantHandle(rawAuthorHandle) : null;
  // A Star profile is a complete public gallery, while Explore is an
  // editorial/discovery surface. Keep the SQL projection explicit so a
  // moderation hide never removes a creation from its Star profile.
  const feedView = authorHandle
    ? 'public.community_star_profile_creations'
    : 'public.community_creations_feed';

  // Explore hides are private viewer preferences. A Star profile intentionally
  // skips this lookup so the profile remains a complete public gallery.
  let viewerUserId: string | null = null;
  if (!authorHandle) {
    try {
      const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
      if (auth.authenticated && auth.authType === 'session_token' && auth.userId && auth.userId !== 'anonymous_developer') {
        viewerUserId = auth.userId;
      }
    } catch {
      // Public discovery remains available when optional session verification is
      // unavailable; it simply cannot apply a private preference for this read.
    }
  }

  let items: PublicFeedItem[] = [];
  let nextCursor: string | null = null;

  try {
    const conditions: string[] = [
      '1=1',
      "user_id NOT LIKE 'usr_%'",
      "user_id NOT LIKE 'test_%'",
      "id NOT LIKE 'img_test_%'"
    ];
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by aspect ratio
    if (aspectRatio && ALLOWED_ASPECT_RATIOS.has(aspectRatio)) {
      conditions.push(`aspect_ratio = $${paramIndex++}`);
      params.push(aspectRatio);
    }

    // Filter by prompt search
    if (q && q.length <= 100) {
      const sanitized = q.replace(/[%_\\]/g, '\\$&');
      conditions.push(`prompt ILIKE $${paramIndex++}`);
      params.push(`%${sanitized}%`);
    }

    // Filter by style tag
    if (tag && tag !== 'all') {
      const sanitizedTag = tag.replace(/[%_\\]/g, '\\$&');
      conditions.push(`prompt ILIKE $${paramIndex++}`);
      params.push(`%${sanitizedTag}%`);
    }

    if (authorHandle) {
      conditions.push(`author_handle = $${paramIndex++}`);
      params.push(authorHandle);
    }

    if (viewerUserId) {
      conditions.push(`NOT EXISTS (
        SELECT 1
        FROM public.user_image_explore_hides AS viewer_hide
        WHERE viewer_hide.viewer_user_id = $${paramIndex++}
          AND viewer_hide.asset_id = id
      )`);
      params.push(viewerUserId);
    }

    // Keyset pagination cursor
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf8');
        const parts = decoded.split(',');
        if (sort === 'trending' && parts.length === 3) {
          const [likesStr, cursorTime, cursorId] = parts;
          const likes = parseInt(likesStr, 10);
          if (!isNaN(likes) && cursorTime && cursorId && !isNaN(Date.parse(cursorTime))) {
            conditions.push(`(likes_count, created_at, id) < ($${paramIndex++}::bigint, $${paramIndex++}::timestamptz, $${paramIndex++})`);
            params.push(likes, cursorTime, cursorId);
          }
        } else {
          const [cursorTime, cursorId] = parts.length === 3 ? [parts[1], parts[2]] : [parts[0], parts[1]];
          if (cursorTime && cursorId && !isNaN(Date.parse(cursorTime))) {
            conditions.push(`(created_at, id) < ($${paramIndex++}::timestamptz, $${paramIndex++})`);
            params.push(cursorTime, cursorId);
          }
        }
      } catch {
        // Ignore malformed cursor
      }
    }

    params.push(limit);
    const limitIndex = paramIndex++;

    const orderBy = sort === 'trending'
      ? 'likes_count DESC, created_at DESC, id DESC'
      : 'created_at DESC, id DESC';

    const query = `
      SELECT
        id,
        user_id,
        prompt,
        aspect_ratio,
        dimensions,
        public_url,
        created_at,
        lqip,
        likes_count,
        remix_count,
        views_count,
        author_display_name,
        author_handle,
        author_avatar_url,
        participant_kind
      FROM ${feedView}
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $${limitIndex}
    `;

    const result = await executePostgresQuery<any>(query, params);
    // Fail closed if a stale view or unexpected row ever reintroduces a human
    // account into the public publishing corpus.
    const rows = (result?.rows || []).filter((row: any) => row.participant_kind === 'star');

    if (rows.length === limit) {
      const last = rows[rows.length - 1];
      if (sort === 'trending') {
        const likes = Number(last.likes_count || 0);
        nextCursor = Buffer.from(`${likes},${new Date(last.created_at).toISOString()},${last.id}`).toString('base64');
      } else {
        nextCursor = Buffer.from(`${new Date(last.created_at).toISOString()},${last.id}`).toString('base64');
      }
    }

    items = rows.map((r: any) => {
      let publicUrl = '';
      let thumbnailUrl = '';

      if (r.user_id && r.id) {
        try {
          const token = GalxCryptoVault.sealImageDownload(r.user_id, r.id);
          publicUrl = `/v1/images/assets/${token}`;
          thumbnailUrl = `/v1/images/assets/${token}/thumbnail`;
        } catch { /* Do not fall back to a raw storage URL. */ }
      }

      return {
        id: r.id,
        prompt: r.prompt,
        aspect_ratio: r.aspect_ratio || '1:1',
        dimensions: r.dimensions || '1024x1024',
        public_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        created_at: new Date(r.created_at).toISOString(),
        lqip: r.lqip || null,
        likes_count: Number(r.likes_count || 0),
        remix_count: Number(r.remix_count || 0),
        views_count: Number(r.views_count || 0),
        author: {
          displayName: typeof r.author_display_name === 'string' && r.author_display_name.trim()
            ? r.author_display_name.trim()
            : 'GALX Star',
          handle: normalizePublicParticipantHandle(r.author_handle),
          avatarUrl: sanitizePublicImageUrl(r.author_avatar_url),
          participantKind: 'star',
        },
      };
    });
  } catch {
    // Keep the public stream empty when the live feed is unavailable.
  }

  // If a specific creation ID was requested, ensure it is prioritized at index 0 of the feed
  if (requestedId) {
    const existingIndex = items.findIndex(it => it.id === requestedId);
    if (existingIndex > 0) {
      const targetItem = items[existingIndex];
      items = [targetItem, ...items.filter((_, i) => i !== existingIndex)];
    } else if (existingIndex === -1) {
      try {
        const directParams: Array<string> = [requestedId];
        const directConditions = [
          'id = $1',
          "user_id NOT LIKE 'usr_%'",
          "id NOT LIKE 'img_test_%'",
        ];
        if (authorHandle) {
          directConditions.push('author_handle = $2');
          directParams.push(authorHandle);
        } else if (viewerUserId) {
          directConditions.push(`NOT EXISTS (
              SELECT 1
              FROM public.user_image_explore_hides AS viewer_hide
              WHERE viewer_hide.viewer_user_id = $2
                AND viewer_hide.asset_id = id
            )`);
          directParams.push(viewerUserId);
        }
        const directRes = await executePostgresQuery(
          `SELECT id, user_id, prompt, aspect_ratio, dimensions, public_url, created_at, lqip, likes_count, remix_count, views_count,
                  author_display_name, author_handle, author_avatar_url, participant_kind
           FROM ${feedView}
           WHERE ${directConditions.join(' AND ')}
           LIMIT 1`,
          directParams
        );
        if (directRes?.rows?.[0]?.participant_kind === 'star') {
          const r = directRes.rows[0];
          let pubUrl = '';
          let thumbUrl = '';
          if (r.user_id && r.id) {
            try {
              const token = GalxCryptoVault.sealImageDownload(r.user_id, r.id);
              pubUrl = `/v1/images/assets/${token}`;
              thumbUrl = `/v1/images/assets/${token}/thumbnail`;
            } catch {}
          }
          items.unshift({
            id: r.id,
            prompt: r.prompt,
            aspect_ratio: r.aspect_ratio || '1:1',
            dimensions: r.dimensions || '1024x1024',
            public_url: pubUrl,
            thumbnail_url: thumbUrl,
            created_at: new Date(r.created_at).toISOString(),
            lqip: r.lqip || null,
            likes_count: Number(r.likes_count || 0),
            remix_count: Number(r.remix_count || 0),
            views_count: Number(r.views_count || 0),
            author: {
              displayName: typeof r.author_display_name === 'string' && r.author_display_name.trim()
                ? r.author_display_name.trim()
                : 'GALX Star',
              handle: normalizePublicParticipantHandle(r.author_handle),
              avatarUrl: sanitizePublicImageUrl(r.author_avatar_url),
              participantKind: 'star',
            },
          });
        }
      } catch {
        // Ignore single-item lookup failure
      }
    }
  }

  return NextResponse.json(
    {
      success: true,
      items,
      nextCursor,
      count: items.length,
    },
    {
      headers: viewerUserId
        ? { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization' }
        : { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59' },
    }
  );
}

/**
 * POST /api/images/feed
 * Non-blocking interaction dispatching with HOT-update buffering and ledgering
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, imageId, increment = true, sessionHash: rawHash, imageIds } = body || {};

    const sessionHash = String(
      rawHash ||
      req.headers.get('x-session-id') ||
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      'anon-client'
    ).slice(0, 160);

    if (action === 'like') {
      if (!imageId || typeof imageId !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid image identifier' }, { status: 400 });
      }

      try {
        const query = `SELECT public.fn_record_image_like($1, $2, $3) AS result;`;
        const result = await executePostgresQuery<{ result: { likes_count: number; is_liked: boolean } }>(query, [
          imageId,
          sessionHash,
          Boolean(increment)
        ]);
        const data = result?.rows?.[0]?.result;
        return NextResponse.json({
          success: true,
          likes: data?.likes_count ?? null,
          isLiked: data?.is_liked ?? Boolean(increment)
        });
      } catch {
        // Keep interactions non-blocking when a public item is unavailable.
        return NextResponse.json({ success: true, likes: null, isLiked: Boolean(increment) });
      }
    }

    if (action === 'view_batch') {
      const ids = Array.isArray(imageIds)
        ? imageIds.filter((id): id is string => typeof id === 'string' && id.length > 0).slice(0, 50)
        : [];

      if (ids.length > 0) {
        try {
          const query = `SELECT public.fn_record_image_view_batch($1, $2) AS count;`;
          await executePostgresQuery(query, [ids, sessionHash]);
        } catch {
          // Ignore offline errors for view telemetry
        }
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'remix') {
      if (imageId && typeof imageId === 'string') {
        try {
          const query = `SELECT public.fn_increment_image_remix($1);`;
          await executePostgresQuery(query, [imageId]);
        } catch {
          // Ignore offline errors for remix telemetry
        }
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'hide' || action === 'moderate') {
      return handleExploreHideMutation(req, { ...body, action: 'hide', imageId });
    }

    if (action === 'unhide') {
      return handleExploreHideMutation(req, { ...body, action: 'unhide', imageId });
    }

    return NextResponse.json({ success: false, error: 'Unsupported interaction action' }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: 'Malformed request' }, { status: 400 });
  }
}
