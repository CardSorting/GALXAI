import { NextRequest, NextResponse } from 'next/server';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { PRIMARY_KEY_VERSION } from '@/core/vault/GalxCryptoVault';

export const runtime = 'nodejs';

/**
 * POST /api/auth/vault/re-wrap
 * Administrative zero-downtime KMS key re-wrapping pipeline for stored credentials.
 * Requires active Step-Up SUDO mode.
 */
export async function POST(req: NextRequest) {
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
      totalShardsScanned: result.total,
      shardsReencrypted: result.reencrypted,
      message: `Successfully re-wrapped ${result.reencrypted} shard credentials to KMS key version '${targetKeyVersion}'.`
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to re-wrap vault keys' },
      { status: 500 }
    );
  }
}
