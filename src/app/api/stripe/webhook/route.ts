import { NextRequest, NextResponse } from 'next/server';
import { StripeEngine } from '@/lib/stripe/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing Stripe-Signature header' },
      { status: 400 }
    );
  }

  try {
    const rawBody = await req.text();
    const stripeEngine = StripeEngine.getInstance();

    // 1. Constant-time cryptographic signature verification with 300s anti-replay window
    const verification = stripeEngine.verifyWebhookSignature(rawBody, signature);

    if (!verification.isValid || !verification.event) {
      return NextResponse.json(
        { error: verification.error || 'Invalid signature' },
        { status: 400 }
      );
    }

    // 2. Authoritative event processing & double-entry financial fulfillment
    const result = await stripeEngine.handleWebhookEvent(verification.event, rawBody);

    if (!result.received && result.status === 'FAILED') {
      return NextResponse.json(
        { error: result.message || 'Webhook fulfillment failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      received: true,
      status: result.status,
      message: result.message
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Webhook processing error' },
      { status: 500 }
    );
  }
}
