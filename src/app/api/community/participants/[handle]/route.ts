import { NextResponse } from 'next/server';
import {
  PublicParticipantRepository,
  PublicParticipantRepositoryUnavailable,
  isValidPublicParticipantCursor,
} from '@/lib/community/public-participants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ handle: string }> },
) {
  try {
    const { handle } = await context.params;
    const profile = await PublicParticipantRepository.getProfile(handle);
    if (!profile) {
      return NextResponse.json({ error: 'Participant profile not found.' }, { status: 404 });
    }
    const searchParams = new URL(request.url).searchParams;
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '24', 10);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 48)) : 24;
    const rawCursor = searchParams.get('cursor')?.trim() || undefined;
    if (rawCursor && !isValidPublicParticipantCursor(rawCursor)) {
      return NextResponse.json(
        { success: false, error: 'Invalid pagination cursor.' },
        { status: 400 },
      );
    }
    const creations = await PublicParticipantRepository.getCreationsPage(profile.handle, {
      cursor: rawCursor,
      limit,
    });
    return NextResponse.json(
      {
        success: true,
        participant: profile,
        creations: creations.items,
        nextCursor: creations.nextCursor,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' } },
    );
  } catch (error) {
    if (error instanceof PublicParticipantRepositoryUnavailable) {
      return NextResponse.json({ error: 'Participant profile is temporarily unavailable.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Participant profile is temporarily unavailable.' }, { status: 503 });
  }
}
