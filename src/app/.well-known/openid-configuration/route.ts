import { NextRequest, NextResponse } from 'next/server';

/**
 * Standard OpenID Connect Discovery 1.0 Endpoint.
 * Exposes authoritative endpoints and cryptographic capabilities to client libraries & SDKs.
 */
export async function GET(req: NextRequest) {
  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const baseUrl = `${proto}://${host}`;

  return NextResponse.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/auth/oauth/url`,
    token_endpoint: `${baseUrl}/api/auth/oauth/callback`,
    userinfo_endpoint: `${baseUrl}/api/auth/session`,
    introspection_endpoint: `${baseUrl}/api/auth/oauth/introspect`,
    revocation_endpoint: `${baseUrl}/api/auth/oauth/revoke`,
    jwks_uri: `${baseUrl}/api/auth/vault/jwks`,
    response_types_supported: ['code', 'token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256', 'RS256'],
    scopes_supported: ['openid', 'profile', 'email', 'offline_access', 'model.request'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_basic', 'client_secret_post'],
    code_challenge_methods_supported: ['S256']
  }, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Type': 'application/json'
    }
  });
}
