import { NextRequest, NextResponse } from 'next/server';
import { GalxOAuthManager } from '../../../../../../core/auth/GalxOAuthManager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Standard RFC 8628 OAuth 2.0 Device Token Polling Endpoint.
 * Resolves authorization_pending, slow_down, expired_token, access_denied, or issued credentials.
 */
export async function POST(req: NextRequest) {
  try {
    let deviceCode = '';
    let grantType = '';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      deviceCode = (formData.get('device_code') as string) || '';
      grantType = (formData.get('grant_type') as string) || '';
    } else {
      const body = await req.json().catch(() => ({}));
      deviceCode = body.device_code || body.deviceCode || '';
      grantType = body.grant_type || body.grantType || '';
    }

    if (!deviceCode) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing device_code' },
        { status: 400 }
      );
    }

    const oauthManager = GalxOAuthManager.getInstance();
    const result = await oauthManager.pollDeviceToken(deviceCode);

    if (result.success && result.data) {
      return NextResponse.json(result.data, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache'
        }
      });
    }

    const errorStatus = result.error === 'authorization_pending' || result.error === 'slow_down' ? 400 : 400;

    return NextResponse.json(
      {
        error: result.error || 'invalid_grant',
        error_description: result.error_description || 'Device authorization pending',
        interval: result.interval
      },
      {
        status: errorStatus,
        headers: {
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache'
        }
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'server_error', error_description: err.message || 'Polling error' },
      { status: 500 }
    );
  }
}
