import { NextRequest, NextResponse } from 'next/server';
import { GalxOAuthManager } from '../../../../../../core/auth/GalxOAuthManager';
import { GalxAuthEngine } from '../../../../../../core/auth/GalxAuthEngine';

/**
 * Endpoint to approve an RFC 8628 Device Authorization code from the browser.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userCode = body.userCode || body.user_code || '';
    const sessionToken = body.sessionToken || body.session_token || req.cookies.get('galx_session')?.value || '';

    if (!userCode) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing userCode' },
        { status: 400 }
      );
    }

    // Verify session
    let tokenRecord;
    let validatedToken = sessionToken;

    if (sessionToken) {
      const authEngine = GalxAuthEngine.getInstance();
      const verified = await authEngine.verifySession(sessionToken, false);
      if (verified.valid && verified.claims) {
        validatedToken = sessionToken;
      }
    }

    if (!validatedToken) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'You must be signed in with OpenAI or xAI to authorize a device.' },
        { status: 401 }
      );
    }

    const oauthManager = GalxOAuthManager.getInstance();
    const approved = oauthManager.approveDeviceCode(userCode, validatedToken, tokenRecord);

    if (!approved) {
      return NextResponse.json(
        { error: 'invalid_code', error_description: 'The code is invalid, expired, or already used.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Device authorized successfully. You can return to your terminal.'
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'server_error', error_description: err.message || 'Approval failed' },
      { status: 500 }
    );
  }
}
