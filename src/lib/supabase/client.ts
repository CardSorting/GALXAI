/**
 * GALXAI: Supabase PostgreSQL Client Factory
 * Produces strictly typed Supabase clients for serverless runtimes, background engines,
 * edge middleware, and user-authenticated requests.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getSupabaseConfig } from './config';
import { BroccoliAuthoritativeGovernor } from '@/core/broccolidb/BroccoliAuthoritativeGovernor';

let adminClientInstance: SupabaseClient<Database> | null = null;
let defaultClientInstance: SupabaseClient<Database> | null = null;

export class SupabaseCircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseCircuitBreakerError';
  }
}

function createGovernedFetch(): typeof fetch {
  const governor = BroccoliAuthoritativeGovernor.getInstance();
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!governor.canExecuteOutboundQuery()) {
      throw new SupabaseCircuitBreakerError('Supabase circuit breaker OPEN or outbound rate limit reached; using local BroccoliDB cache.');
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

/**
 * Returns the privileged admin Supabase client (Service Role).
 * Used by backend routing substrates, queue dispatchers, crypto vaults, and background workers.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (adminClientInstance) {
    return adminClientInstance;
  }

  const config = getSupabaseConfig();
  const configured = isSupabaseConfigured();
  const key = config.supabaseServiceRoleKey || config.supabaseAnonKey || 'sb_local_dev_service_role';

  adminClientInstance = createClient<Database>(config.supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-client-info': 'galxai-backend-substrate/3.0.0'
      },
      fetch: !configured
        ? (async () => {
            throw new Error('Supabase not configured in local environment; using memory cache.');
          }) as unknown as typeof fetch
        : createGovernedFetch()
    }
  });

  return adminClientInstance;
}

/**
 * Returns a standard Supabase client with optional user session token for RLS scoped access.
 */
export function getSupabaseClient(accessToken?: string): SupabaseClient<Database> {
  const config = getSupabaseConfig();
  const configured = isSupabaseConfigured();
  const key = config.supabaseAnonKey || config.supabaseServiceRoleKey || 'sb_local_dev_anon_key';

  if (!accessToken && defaultClientInstance) {
    return defaultClientInstance;
  }

  const client = createClient<Database>(config.supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-client-info': 'galxai-client-substrate/3.0.0',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      fetch: !configured
        ? (async () => {
            throw new Error('Supabase not configured in local environment; using memory cache.');
          }) as unknown as typeof fetch
        : createGovernedFetch()
    }
  });

  if (!accessToken) {
    defaultClientInstance = client;
  }

  return client;
}

/**
 * Validates if valid Supabase connection environment variables are present.
 */
export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(
    config.supabaseUrl &&
    (config.supabaseServiceRoleKey || config.supabaseAnonKey) &&
    !config.supabaseUrl.includes('galxai-gateway.supabase.co')
  );
}

/**
 * Resets cached client instances (useful during testing).
 */
export function resetSupabaseClients(): void {
  adminClientInstance = null;
  defaultClientInstance = null;
}
