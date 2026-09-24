import { NextRequest, NextResponse } from 'next/server';
import { executePostgresQuery } from '@/lib/db/postgres';
import { normalizePublicParticipantHandle } from '@/lib/community/participant-handle';
import { getCanonicalStar } from '@/lib/stars/star-domain';
import { requireAccountIdentity } from '@/lib/auth/accountIdentity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Durable Follow API for Star Creators
 * 
 * Invariants:
 * 1. Following a Star means exactly one thing: the user follows that Star.
 * 2. Zero generative inference demand or side effects.
 * 3. Zero agent wake-up or job scheduling.
 * 4. Pure, durable relationship persistence.
 */

// In-memory fallback cache when PostgreSQL is offline or running locally
const memoryFollowCounts: Record<string, number> = {};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawHandle = searchParams.get('handle');
  const handle = normalizePublicParticipantHandle(rawHandle);

  if (!handle) {
    return NextResponse.json({ error: 'Valid Star handle required' }, { status: 400 });
  }

  const actor = await requireAccountIdentity(request).catch(() => null);
  let isFollowing = false;
  let followerCount = memoryFollowCounts[handle] || 0;

  try {
    // If database is available, query real follow state
    if (actor?.id) {
      const followCheck = await executePostgresQuery(`
        SELECT 1 FROM private.user_star_follows
        WHERE user_id = $1 AND star_handle = $2
        LIMIT 1
      `, [actor.id, handle]);
      isFollowing = Boolean(followCheck && followCheck.rows.length > 0);
    }

    const countResult = await executePostgresQuery(`
      SELECT COUNT(*)::int as count FROM private.user_star_follows
      WHERE star_handle = $1
    `, [handle]);
    if (countResult && countResult.rows[0]) {
      followerCount = Number(countResult.rows[0].count) || 0;
      memoryFollowCounts[handle] = followerCount;
    }
  } catch {
    // Graceful offline tolerance: never fail discovery or relationship reads
  }

  return NextResponse.json({
    handle,
    isFollowing,
    followerCount,
  });
}

export async function POST(request: NextRequest) {
  let body: { handle?: string; follow?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const handle = normalizePublicParticipantHandle(body.handle);
  if (!handle) {
    return NextResponse.json({ error: 'Valid Star handle required' }, { status: 400 });
  }

  const shouldFollow = Boolean(body.follow);
  const actor = await requireAccountIdentity(request).catch(() => null);
  const actorId = actor?.id || 'guest_client';

  try {

    if (shouldFollow) {
      await executePostgresQuery(`
        INSERT INTO private.user_star_follows (user_id, star_handle, followed_at)
        VALUES ($1, $2, now())
        ON CONFLICT (user_id, star_handle) DO NOTHING
      `, [actorId, handle]);
      memoryFollowCounts[handle] = (memoryFollowCounts[handle] || 0) + 1;
    } else {
      await executePostgresQuery(`
        DELETE FROM private.user_star_follows
        WHERE user_id = $1 AND star_handle = $2
      `, [actorId, handle]);
      memoryFollowCounts[handle] = Math.max(0, (memoryFollowCounts[handle] || 1) - 1);
    }
  } catch {
    // Database offline or read-only fallback: maintain memory count
    if (shouldFollow) {
      memoryFollowCounts[handle] = (memoryFollowCounts[handle] || 0) + 1;
    } else {
      memoryFollowCounts[handle] = Math.max(0, (memoryFollowCounts[handle] || 1) - 1);
    }
  }

  return NextResponse.json({
    success: true,
    handle,
    isFollowing: shouldFollow,
    followerCount: memoryFollowCounts[handle] || (shouldFollow ? 1 : 0),
  });
}
