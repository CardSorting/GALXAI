/** Destructive fixtures are confined to an explicitly named local test database. */
import assert from 'node:assert/strict';
import pg from 'pg';
import { replaceRegistryCredential } from '../src/relay/shard-registry.js';
const url = new URL(process.env.GALX_CREDENTIAL_TEST_DATABASE_URL || 'postgresql://invalid/');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/galx_credential_test') throw Error('Set GALX_CREDENTIAL_TEST_DATABASE_URL to the local galx_credential_test database.');
// Injected local SQL clients must never fall back to inherited production authority.
for (const key of Object.keys(process.env)) if (key === 'DATABASE_URL' || /^(NEXT_PUBLIC_)?SUPABASE_/.test(key)) delete process.env[key];
const pool = new pg.Pool({ connectionString: url.href, max: 2 });
try {
  await pool.query(`CREATE TYPE public.galx_credential_status AS ENUM ('healthy', 'cooldown', 'exhausted', 'dead', 'paused', 'revoked');
    CREATE TABLE public.galx_shard_accounts (
    id text PRIMARY KEY, user_id text NOT NULL, provider text NOT NULL,
    encrypted_ciphertext text NOT NULL, encrypted_iv text NOT NULL, encrypted_tag text NOT NULL, key_version text,
    credential_expires_at_ms bigint, updated_at timestamptz DEFAULT now(), registry_revision bigint DEFAULT 1,
    permission_retracted boolean DEFAULT false, status public.galx_credential_status DEFAULT 'healthy', remaining_tokens bigint DEFAULT 99,
    active_in_flight_count integer DEFAULT 7, cooldown_until_ms bigint DEFAULT 1800000000000);
    ALTER TABLE public.galx_shard_accounts ENABLE ROW LEVEL SECURITY;
    CREATE FUNCTION public.bump_test_revision() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
      BEGIN NEW.registry_revision := OLD.registry_revision + 1; RETURN NEW; END $$;
    CREATE TRIGGER test_revision BEFORE UPDATE ON public.galx_shard_accounts FOR EACH ROW EXECUTE FUNCTION public.bump_test_revision();
    INSERT INTO public.galx_shard_accounts(id,user_id,provider,encrypted_ciphertext,encrypted_iv,encrypted_tag,key_version)
    VALUES ('fixture-shard','fixture-owner','openai','cipher-old','iv-old','tag-old','v1')`);
  const row = (await pool.query('SELECT * FROM public.galx_shard_accounts')).rows[0];
  const first = { encrypted_ciphertext: 'cipher-first', encrypted_iv: 'iv-first', encrypted_tag: 'tag-first', key_version: 'v1' };
  const second = { encrypted_ciphertext: 'cipher-second', encrypted_iv: 'iv-second', encrypted_tag: 'tag-second', key_version: 'v1' };
  const [a, b] = await Promise.all([pool.connect(), pool.connect()]);
  let results: boolean[];
  try { results = await Promise.all([replaceRegistryCredential(row, first, 1900000000000, a), replaceRegistryCredential(row, second, 1900000000000, b)]); }
  finally { a.release(); b.release(); }
  assert.deepEqual(results.slice().sort(), [false, true]);
  const refreshed = (await pool.query('SELECT * FROM public.galx_shard_accounts')).rows[0];
  assert.equal(refreshed.encrypted_tag, results[0] ? first.encrypted_tag : second.encrypted_tag);
  assert.equal(refreshed.registry_revision, '2'); assert.equal(refreshed.active_in_flight_count, 7);
  assert.equal(refreshed.remaining_tokens, '99'); assert.equal(refreshed.cooldown_until_ms, '1800000000000');
  await pool.query("UPDATE public.galx_shard_accounts SET remaining_tokens=17, status='paused'");
  assert(await replaceRegistryCredential(refreshed, { ...first, encrypted_tag: 'tag-third' }, 1900000000100, pool));
  const final = (await pool.query('SELECT * FROM public.galx_shard_accounts')).rows[0];
  assert.equal(final.remaining_tokens, '17'); assert.equal(final.status, 'paused'); assert.equal(final.registry_revision, '4');
  assert.equal(await replaceRegistryCredential({ ...final, user_id: 'other-owner' }, second, 1900000000200, pool), false);
  await pool.query('UPDATE public.galx_shard_accounts SET permission_retracted=true');
  assert.equal(await replaceRegistryCredential(final, second, 1900000000200, pool), false);
  assert.equal(await replaceRegistryCredential({ ...final, user_id: 'other-owner' }, second, 1900000000200, pool), false);
  await pool.query("ALTER TYPE public.galx_credential_status ADD VALUE 'quarantined'");
  for (const status of ['revoked', 'dead', 'quarantined']) {
    await pool.query('UPDATE public.galx_shard_accounts SET permission_retracted=false, status=$1', [status]);
    assert.equal(await replaceRegistryCredential(final, second, 1900000000200, pool), false, 'A concurrent blocked status cannot refresh');
  }
  console.log('PostgreSQL verified: legacy and extended enums; concurrent refresh fencing; quota churn; holds, counters, ownership and revocation.');
} finally { await pool.end(); }
