import { NextRequest, NextResponse } from 'next/server';
import { GalxOAuthManager } from '@/core/auth/GalxOAuthManager';
import type { ProviderType } from '@/core/contracts/GalxContracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

/**
 * GET /api/auth/oauth/url
 * Generates RFC 7636 PKCE Authorization URL with S256 Code Challenge for 1-Click Provider Login.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const provider = (searchParams.get('provider') as ProviderType) || 'openai';
    const redirectUri = searchParams.get('redirectUri') || undefined;
    const stateOverride = searchParams.get('state') || undefined;

    const mode = (searchParams.get('mode') as 'pooled' | 'private') || undefined;
    const cliFlow = searchParams.get('cli') === 'true' || searchParams.get('codex_cli_simplified_flow') === 'true';
    const originator = searchParams.get('originator') || undefined;

    const oauthManager = GalxOAuthManager.getInstance();
    const details = oauthManager.generateAuthUrl(provider, redirectUri, stateOverride, {
      mode,
      cliFlow,
      originator
    });

    const response = NextResponse.json({
      success: true,
      provider,
      url: details.url,
      codeVerifier: details.codeVerifier,
      state: details.state
    });

    // Set secure HTTP-only cookie containing code verifier & provider for server-side callback fallback
    response.cookies.set('galx_pkce_verifier', JSON.stringify({
      codeVerifier: details.codeVerifier,
      state: details.state,
      provider
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 // 15 minutes TTL
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
