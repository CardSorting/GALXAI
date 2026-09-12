import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { PRIMARY_KEY_VERSION } from '@/core/vault/GalxCryptoVault';

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
 * POST /api/auth/vault/re-wrap
 * Administrative zero-downtime KMS key re-wrapping pipeline for stored credentials.
 * Requires active Step-Up SUDO mode.
 */
async function previewPOST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const auth = await authEngine.resolveAuthIdentity(req, 'admin:sudo');

    if (!auth.authenticated || !auth.session) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid session bearer token is required' },
        { status: 401 }
      );
    }

    // Enforce Step-Up SUDO elevation check
    const sudoCheck = authEngine.requireSudoElevation(auth);
    if (!sudoCheck.elevated) {
      return NextResponse.json(
        { error: sudoCheck.error, elevationRequired: true },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const targetKeyVersion = body.targetKeyVersion || PRIMARY_KEY_VERSION;

    const result = await authEngine.reencryptVaultShards(targetKeyVersion);

    return NextResponse.json({
      success: true,
      targetKeyVersion,
      totalCredentialsScanned: result.total,
      credentialsReencrypted: result.reencrypted,
      message: `Successfully re-wrapped ${result.reencrypted} credentials to KMS key version '${targetKeyVersion}'.`
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to re-wrap vault keys' },
      { status: 500 }
    );
  }
}

export const POST = withDeveloperAccess(previewPOST);
