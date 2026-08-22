/**
 * GALXAI: Supabase PostgreSQL Client Factory
 * Produces strictly typed Supabase clients for serverless runtimes, background engines,
 * edge middleware, and user-authenticated requests.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getSupabaseConfig } from './config';

let adminClientInstance: SupabaseClient<Database> | null = null;
let defaultClientInstance: SupabaseClient<Database> | null = null;

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
  const key = config.supabaseServiceRoleKey || config.supabaseAnonKey || 'dummy-service-key-for-local';

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
        : undefined
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
  const key = config.supabaseAnonKey || config.supabaseServiceRoleKey || 'dummy-anon-key-for-local';

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
        : undefined
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
