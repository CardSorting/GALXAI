/** Validation artifact only: never use production credentials or deploy this build. */
import { randomBytes } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export function ciBuildEnvironment(environment, rootFiles) {
  if (environment.CI !== 'true' || environment.VERCEL || environment.VERCEL_ENV) {
    throw new Error('This isolated build is for CI validation only, never deployment.');
  }
  const dotenvFiles = ['.env', '.env.local', '.env.production', '.env.production.local'];
  if (rootFiles.some(name => dotenvFiles.includes(name))) throw new Error('CI validation must not load local dotenv files.');
  if (Object.entries(environment).some(([key, value]) => value &&
    /^(DATABASE_URL|SUPABASE_(SECRET_KEY|SERVICE_ROLE_KEY|ACCESS_TOKEN|MANAGEMENT_API_TOKEN)|GALX_VAULT_.*|GALX_AUDIT_SIGNING_SECRET|RELAY_.*KEYS)$/.test(key))) {
    throw new Error('CI validation must not receive production authority or vault credentials.');
  }
  return { ...environment, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_APP_URL: 'https://galx.invalid', NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.invalid',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_ci_fixture', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_ci_fixture',
    SUPABASE_URL: 'https://supabase.invalid', GALX_VAULT_ACTIVE_KEY_VERSION: 'v1',
    GALX_VAULT_KEY_V1: randomBytes(48).toString('base64url'),
    GALX_AUDIT_SIGNING_SECRET: randomBytes(48).toString('base64url') };
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const environment = ciBuildEnvironment(process.env, readdirSync(process.cwd()));
  const require = createRequire(import.meta.url);
  const result = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], {
    env: environment, stdio: 'inherit', timeout: 600_000,
  });
  process.exitCode = result.status ?? 1;
}
