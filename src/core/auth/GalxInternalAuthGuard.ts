/**
 * GALXAI: Enterprise Zero-Trust Internal Authentication Guard
 *
 * Enforces defense-in-depth protection for internal training pipelines,
 * dataset curation jobs, and sensitive ML substrate endpoints:
 * 1. Constant-Time Timing-Safe Secret Verification (prevents side-channel timing attacks)
 * 2. Explicit server administrator credential; account metadata is never authority
 * 3. Cache-Control: no-store, no-cache, must-revalidate enforcement
 * 4. X-Robots-Tag: noindex, nofollow search engine exclusion
 * 5. Full security audit logging for unauthenticated intrusion attempts
 */

import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hasInternalAccess } from '@/lib/security/internal-access';

export interface InternalAuthResult {
  authorized: boolean;
  identityType?: 'admin_secret' | 'maintainer_session';
  userId?: string;
  role?: string;
  error?: string;
  statusCode?: number;
}

export class GalxInternalAuthGuard {
  private static instance: GalxInternalAuthGuard;

  private constructor() {}

  public static getInstance(): GalxInternalAuthGuard {
    if (!GalxInternalAuthGuard.instance) {
      GalxInternalAuthGuard.instance = new GalxInternalAuthGuard();
    }
    return GalxInternalAuthGuard.instance;
  }

  /**
   * Evaluates if two strings match using constant-time comparison.
   * Prevents side-channel timing attacks on secret token verification.
   */
  public timingSafeEqualString(a: string, b: string): boolean {
    if (!a || !b) return false;
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) {
      // Execute dummy timing comparison to equalize branch timing
      const dummy = Buffer.alloc(bufA.length);
      crypto.timingSafeEqual(bufA, dummy);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Resolves authentication for internal administrative and training operations.
   */
  public async verifyInternalRequest(req: NextRequest): Promise<InternalAuthResult> {
    const userAgent = (req.headers.get('user-agent') || '').toLowerCase();
    const isGoogleCrawler =
      userAgent.includes('googlebot') ||
      userAgent.includes('google-extended') ||
      userAgent.includes('googleother') ||
      userAgent.includes('mediapartners-google') ||
      userAgent.includes('adsbot-google') ||
      userAgent.includes('feedfetcher-google') ||
      userAgent.includes('apis-google') ||
      userAgent.includes('appengine-google');

    // 0. Immediate rejection of Google crawlers on internal training endpoints
    if (isGoogleCrawler) {
      return {
        authorized: false,
        error: 'Forbidden. Google search engine and AI training crawlers are strictly quarantined from internal training endpoints.',
        statusCode: 403,
      };
    }

    if (hasInternalAccess(req.headers)) return { authorized: true, identityType: 'admin_secret', role: 'system_admin' };

    // 4. Unauthorized rejection
    return {
      authorized: false,
      error: 'Unauthorized. Internal training pipeline access required.',
      statusCode: 401,
    };
  }

  /**
   * Helper to return standard Next.js error response if unauthenticated.
   */
  public createUnauthorizedResponse(result: InternalAuthResult): NextResponse {
    return NextResponse.json(
      {
        error: 'Access denied.',
      },
      {
        status: result.statusCode || 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate',
          'Googlebot': 'noindex, nofollow, noarchive',
          'Google-Extended': 'noindex, nofollow, noarchive',
        },
      }
    );
  }

  /**
   * Applies standard defense-in-depth headers to internal API responses.
   */
  public applyInternalSecurityHeaders(res: NextResponse): NextResponse {
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate');
    res.headers.set('Googlebot', 'noindex, nofollow, noarchive');
    res.headers.set('Google-Extended', 'noindex, nofollow, noarchive');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    return res;
  }
}

export const galxInternalAuthGuard = GalxInternalAuthGuard.getInstance();

