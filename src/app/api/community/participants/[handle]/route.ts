import { NextResponse } from 'next/server';
import {
  PublicParticipantRepository,
  PublicParticipantRepositoryUnavailable,
} from '@/lib/community/public-participants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ handle: string }> },
) {
  try {
    const { handle } = await context.params;
    const profile = await PublicParticipantRepository.getProfile(handle);
    if (!profile) {
      return NextResponse.json({ error: 'Participant profile not found.' }, { status: 404 });
    }
    const creations = await PublicParticipantRepository.getCreations(profile.handle);
    return NextResponse.json(
      { participant: profile, creations },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' } },
    );
  } catch (error) {
    if (error instanceof PublicParticipantRepositoryUnavailable) {
      return NextResponse.json({ error: 'Participant profile is temporarily unavailable.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Participant profile is temporarily unavailable.' }, { status: 503 });
  }
}
