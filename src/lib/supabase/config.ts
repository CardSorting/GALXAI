/**
 * GALXAI: Supabase PostgreSQL Configuration & Environment Resolution
 * Provides validated credentials, timeout bounds, and connection pooling constants.
 */

export interface SupabaseConfig {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly supabaseServiceRoleKey: string;
  readonly databaseUrl?: string;
  readonly poolSize: number;
  readonly requestTimeoutMs: number;
  readonly isConfigured: boolean;
}

export function getSupabaseConfig(): SupabaseConfig {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://galxai-gateway.supabase.co';

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    supabaseAnonKey;

  const databaseUrl = process.env.DATABASE_URL;

  const isConfigured = Boolean(
    (supabaseUrl && supabaseAnonKey) || (supabaseUrl && supabaseServiceRoleKey) || databaseUrl
  );

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    databaseUrl,
    poolSize: Number.parseInt(process.env.SUPABASE_POOL_SIZE || '20', 10),
    requestTimeoutMs: Number.parseInt(process.env.SUPABASE_TIMEOUT_MS || '15000', 10),
    isConfigured
  };
}
