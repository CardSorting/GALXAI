import { NextRequest, NextResponse } from 'next/server';
import { StripeEngine } from '@/lib/stripe/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * OPTIONS /api/internal/credits/stripe
 * Standard preflight handler with CORS permissive headers.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * GET /api/internal/credits/stripe
 * Health and endpoint diagnostic check for Stripe and monitoring uptime pings.
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/internal/credits/stripe',
    service: 'GALXAI Stripe Live Webhook & Credit Ingestion Substrate',
    timestamp: new Date().toISOString(),
  });
}

/**
 * HEAD /api/internal/credits/stripe
 * Lightweight probe response.
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * POST /api/internal/credits/stripe
 * Authoritative Stripe Webhook Ingestion Endpoint.
 * Ingests live mode and test mode events, performs HMAC-SHA256 signature verification,
 * deduplicates via monotonic idempotency fencing, and fulfills compute credits.
 */
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
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Webhook processing error' },
      { status: 500 }
    );
  }
}
