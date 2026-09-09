import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ciBuildEnvironment } from './build-ci.mjs';

test('CI builds have isolated endpoints and a fresh private, throwaway key', () => {
  const first = ciBuildEnvironment({ CI: 'true', NEXT_PUBLIC_SUPABASE_URL: 'https://production.example' }, []);
  const second = ciBuildEnvironment({ CI: 'true' }, []);
  assert.equal(first.NEXT_PUBLIC_SUPABASE_URL, 'https://supabase.invalid');
  assert.equal(first.NODE_ENV, 'production');
  assert.equal(first.GALX_VAULT_KEY_V1.length, 64);
  assert.notEqual(first.GALX_VAULT_KEY_V1, second.GALX_VAULT_KEY_V1);
  assert.notEqual(first.GALX_AUDIT_SIGNING_SECRET, first.GALX_VAULT_KEY_V1);
  assert.notEqual(first.GALX_AUDIT_SIGNING_SECRET, second.GALX_AUDIT_SIGNING_SECRET);
  assert(!Object.entries(first).some(([key, value]) => key.startsWith('NEXT_PUBLIC_') && value === first.GALX_VAULT_KEY_V1));
});

test('CI builds reject deployment environments and production authority', () => {
  for (const environment of [{}, { CI: 'true', VERCEL: '1' }, { CI: 'true', VERCEL_ENV: 'preview' },
    { CI: 'true', DATABASE_URL: 'private' }, { CI: 'true', SUPABASE_SECRET_KEY: 'private' },
    { CI: 'true', GALX_VAULT_KEY_V1: 'private' }, { CI: 'true', GALX_AUDIT_SIGNING_SECRET: 'private' },
    { CI: 'true', RELAY_ADMIN_API_KEYS: 'private' }]) {
    assert.throws(() => ciBuildEnvironment(environment, []), /CI|credentials/);
  }
});

test('CI builds refuse every production dotenv source', () => {
  for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    assert.throws(() => ciBuildEnvironment({ CI: 'true' }, [name]), /dotenv/);
  }
});
