import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';

/**
 * 1-Click OpenAI SSO / PKCE & Vault Registration ("Provider IS Auth").
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
    const result = await authEngine.authenticateProviderUser('openai', {
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

    return NextResponse.json(result);
  } catch (err: any) {
    const status = err.message?.includes('MISSING_PROVIDER_CREDENTIALS') || err.message?.includes('INVALID_') ? 400 : 500;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

