import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { accountClientOptions } from '@/lib/auth/account-client-options';
import { BroccoliAuthoritativeGovernor } from "@/core/broccolidb/BroccoliAuthoritativeGovernor";

const defaultUrl = 'https://galx.ai';
const defaultKey = 'sb_publishable_unconfigured';

const supabaseUrl = process.env.ACCOUNT_API_INTERNAL_URL || process.env.NEXT_PUBLIC_ACCOUNT_API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl;
const supabaseKey =
  process.env.NEXT_PUBLIC_ACCOUNT_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  defaultKey;

function createGovernedSsrFetch(): typeof fetch {
  const governor = BroccoliAuthoritativeGovernor.getInstance();
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!governor.canExecuteOutboundQuery()) {
      throw new Error('Supabase circuit breaker OPEN or outbound rate limit reached; using local BroccoliDB cache.');
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

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      ...accountClientOptions(),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
      global: {
        fetch: createGovernedSsrFetch()
      }
    },
  );
};
