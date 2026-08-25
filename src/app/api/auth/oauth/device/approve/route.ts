import { NextRequest, NextResponse } from 'next/server';
import { GalxOAuthManager } from '@/core/auth/GalxOAuthManager';
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
 * Endpoint to approve an RFC 8628 Device Authorization code from the browser.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userCode = (body.userCode || body.user_code || '').trim();
    
    // Resolve session token from Bearer header, body, or HTTP-only session cookie
    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
    const sessionToken = bearerToken || body.sessionToken || body.session_token || req.cookies.get('galx_session')?.value || '';

    if (!userCode) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing userCode' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Strictly verify session token against AuthEngine
    let validatedToken = '';

    if (sessionToken) {
      const authEngine = GalxAuthEngine.getInstance();
      const verified = await authEngine.verifySession(sessionToken, false);
      if (verified.valid && verified.claims && verified.session && !verified.session.isRevoked) {
        validatedToken = sessionToken;
      }
    }

    if (!validatedToken) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'You must be signed in with your provider identity to authorize a device.' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const oauthManager = GalxOAuthManager.getInstance();
    const approved = oauthManager.approveDeviceCode(userCode, validatedToken);

    if (!approved) {
      return NextResponse.json(
        { error: 'invalid_code', error_description: 'The code is invalid, expired, or already used.' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Device authorized successfully. You can return to your terminal.'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache'
      }
    });
  } catch (err: any) {
    const sanitizedError = GalxModelRouter.sanitizeUpstreamError(err?.message || 'Approval failed');
    return NextResponse.json(
      { error: 'server_error', error_description: sanitizedError },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
