import { NextRequest, NextResponse } from 'next/server';
import { StripeEngine } from '@/lib/stripe/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing session_id parameter' },
        { status: 400 }
      );
    }

    const stripeEngine = StripeEngine.getInstance();
    const session = await stripeEngine.getCheckoutSessionStatus(sessionId);

    return NextResponse.json({
      success: true,
      session
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve session status' },
      { status: 500 }
    );
  }
}
