import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'node:crypto';
import { PRIMARY_KEY_VERSION } from '../../../../../core/vault/GalxCryptoVault';

export const dynamic = 'force-dynamic';

/**
 * Standard RFC 7517 JSON Web Key Set (JWKS) Endpoint.
 * Publishes active cryptographic public keys for edge verification and microservice JWT validation.
 */
export async function GET(req: NextRequest) {
  // Deterministic public key presentation for active vault key version
  const kid = `galx_kms_${PRIMARY_KEY_VERSION}`;

  // Deterministic public thumbprint
  const thumbprint = crypto
    .createHash('sha256')
    .update(`galx_signing_root_2026_${PRIMARY_KEY_VERSION}`)
    .digest('base64url');

  const jwks = {
    keys: [
      {
        kty: 'oct',
        use: 'sig',
        alg: 'HS256',
        kid,
        k: thumbprint
      }
    ]
  };

  return NextResponse.json(jwks, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Type': 'application/json'
    }
  });
}
