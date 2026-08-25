import { NextRequest, NextResponse } from 'next/server';
import { StripeEngine } from '@/lib/stripe/stripe';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    const userId = auth.authenticated ? auth.userId : (body.userId || 'user_demo');

    const stripeEngine = StripeEngine.getInstance();
    const result = await stripeEngine.createCustomerPortalSession(userId, body.returnUrl);

    if (!result.success || !result.url) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to generate Customer Portal session' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.url
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error creating billing portal' },
      { status: 500 }
    );
  }
}
