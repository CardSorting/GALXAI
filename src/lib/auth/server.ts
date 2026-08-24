/**
 * GALXAI: Enterprise Next.js Server Components & Route Handlers Auth Utilities
 * Drop-in helpers for Server Components, Server Actions, Route Handlers, and Middleware.
 * Sub-microsecond cryptographic verification, BroccoliDB L1 hot session cache,
 * and Supabase RLS integration.
 */

import { cookies, headers } from 'next/headers';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { OAuthRepository } from '@/lib/supabase/repositories/OAuthRepository';
import type {
  GalxUserSession,
  AuthSessionClaims,
  OAuthIdentityRecord
} from '@/core/contracts/GalxContracts';

export interface ServerSessionResult {
  readonly authenticated: boolean;
  readonly session?: GalxUserSession;
  readonly claims?: AuthSessionClaims;
  readonly userId?: string;
  readonly token?: string;
  readonly isSudoElevated?: boolean;
  readonly error?: string;
}

/**
 * Resolves the authenticated session from cookies, authorization headers, or API keys
 * with sub-microsecond cryptographic verification. Safe for Server Components & Actions.
 */
export async function getGalxSession(): Promise<ServerSessionResult> {
  try {
    let token: string | undefined = undefined;

    // 1. Try Next.js dynamic cookies()
    try {
      const cookieStore = await cookies();
      token = cookieStore.get('galx_session')?.value || cookieStore.get('token')?.value;
    } catch {}

    // 2. Try dynamic headers()
    if (!token) {
      try {
        const headerStore = await headers();
        const authHeader = headerStore.get('authorization');
        if (authHeader) {
          const match = authHeader.match(/^Bearer\s+["']?([^"'\s]+)["']?$/i);
          if (match) token = match[1];
        }
        if (!token) {
          token = headerStore.get('x-api-key') || headerStore.get('x-galx-key') || undefined;
        }
      } catch {}
    }

    if (!token) {
      return {
        authenticated: false,
        error: 'NO_SESSION_COOKIE_OR_HEADER'
      };
    }

    const authEngine = GalxAuthEngine.getInstance();
    const verified = await authEngine.verifySession(token);

    if (!verified.valid || !verified.claims) {
      return {
        authenticated: false,
        error: verified.error || 'INVALID_SESSION'
      };
    }

    const isSudoElevated = Boolean(
      verified.claims.sudoUntilMs && verified.claims.sudoUntilMs > Date.now()
    );

    return {
      authenticated: true,
      session: verified.session,
      claims: verified.claims,
      userId: verified.claims.sub,
      token,
      isSudoElevated
    };
  } catch (err: any) {
    return {
      authenticated: false,
      error: err.message || 'SESSION_RESOLUTION_ERROR'
    };
  }
}

/**
 * Asserts that the current request has a valid authenticated session.
 * Throws an Error with 401 status if unauthenticated.
 */
export async function requireGalxSession(): Promise<NonNullable<ServerSessionResult & { session: GalxUserSession; claims: AuthSessionClaims; userId: string }>> {
  const sessionResult = await getGalxSession();
  if (!sessionResult.authenticated || !sessionResult.session || !sessionResult.claims || !sessionResult.userId) {
    throw new Error('UNAUTHORIZED: Authentication required to access this resource');
  }
  return sessionResult as any;
}

/**
 * Asserts that the current request is in an active SUDO elevation mode.
 * Throws an Error with 403 status if SUDO mode has expired.
 */
export async function requireSudoElevation(): Promise<NonNullable<ServerSessionResult & { session: GalxUserSession; claims: AuthSessionClaims; userId: string }>> {
  const sessionResult = await requireGalxSession();
  if (!sessionResult.isSudoElevated) {
    throw new Error('FORBIDDEN_SUDO_REQUIRED: Step-up SUDO elevation required for high-risk operation');
  }
  return sessionResult;
}

/**
 * Resolves all connected OAuth provider identities (OpenAI, xAI Grok) for the current user.
 */
export async function getLinkedIdentities(): Promise<readonly OAuthIdentityRecord[]> {
  const sessionResult = await getGalxSession();
  if (!sessionResult.authenticated || !sessionResult.userId) {
    return [];
  }
  const oauthRepo = OAuthRepository.getInstance();
  return oauthRepo.findIdentitiesByUserId(sessionResult.userId);
}
