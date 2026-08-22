import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';

export const runtime = 'nodejs';

/**
 * 1-Click xAI Grok SSO / PKCE & Vault Registration ("Provider IS Auth").
 * Issues HMAC-SHA256 signed bearer session tokens and synchronizes session state with Supabase PostgreSQL.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { apiKey, email, displayName, mode = 'pooled', workspaceId } = body;

    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const authEngine = GalxAuthEngine.getInstance();
    const result = await authEngine.authenticateProviderUser('xai-grok', {
      apiKey: apiKey?.trim() || undefined,
      email,
      displayName,
      mode,
      workspaceId,
      ipAddress,
      userAgent
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

