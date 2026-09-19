import { withPreviewAdmin } from '@/lib/security/preview-admin';
import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-api-key, x-galx-key',
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * GET / POST /api/keys/verify
 * Lightweight, zero-cost API Key verification endpoint for SDKs, CLIs, and CI pipelines.
 * Returns authenticated identity, environment (live/test), granted scopes, and active rate limits.
 */
async function handleVerify(req: NextRequest) {
  const auth = await GalxAuthEngine.getInstance().resolveAuthIdentity(req);

  if (!auth.authenticated || !auth.apiKey) {
    return NextResponse.json(
      {
        valid: false,
        error: auth.error || 'UNAUTHORIZED_API_KEY',
        message: 'The provided API key is invalid, revoked, or expired.'
      },
      { status: 401 }
    );
  }

  const key = auth.apiKey;
  const env = key.environment || (key.prefix?.includes('test') ? 'test' : 'live');
  const isExpired = Boolean(key.expiresAtMs && key.expiresAtMs <= Date.now());

  if (isExpired || key.revoked) {
    return NextResponse.json(
      {
        valid: false,
        error: key.revoked ? 'REVOKED_API_KEY' : 'EXPIRED_API_KEY',
        message: key.revoked ? 'This API key has been revoked.' : 'This API key has expired.'
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    valid: true,
    keyId: key.id,
    keyPrefix: key.keyPrefix || key.prefix,
    name: key.name,
    userId: key.userId,
    environment: env,
    scopes: key.scopes || ['*'],
    rateLimitPerMinute: key.rateLimitPerMinute || 120,
    totalRequests: key.totalRequests || 0,
    createdAt: key.createdAtMs,
    expiresAt: key.expiresAtMs || null
  });
}

async function previewGET(req: NextRequest) {
  return handleVerify(req);
}

async function previewPOST(req: NextRequest) {
  return handleVerify(req);
}

export const GET = withPreviewAdmin(previewGET);
export const POST = withPreviewAdmin(previewPOST);
