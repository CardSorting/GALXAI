import { NextRequest, NextResponse } from 'next/server';
import { checkPaymentOrigin } from '@/lib/billing/payment';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    checkPaymentOrigin(req);
    return NextResponse.json({
      success: false,
      error: 'This purchase route is retired. GALX does not offer self-service developer access.',
    }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Checkout is unavailable. Please try again.' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
