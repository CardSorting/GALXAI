import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPostgresSslConfig } from '../src/lib/db/postgres';

const keys = ['DATABASE_URL', 'POSTGRES_SSL_MODE', 'POSTGRES_CA_CERT', 'SUPABASE_DB_SSL_MODE', 'SUPABASE_DB_CA_CERT'] as const;
function environment(values: Partial<Record<typeof keys[number], string>>, fn: () => void) {
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try { for (const key of keys) { delete process.env[key]; if (values[key] !== undefined) process.env[key] = values[key]; } fn(); }
  finally { for (const key of keys) { delete process.env[key]; if (saved[key] !== undefined) process.env[key] = saved[key]; } }
}
test('encrypted remote default and legacy settings remain compatible', () => {
  environment({ DATABASE_URL: 'postgresql://remote.invalid/db' }, () => assert.deepEqual(getPostgresSslConfig(), { rejectUnauthorized: false }));
  environment({ DATABASE_URL: 'postgresql://remote.invalid/db', SUPABASE_DB_SSL_MODE: 'verify-full', SUPABASE_DB_CA_CERT: 'legacy-ca' }, () => assert.deepEqual(getPostgresSslConfig(), { rejectUnauthorized: true, ca: 'legacy-ca' }));
});
test('plaintext is restricted to numeric loopback, including URL-level settings', () => {
  for (const host of ['127.0.0.1', '[::1]']) environment({ DATABASE_URL: `postgresql://${host}/galxai`, POSTGRES_SSL_MODE: 'disable' }, () => assert.equal(getPostgresSslConfig(), false));
  for (const host of ['localhost', 'remote.invalid', '127.0.0.1.remote.invalid', '192.168.1.2']) {
    environment({ DATABASE_URL: `postgresql://${host}/db`, POSTGRES_SSL_MODE: 'disable' }, () => assert.throws(() => getPostgresSslConfig(), /numeric loopback/));
    environment({ DATABASE_URL: `postgresql://${host}/db?sslmode=disable` }, () => assert.throws(() => getPostgresSslConfig(), /numeric loopback/));
  }
});
test('TLS overrides and conflicting policies fail closed', () => {
  for (const option of ['ssl=false', 'sslcert=override', 'sslrootcert=override', 'sslkey=override', 'uselibpqcompat=true']) environment({ DATABASE_URL: `postgresql://remote.invalid/db?${option}` }, () => assert.throws(() => getPostgresSslConfig(), /server environment/));
  environment({ DATABASE_URL: 'postgresql://127.0.0.1/db?sslmode=disable', POSTGRES_SSL_MODE: 'require' }, () => assert.throws(() => getPostgresSslConfig(), /Conflicting/));
  environment({ POSTGRES_SSL_MODE: 'disable' }, () => assert.throws(() => getPostgresSslConfig(), /numeric loopback/));
  environment({ POSTGRES_SSL_MODE: 'invalid' }, () => assert.throws(() => getPostgresSslConfig(), /must be/));
  environment({ POSTGRES_SSL_MODE: 'verify-full' }, () => assert.throws(() => getPostgresSslConfig(), /CA_CERT/));
  for (const option of ['host=remote.invalid', 'hostaddr=192.168.1.2', 'port=5432', 'dbname=other', '%68ost=remote.invalid']) environment({ DATABASE_URL: `postgresql://127.0.0.1/db?${option}`, POSTGRES_SSL_MODE: 'disable' }, () => assert.throws(() => getPostgresSslConfig(), /connection destination/));
  for (const option of ['sslmode=require&sslmode=disable', 'sslmode=require&SSLMode=disable']) environment({ DATABASE_URL: `postgresql://remote.invalid/db?${option}` }, () => assert.throws(() => getPostgresSslConfig(), /Duplicate/));
});
test('explicit peer authentication preserves the configured CA and precedence', () => {
  environment({ DATABASE_URL: 'postgresql://remote.invalid/db', POSTGRES_SSL_MODE: 'verify-full', POSTGRES_CA_CERT: 'new\\nca', SUPABASE_DB_SSL_MODE: 'require', SUPABASE_DB_CA_CERT: 'old' }, () => assert.deepEqual(getPostgresSslConfig(), { rejectUnauthorized: true, ca: 'new\nca' }));
  environment({ DATABASE_URL: 'postgresql://remote.invalid/db?sslmode=verify-full', POSTGRES_CA_CERT: 'ca' }, () => assert.throws(() => getPostgresSslConfig(), /not the URL/));
});
