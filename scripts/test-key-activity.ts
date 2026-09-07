import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { readKeyActivity } from '../src/lib/keys/activity';
import { keyActivityCsv } from '../src/lib/keys/activityCsv';

// This fixture is intentionally restricted to the isolated local test server.
const pool = new Pool({ host: '127.0.0.1', port: 55439, user: 'seats_test', database: 'postgres' });
const db = await pool.connect();
const schema = `key_activity_test_${Date.now()}`;
try {
  await db.query(`CREATE SCHEMA ${schema}`);
  await db.query(`SET search_path TO ${schema}`);
  await db.query(`CREATE TABLE galx_workspaces (id uuid PRIMARY KEY);
    CREATE TABLE galx_wallets (id uuid PRIMARY KEY);
    CREATE TYPE galx_wallet_transaction_type AS ENUM ('usage_draw', 'deposit');`);
  const migration = readFileSync('supabase/migrations/20260822000001_galxai_schema_core.sql', 'utf8');
  for (const table of ['galx_developer_keys', 'galx_wallet_transactions']) {
    const start = migration.indexOf(`CREATE TABLE IF NOT EXISTS ${table} (`);
    await db.query(migration.slice(start, migration.indexOf('\n);', start) + 3));
  }
  await db.query(`INSERT INTO galx_wallets VALUES ('00000000-0000-0000-0000-000000000001');
    INSERT INTO galx_developer_keys (id,user_id,name,prefix,key_hash,is_revoked) VALUES
      ('key_owner','owner','Owner key','galx_live_abc','hash_a',true),
      ('key_other','other','PRIVATE OTHER NAME','galx_live_def','hash_b',false);`);
  const insert = async (user: string, key: string | null, type = 'usage_draw', age = '1 hour') => {
    await db.query(`INSERT INTO galx_wallet_transactions
      (wallet_id,user_id,transaction_type,amount_usd,balance_after_usd,description,api_key_id,model,prompt_tokens,completion_tokens,cached_tokens,created_at)
      VALUES ('00000000-0000-0000-0000-000000000001',$1,$2,-0.000123,5,'usage',$3,'test-model',100,20,30,NOW()-$4::interval)`, [user, type, key, age]);
  };
  await insert('owner', 'key_owner');
  await insert('other', 'key_other');
  await insert('owner', null);
  await insert('owner', 'deleted_key');
  await insert('owner', 'key_other'); // A bad attribution must never reveal another account's key metadata.
  await insert('owner', 'key_owner', 'deposit');
  await insert('owner', 'key_owner', 'usage_draw', '100 days');
  let result = await readKeyActivity(db, 'owner', new URLSearchParams());
  assert.equal(result.records.length, 4);
  assert.equal(result.keys.length, 1);
  assert.equal(result.keys[0].revoked, true);
  assert.equal(result.records.find(r => r.keyId === 'key_other')?.keyName, null);
  assert.equal(result.records[0].costUsd, 0.000123);
  assert.equal(result.records[0].promptTokens, 100);
  assert.equal(result.records[0].cachedTokens, 30);
  assert.equal((await readKeyActivity(db, 'nobody', new URLSearchParams())).records.length, 0);
  assert.equal((await readKeyActivity(db, 'owner', new URLSearchParams({ keyId: 'key_owner' }))).records.length, 1);
  assert.equal((await readKeyActivity(db, 'owner', new URLSearchParams({ q: 'Owner key' }))).records.length, 1);
  assert.equal((await readKeyActivity(db, 'owner', new URLSearchParams({ q: 'PRIVATE OTHER NAME' }))).records.length, 0);
  assert.equal((await readKeyActivity(db, 'owner', new URLSearchParams({ q: "' OR 1=1 --" }))).records.length, 0);
  assert.equal((await readKeyActivity(db, 'owner', new URLSearchParams({ userId: 'other' }))).records.length, 4);
  await assert.rejects(readKeyActivity(db, 'owner', new URLSearchParams({ days: '10000' })), /date range/);
  await assert.rejects(readKeyActivity(db, 'owner', new URLSearchParams({ cursor: 'invalid' })), /cursor/);
  await db.query(`INSERT INTO galx_wallet_transactions
    (wallet_id,user_id,transaction_type,amount_usd,balance_after_usd,description,api_key_id,model,created_at)
    SELECT '00000000-0000-0000-0000-000000000001','owner','usage_draw',-0.0001,5,'page test','key_owner','pagination',
      date_trunc('second', NOW()) + (n % 2) * INTERVAL '1 microsecond' FROM generate_series(1,102) n`);
  result = await readKeyActivity(db, 'owner', new URLSearchParams({ q: 'pagination' }));
  assert.equal(result.records.length, 100);
  assert.ok(result.nextCursor);
  const page2 = await readKeyActivity(db, 'owner', new URLSearchParams({ q: 'pagination', cursor: result.nextCursor! }));
  assert.equal(page2.records.length, 2);
  assert.equal(page2.nextCursor, null);
  assert.equal(new Set([...result.records, ...page2.records].map(r => r.id)).size, 102);
  const csv = keyActivityCsv([{ ...result.records[0], keyName: '=HYPERLINK("bad")', costUsd: 0.000123 }]);
  assert.ok(csv.includes("\"'=HYPERLINK(\"\"bad\"\")\""));
  assert.ok(csv.includes('0.000123'));
  assert.equal(csv.split('\r\n').length, 2);
  console.log('PASS: account isolation, key metadata isolation, saved charges, filters, cursor validation, microsecond pagination, and CSV escaping.');
} finally {
  await db.query(`DROP SCHEMA ${schema} CASCADE`);
  db.release(); await pool.end();
}
