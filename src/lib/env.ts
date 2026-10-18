/**
 * GALXAI: Enterprise Type-Safe Environment Specification
 * Single source of truth for runtime validation, client/server secret isolation,
 * and Vercel production deployment compliance.
 */

export interface ClientEnv {
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  NEXT_PUBLIC_GALX_EDGE_URL: string;
  PUBLIC_ASSETS_URL: string;
}

export interface ServerEnv extends ClientEnv {
  DATABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GALX_VAULT_MASTER_SECRET: string;
  GALX_VAULT_KEY: string;
  GALX_VAULT_ACTIVE_KEY_VERSION: string;
  OPENAI_API_KEY?: string;
  XAI_API_KEY?: string;
  GALX_API_KEY?: string;
  SUPABASE_POOL_SIZE: number;
  SUPABASE_TIMEOUT_MS: number;
  VERCEL_ENV?: string;
  VERCEL_REGION?: string;
  VERCEL_GIT_COMMIT_SHA?: string;
}

const DEFAULT_SUPABASE_URL = 'https://galx.ai';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_unconfigured';
const DEFAULT_VAULT_SECRET = 'galxai-apex-vault-master-secret-key-32b';

/**
 * Returns strongly typed client environment variables.
 * Safe for execution in client browser components.
 */
export function getClientEnv(): ClientEnv {
  return {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://galx.ai',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_ACCOUNT_API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_ACCOUNT_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      DEFAULT_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_ACCOUNT_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      DEFAULT_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_GALX_EDGE_URL: process.env.NEXT_PUBLIC_GALX_EDGE_URL || 'https://api.galx.ai',
    PUBLIC_ASSETS_URL: process.env.PUBLIC_ASSETS_URL || 'https://assets.galx.ai'
  };
}

/**
 * Returns strongly typed server environment variables.
 * Contains secrets (vault master key, database pooler URI, service role key).
 */
export function getServerEnv(): ServerEnv {
  const clientEnv = getClientEnv();
  const vaultSecret =
    process.env.GALX_VAULT_MASTER_SECRET ||
    process.env.GALX_VAULT_KEY ||
    DEFAULT_VAULT_SECRET;

  return {
    ...clientEnv,
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.ACCOUNT_API_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    GALX_VAULT_MASTER_SECRET: vaultSecret,
    GALX_VAULT_KEY: vaultSecret,
    GALX_VAULT_ACTIVE_KEY_VERSION: process.env.GALX_VAULT_ACTIVE_KEY_VERSION || 'v1',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    XAI_API_KEY: process.env.XAI_API_KEY,
    GALX_API_KEY: process.env.GALX_API_KEY,
    SUPABASE_POOL_SIZE: Number.parseInt(process.env.SUPABASE_POOL_SIZE || '20', 10),
    SUPABASE_TIMEOUT_MS: Number.parseInt(process.env.SUPABASE_TIMEOUT_MS || '15000', 10),
    VERCEL_ENV: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    VERCEL_REGION: process.env.VERCEL_REGION || 'local-edge',
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'head'
  };
}

export const env = typeof window === 'undefined' ? (getServerEnv() as ServerEnv) : (getClientEnv() as unknown as ServerEnv);
