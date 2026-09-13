import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import { hasInternalAccess } from '@/lib/security/internal-access';
import { sessionFailure, sessionResponse } from '@/lib/auth/session-http';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { PRIMARY_KEY_VERSION } from '@/core/vault/GalxCryptoVault';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/vault/re-wrap
 * Administrative zero-downtime KMS key re-wrapping pipeline for stored credentials.
 * Requires active Step-Up SUDO mode.
 */
async function previewPOST(req: NextRequest) {
  try {
    if (!hasInternalAccess(req.headers)) return sessionResponse({ error: 'Administrator authorization is required.' }, 403);
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
        { error: 'Additional verification is required.', elevationRequired: true },
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
  } catch (error) {
    return sessionFailure(error);
  }
}

export const POST = withDeveloperAccess(previewPOST);
