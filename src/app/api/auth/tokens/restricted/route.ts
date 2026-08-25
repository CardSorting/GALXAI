import { NextRequest, NextResponse } from 'next/server';
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

/**
 * POST /api/auth/tokens/restricted
 * Mints an Ephemeral Scoped Sub-Token (Stripe / AWS STS Pattern) for subagents or microservices.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Master session bearer token is required' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { scopes, ttlMs, name } = body;

    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json(
        { error: 'Invalid parameter: "scopes" array is required (e.g. ["chat:*"])' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const authEngine = GalxAuthEngine.getInstance();
    const result = await authEngine.createRestrictedToken(token, {
      scopes,
      ttlMs: ttlMs ? Number(ttlMs) : undefined,
      name
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to mint restricted token' },
        { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return NextResponse.json({
      success: true,
      token: result.token,
      scopes: result.scopes,
      expiresAtMs: result.expiresAtMs
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error minting restricted token' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
