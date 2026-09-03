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
    const {
      amount = 50,
      email,
      companyName,
      promoCode,
      autoReload = true,
      successUrl,
      cancelUrl
    } = body;

    const depositAmount = Number(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Deposit amount must be greater than $0.00' },
        { status: 400 }
      );
    }

    // Resolve developer workspace identity
    const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);
    const userId = auth.authenticated ? auth.userId : body.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Sign-in is required to initiate checkout' },
        { status: 401 }
      );
    }

    const stripeEngine = StripeEngine.getInstance();
    const result = await stripeEngine.createCheckoutSession({
      userId,
      depositAmount,
      customerEmail: email || (auth.claims?.email as string) || undefined,
      companyName,
      promoCode,
      autoReload,
      successUrl,
      cancelUrl
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to initiate checkout session' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      url: result.url,
      isSimulated: result.isSimulated || false
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal checkout processing error' },
      { status: 500 }
    );
  }
}
