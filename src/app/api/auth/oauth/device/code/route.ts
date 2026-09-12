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
 * Standard RFC 8628 OAuth 2.0 Device Authorization Endpoint.
 * Issues device_code and user_code for headless CLI / Terminal authentication.
 */
async function previewPOST(req: NextRequest) {
  try {
    let provider: ProviderType = 'openai';
    let workspaceId: string | undefined;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      provider = ((formData.get('provider') || formData.get('client_id')) as ProviderType) || 'openai';
      workspaceId = (formData.get('workspace_id') as string) || undefined;
    } else {
      const body = await req.json().catch(() => ({}));
      provider = body.provider || 'openai';
      workspaceId = body.workspaceId || body.workspace_id;
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${proto}://${host}`;

    const oauthManager = GalxOAuthManager.getInstance();
    const details = oauthManager.generateDeviceAuthorization(provider, {
      workspaceId,
      host: baseUrl,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined
    });

    return NextResponse.json({
      device_code: details.deviceCode,
      user_code: details.userCode,
      verification_uri: details.verificationUri,
      verification_uri_complete: details.verificationUriComplete,
      expires_in: details.expiresIn,
      interval: details.interval
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache'
      }
    });
  } catch (err: any) {
    const sanitized = GalxModelRouter.sanitizeUpstreamError(err?.message || 'Failed to initiate device flow');
    return NextResponse.json(
      { error: 'server_error', error_description: sanitized },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export const POST = withDeveloperAccess(previewPOST);
