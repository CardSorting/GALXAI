import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
        { status: 401 }
      );
    }

    const body = await req.json();
    const { scopes, ttlMs, name } = body;

    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json(
        { error: 'Invalid parameter: "scopes" array is required (e.g. ["chat:*"])' },
        { status: 400 }
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
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      token: result.token,
      scopes: result.scopes,
      expiresAtMs: result.expiresAtMs
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error minting restricted token' },
      { status: 500 }
    );
  }
}
