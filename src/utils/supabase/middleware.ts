import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const defaultUrl = 'https://mazhcjisettrzbqhorvp.supabase.co';
const defaultKey = 'sb_publishable_9eyEPgM-hF00Va7TLE90yA_LV4iGcoE';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  defaultKey;

export const createClient = (request: NextRequest) => {
  // Create an unmodified response
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
    },
  );

  return { supabase, response: supabaseResponse };
};

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request,
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
    },
  );

  const pathname = request.nextUrl.pathname;
  // Fast path: Skip blocking auth network roundtrips for API inference routes
  if (pathname.startsWith('/v1/') || pathname.startsWith('/api/')) {
    return supabaseResponse;
  }

  // Only refresh auth token if Supabase auth cookies are actually present
  const hasAuthCookie = request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.value);
  if (hasAuthCookie) {
    try {
      await supabase.auth.getUser();
    } catch {}
  }

  supabaseResponse.headers.set('X-Edge-FastPath', 'true');
  supabaseResponse.headers.set('Timing-Allow-Origin', '*');
  supabaseResponse.headers.set('Server-Timing', 'edge;dur=1, l1;desc="BroccoliDB"');

  return supabaseResponse;
};
