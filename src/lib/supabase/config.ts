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
  readonly hasDataApiCredential: boolean;
  readonly hasAdminCredential: boolean;
}

function jwtRole(key: string): string | undefined {
  const payload = key.split('.')[1];
  if (!payload) return undefined;
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = globalThis.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
    return JSON.parse(decoded)?.role;
  } catch {
    return undefined;
  }
}

function isAdminCredential(key: string): boolean {
  return key.startsWith('sb_secret_') || jwtRole(key) === 'service_role';
}

export function getSupabaseConfig(): SupabaseConfig {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const configuredPublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  const configuredServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    '';

  const supabaseUrl =
    configuredUrl || 'http://127.0.0.1:54321';

  const supabaseAnonKey =
    configuredPublishableKey || 'sb_publishable_unconfigured';

  const supabaseServiceRoleKey = configuredServiceRoleKey;

  const databaseUrl = process.env.DATABASE_URL;

  const isConfigured = Boolean(
    databaseUrl || (configuredUrl && (configuredPublishableKey || isAdminCredential(configuredServiceRoleKey)))
  );

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    databaseUrl,
    poolSize: Number.parseInt(process.env.SUPABASE_POOL_SIZE || '20', 10),
    requestTimeoutMs: Number.parseInt(process.env.SUPABASE_TIMEOUT_MS || '15000', 10),
    isConfigured,
    hasDataApiCredential: Boolean(configuredUrl && configuredPublishableKey),
    hasAdminCredential: Boolean(configuredUrl && isAdminCredential(configuredServiceRoleKey))
  };
}
