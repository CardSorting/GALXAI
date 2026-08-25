import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxModelRouter } from '@/core/router/GalxModelRouter';

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
 * 1-Click xAI Grok SSO / PKCE & Vault Registration ("Provider IS Auth").
 * Issues HMAC-SHA256 signed bearer session tokens and synchronizes session state with Supabase PostgreSQL.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      apiKey,
      accessToken,
      refreshToken,
      accountId,
      idToken,
      expiresAtMs,
      authType,
      email,
      displayName,
      mode = 'pooled',
      workspaceId
    } = body;

    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const authEngine = GalxAuthEngine.getInstance();
    const result = await authEngine.authenticateProviderUser('xai-grok', {
      apiKey: apiKey?.trim() || undefined,
      accessToken: accessToken?.trim() || undefined,
      refreshToken: refreshToken?.trim() || undefined,
      accountId: accountId?.trim() || undefined,
      idToken: idToken?.trim() || undefined,
      expiresAtMs: typeof expiresAtMs === 'number' ? expiresAtMs : undefined,
      authType,
      email,
      displayName,
      mode,
      workspaceId,
      ipAddress,
      userAgent
    });

    const response = NextResponse.json(result, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });

    if (result.success && result.user?.token) {
      response.cookies.set('galx_session', result.user.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      });
    }

    return response;
  } catch (err: any) {
    const status = err.message?.includes('MISSING_PROVIDER_CREDENTIALS') || err.message?.includes('INVALID_') ? 400 : 500;
    const sanitized = GalxModelRouter.sanitizeUpstreamError(err?.message || 'Authentication failed');
    return NextResponse.json({ success: false, error: sanitized }, {
      status,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}

