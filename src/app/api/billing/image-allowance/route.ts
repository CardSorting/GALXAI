import { NextRequest, NextResponse } from 'next/server';
import { requireAccountIdentity, AccountIdentityError } from '@/lib/auth/accountIdentity';
import { ImageAllowanceError, readImageAllowance } from '@/lib/billing/image-allowance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

/** Explicit browser-safe quota DTO. Subscription identity and accounting stay server-side. */
export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.search || request.method !== 'GET') {
      return NextResponse.json({ error: 'Invalid allowance request.' }, { status: 400, headers });
    }
    const actor = await requireAccountIdentity(request);
    const allowance = await readImageAllowance(actor.id);
    if (!allowance) {
      return NextResponse.json({ plan: null, privateCreationAvailable: false, allowance: null }, { headers });
    }
    return NextResponse.json({ plan: { id: allowance.plan, name: allowance.planName },
      privateCreationAvailable: allowance.available,
      allowance: { totalUnits: allowance.totalUnits, usedUnits: allowance.usedUnits,
        remainingUnits: allowance.remainingUnits, standardOutputUnits: allowance.standardOutputUnits,
        hdOutputUnits: allowance.hdOutputUnits, renewsAt: allowance.renewsAt } }, { headers });
  } catch (error) {
    if (error instanceof AccountIdentityError) return NextResponse.json({ error: 'Sign in again to view your creation allowance.' }, { status: error.status, headers });
    if (error instanceof ImageAllowanceError) return NextResponse.json({ error: 'Your creation allowance is temporarily unavailable.' }, { status: 503, headers });
    return NextResponse.json({ error: 'Your creation allowance is temporarily unavailable.' }, { status: 503, headers });
  }
}
