import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxOAuthManager } from '@/core/auth/GalxOAuthManager';
import { GalxModelRouter } from '@/core/router/GalxModelRouter';
import type { ProviderType } from '@/core/contracts/GalxContracts';

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
 * Standard RFC 9126 OAuth 2.0 Pushed Authorization Requests (PAR) Endpoint.
 * Ingests authorization parameters via direct POST, eliminating URL query leakage.
 * Returns request_uri and expires_in (90s).
 */
async function previewPOST(req: NextRequest) {
  try {
    let clientId = '';
    let redirectUri = '';
    let scope = '';
    let codeChallenge = '';
    let codeChallengeMethod = 'S256';
    let state = '';
    let responseType = 'code';
    let provider: ProviderType = 'openai';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      clientId = (formData.get('client_id') as string) || '';
      redirectUri = (formData.get('redirect_uri') as string) || '';
      scope = (formData.get('scope') as string) || '';
      codeChallenge = (formData.get('code_challenge') as string) || '';
      codeChallengeMethod = (formData.get('code_challenge_method') as string) || 'S256';
      state = (formData.get('state') as string) || '';
      responseType = (formData.get('response_type') as string) || 'code';
      provider = ((formData.get('provider') as ProviderType) || 'openai');
    } else {
      const body = await req.json().catch(() => ({}));
      clientId = body.client_id || body.clientId || '';
      redirectUri = body.redirect_uri || body.redirectUri || '';
      scope = body.scope || '';
      codeChallenge = body.code_challenge || body.codeChallenge || '';
      codeChallengeMethod = body.code_challenge_method || body.codeChallengeMethod || 'S256';
      state = body.state || '';
      responseType = body.response_type || body.responseType || 'code';
      provider = body.provider || 'openai';
    }

    if (!clientId) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing client_id parameter' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const oauthManager = GalxOAuthManager.getInstance();
    const result = oauthManager.pushAuthorizationRequest({
      provider,
      clientId,
      redirectUri,
      scope,
      codeChallenge,
      codeChallengeMethod,
      state,
      responseType
    });

    return NextResponse.json(result, {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache'
      }
    });
  } catch (err: any) {
    const sanitized = GalxModelRouter.sanitizeUpstreamError(err?.message || 'PAR processing failed');
    return NextResponse.json(
      { error: 'server_error', error_description: sanitized },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export const POST = withDeveloperAccess(previewPOST);
