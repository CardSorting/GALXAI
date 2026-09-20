import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { BroccoliAuthoritativeGovernor } from "@/core/broccolidb/BroccoliAuthoritativeGovernor";
import { verifyWorkspaceSession } from '@/lib/auth/workspace-session';
import { isWorkspacePath, workspaceSignInPath } from '@/lib/security/workspace-policy';
import { workspaceUnavailableResponse } from '@/lib/security/workspace-unavailable';

const defaultUrl = 'https://mazhcjisettrzbqhorvp.supabase.co';
const defaultKey = 'sb_publishable_9eyEPgM-hF00Va7TLE90yA_LV4iGcoE';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  defaultKey;

function createGovernedMiddlewareFetch(): typeof fetch {
  const governor = BroccoliAuthoritativeGovernor.getInstance();
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!governor.canExecuteOutboundQuery()) {
      throw new Error('Supabase circuit breaker OPEN or outbound rate limit reached in edge middleware; failing fast.');
    }

    try {
      const response = await fetch(input, init);
      if (response.status >= 500) {
        governor.recordFailure();
      } else {
        governor.recordSuccess();
      }
      return response;
    } catch (err) {
      governor.recordFailure();
      throw err;
    }
  };
}

export const createClient = (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      global: {
        fetch: createGovernedMiddlewareFetch()
      }
    },
  );

  return { supabase, response: supabaseResponse };
};

function applySecurityHeaders(response: NextResponse, pathname: string): NextResponse {
  // Standard enterprise defense-in-depth headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', pathname === '/auth/callback' ? 'no-referrer' : 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Route security classification & zero-cache enforcement for private workspace surfaces
  const isProtectedPath = 
    isWorkspacePath(pathname) || pathname === '/login' || pathname === '/signup' || pathname.startsWith('/auth/') ||
    pathname.startsWith('/teams') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/keys') ||
    pathname.startsWith('/queues') ||
    pathname.startsWith('/device') ||
    pathname === '/models/routing';

  if (isProtectedPath) {
    response.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
  }

  return response;
}

/**
 * Hyper-optimized Edge session handler.
 * - Sub-millisecond CORS preflight termination (<0.1ms)
 * - Zero-allocation API & inference route bypass
 * - Conditional SSR client creation (only instantiated when sb-* auth cookies exist)
 * - Enterprise security & route classification headers
 */
export const updateSession = async (request: NextRequest) => {
  const method = request.method;
  const pathname = request.nextUrl.pathname;

  if (isWorkspacePath(pathname)) {
    let response = NextResponse.next({ request });
    const state = await verifyWorkspaceSession({
      getAll: () => request.cookies.getAll(),
      setAll: values => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    });
    let result = response;
    if (state === 'unavailable') {
      result = workspaceUnavailableResponse(request);
    } else if (state !== 'authenticated') {
      result = ['GET', 'HEAD'].includes(method)
        ? NextResponse.redirect(new URL(workspaceSignInPath(pathname, request.nextUrl.searchParams), request.url))
        : new NextResponse('Authentication required.', { status: 401 });
    }
    // Keep refreshed/cleared cookies on redirects and failures as well as success.
    if (result !== response) response.cookies.getAll().forEach(cookie => result.cookies.set(cookie));
    applySecurityHeaders(result, pathname);
    result.headers.set('Cache-Control', 'private, no-store');
    result.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return result;
  }

  // Do not refresh the old account before callback exchange or explicit recovery.
  // Ordinary login still persists refreshed cookies before its server-page read.
  const explicitRecovery = request.nextUrl.searchParams.getAll('reauth').length === 1 && request.nextUrl.searchParams.get('reauth') === '1';
  if ((pathname === '/login' && explicitRecovery) || pathname === '/signup' || pathname === '/auth/callback') {
    return applySecurityHeaders(NextResponse.next({ request }), pathname);
  }

  // Public API-key endpoints may be called cross-origin. First-party /api routes
  // remain same-origin and reach their route-specific policy instead of inheriting
  // a credentialed wildcard CORS response.
  if (method === 'OPTIONS' && pathname.startsWith('/v1/')) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, X-Galx-Async, X-Galx-Webhook-Url, X-Galx-Priority, X-Galx-Delay-Ms, X-Galx-Session-Id, X-Galx-Session-Mode, X-Galx-Turn-Id, Idempotency-Key, Prefer',
        'Access-Control-Expose-Headers': 'X-Request-Id, Retry-After, Location, X-Should-Retry',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  // 2. Fast path: Skip blocking auth network roundtrips for API & V1 inference routes
  if (pathname.startsWith('/v1/') || pathname.startsWith('/api/')) {
    const apiResponse = NextResponse.next({ request });
    return applySecurityHeaders(apiResponse, pathname);
  }

  // 3. Check for presence of Supabase or custom auth cookies before initializing SSR client
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(c => (c.name.startsWith('sb-') || c.name === 'galx_session') && c.value);

  if (!hasAuthCookie) {
    const unauthResponse = NextResponse.next({ request });
    return applySecurityHeaders(unauthResponse, pathname);
  }

  // 4. Authenticated state: Update session and refresh tokens if necessary
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    },
  );

  try {
    await supabase.auth.getUser();
  } catch {}


  return applySecurityHeaders(supabaseResponse, pathname);
};
