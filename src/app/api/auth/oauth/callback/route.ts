import { NextRequest, NextResponse } from 'next/server';
import { GalxOAuthManager } from '@/core/auth/GalxOAuthManager';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxModelRouter } from '@/core/router/GalxModelRouter';
import { OAuthRepository } from '@/lib/supabase/repositories/OAuthRepository';
import type { ProviderType, ShardIsolationMode } from '@/core/contracts/GalxContracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  });
}

function sanitizeRedirectUrl(returnTo: string | null, baseReqUrl: string): URL {
  const fallback = new URL('/playground', baseReqUrl);
  if (!returnTo || typeof returnTo !== 'string') return fallback;

  const trimmed = returnTo.trim();
  // Safe relative URL path starting with a single '/'
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    try {
      const parsed = new URL(trimmed, baseReqUrl);
      if (parsed.origin === new URL(baseReqUrl).origin) {
        return parsed;
      }
    } catch {}
  }

  // Safe absolute URL matching the exact origin
  try {
    const parsed = new URL(trimmed);
    if (parsed.origin === new URL(baseReqUrl).origin) {
      return parsed;
    }
  } catch {}

  return fallback;
}

/**
 * GET /api/auth/oauth/callback
 * Server-Side / Direct Browser OAuth Callback Handler.
 * Supports direct browser redirects from OAuth providers, extracts PKCE verifier from cookie or BroccoliDB,
 * atomically consumes authorization requests to eliminate replays, exchanges tokens, vaults credentials,
 * sets HTTP-only session cookie, and redirects to destination.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');
    const returnTo = searchParams.get('returnTo');

    if (errorParam) {
      const rawMsg = errorDesc || errorParam || 'OAuth authorization denied';
      const msg = GalxModelRouter.sanitizeUpstreamError(rawMsg);
      return NextResponse.redirect(new URL(`/auth/connect?error=${encodeURIComponent(msg)}`, req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL(`/auth/connect?error=${encodeURIComponent('Missing authorization code')}`, req.url));
    }

    const oauthRepo = OAuthRepository.getInstance();
    const oauthManager = GalxOAuthManager.getInstance();

    let provider: ProviderType = 'openai';
    let codeVerifier: string | undefined = undefined;
    let mode: ShardIsolationMode = 'pooled';

    // 0. Verify and atomically consume authorization request from BroccoliDB / Supabase
    if (state) {
      const stateCheck = oauthManager.verifySignedState(state);
      if (!stateCheck.valid) {
        return NextResponse.redirect(new URL(`/auth/connect?error=${encodeURIComponent(`Invalid state: ${stateCheck.reason}`)}`, req.url));
      }
      if (stateCheck.provider) provider = stateCheck.provider;

      const authReq = await oauthRepo.consumeAuthorizationRequest(state, provider);
      if (authReq) {
        codeVerifier = authReq.codeVerifier;
        mode = authReq.mode;
        provider = authReq.provider;
      }
    }

    // Fallback: Extract PKCE verifier from secure cookie
    if (!codeVerifier) {
      const pkceCookie = req.cookies.get('galx_pkce_verifier')?.value;
      if (pkceCookie) {
        try {
          const parsed = JSON.parse(pkceCookie);
          codeVerifier = parsed.codeVerifier;
          if (parsed.provider) provider = parsed.provider;
        } catch {}
      }
    }

    if (!codeVerifier) {
      // If no server-side or cookie verifier, redirect to client callback handler for localStorage resolution
      return NextResponse.redirect(new URL(`/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`, req.url));
    }

    const redirectUri = `${new URL(req.url).origin}/api/auth/oauth/callback`;

    // 1. Exchange code with upstream provider
    const tokenRecord = await oauthManager.exchangeCodeForTokens(
      provider,
      code.trim(),
      codeVerifier.trim(),
      redirectUri
    );

    // 2. Vault tokens, provision shard, and link identity in BroccoliDB & Supabase
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const authEngine = GalxAuthEngine.getInstance();
    const result = await authEngine.authenticateProviderUser(provider, {
      accessToken: tokenRecord.accessToken,
      refreshToken: tokenRecord.refreshToken,
      idToken: tokenRecord.idToken,
      accountId: tokenRecord.accountId,
      email: tokenRecord.email,
      displayName: tokenRecord.name,
      expiresAtMs: tokenRecord.expiresAtMs,
      authType: 'oauth',
      mode,
      ipAddress,
      userAgent
    });

    const destinationUrl = sanitizeRedirectUrl(returnTo, req.url);
    const response = NextResponse.redirect(destinationUrl);

    // Set secure HTTP-only session cookie
    if (result.user?.token) {
      response.cookies.set('galx_session', result.user.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      });
    }

    // Clear PKCE verifier cookie
    response.cookies.set('galx_pkce_verifier', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });

    return response;
  } catch (err: any) {
    const safeError = GalxModelRouter.sanitizeUpstreamError(err.message || 'OAuth exchange failed');
    return NextResponse.redirect(new URL(`/auth/connect?error=${encodeURIComponent(safeError)}`, req.url));
  }
}

/**
 * POST /api/auth/oauth/callback
 * Client-Side JSON API Exchange Handler.
 * Exchanges OAuth authorization code + PKCE code verifier for access/refresh tokens,
 * vaults tokens in hardware-grade AES-256-GCM envelope, links identity in BroccoliDB/Supabase,
 * provisions an isolated credential partition, and returns a signed JWE-grade session bearer token.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let {
      code,
      codeVerifier,
      state,
      provider = 'openai',
      redirectUri,
      mode = 'pooled',
      workspaceId
    } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    const oauthRepo = OAuthRepository.getInstance();
    const oauthManager = GalxOAuthManager.getInstance();
    let effectiveProvider: ProviderType = 'openai';

    // 0. Verify and atomically consume authorization request from BroccoliDB / Supabase
    if (state && typeof state === 'string') {
      const stateCheck = oauthManager.verifySignedState(state, effectiveProvider);
      if (!stateCheck.valid) {
        return NextResponse.json({ error: `State verification failed: ${stateCheck.reason}` }, { status: 400 });
      }
      if (stateCheck.provider) effectiveProvider = stateCheck.provider;

      const authReq = await oauthRepo.consumeAuthorizationRequest(state, effectiveProvider);
      if (authReq) {
        if (!codeVerifier) codeVerifier = authReq.codeVerifier;
        if (!body.mode) mode = authReq.mode;
        effectiveProvider = authReq.provider;
      }
    }

    // Fallback: Read codeVerifier from cookie if not supplied in body
    if (!codeVerifier) {
      const pkceCookie = req.cookies.get('galx_pkce_verifier')?.value;
      if (pkceCookie) {
        try {
          const parsed = JSON.parse(pkceCookie);
          codeVerifier = parsed.codeVerifier;
          if (!body.provider && parsed.provider) effectiveProvider = parsed.provider;
        } catch {}
      }
    }

    if (!codeVerifier || typeof codeVerifier !== 'string') {
      return NextResponse.json({ error: 'PKCE code verifier is required' }, { status: 400 });
    }

    // 1. Exchange code with upstream OAuth provider
    const tokenRecord = await oauthManager.exchangeCodeForTokens(
      effectiveProvider,
      code.trim(),
      codeVerifier.trim(),
      redirectUri
    );

    // 2. Provision vaulted credential partition, link identity in BroccoliDB/Supabase, and issue session token
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const authEngine = GalxAuthEngine.getInstance();
    const result = await authEngine.authenticateProviderUser(effectiveProvider, {
      accessToken: tokenRecord.accessToken,
      refreshToken: tokenRecord.refreshToken,
      idToken: tokenRecord.idToken,
      accountId: tokenRecord.accountId,
      email: tokenRecord.email,
      displayName: tokenRecord.name,
      expiresAtMs: tokenRecord.expiresAtMs,
      authType: 'oauth',
      mode,
      workspaceId,
      ipAddress,
      userAgent
    });

    const response = NextResponse.json(result, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });

    // Set secure HTTP-only session cookie for Next.js SSR hydration
    if (result.user?.token) {
      response.cookies.set('galx_session', result.user.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      });
    }

    // Clear PKCE verifier cookie
    response.cookies.set('galx_pkce_verifier', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });

    return response;
  } catch (err: any) {
    const sanitized = GalxModelRouter.sanitizeUpstreamError(err?.message || 'OAuth exchange failed');
    return NextResponse.json(
      { success: false, error: sanitized },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
