import './lib/require-isolated-integration-env';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8, connectionTimeoutMillis: 2000 });
const owner = randomUUID();
const other = randomUUID();
const operator = `operator-${randomUUID()}`;
const autonomous = `actor-${randomUUID()}`;
let checks = 0;

async function insertAuthUser(id: string) {
  await pool.query('INSERT INTO auth.users(id) VALUES ($1)', [id]);
}

async function deniedAs(role: string, sql: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE ${role}`);
    await assert.rejects(client.query(sql), (error: any) => error?.code === '42501');
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
  }
}

try {
  const migration = readFileSync(new URL('../supabase/migrations/20260919120000_canonical_account_profiles_and_ownership_bridge.sql', import.meta.url), 'utf8');
  await pool.query(migration);

  await insertAuthUser(owner);
  await insertAuthUser(other);

  const signupTransaction = randomUUID();
  await pool.query(
    `INSERT INTO private.galx_signup_credit_grants
      (user_id, amount_usd, status, identity_hash, transaction_id, granted_at)
     VALUES ($1, 5, 'granted', repeat('b', 64), $2, now())`,
    [other, signupTransaction],
  );
  await pool.query('ALTER TABLE private.galx_signup_credit_grants DISABLE TRIGGER galx_attach_account_profile');
  await pool.query('UPDATE private.galx_signup_credit_grants SET account_profile_id = NULL WHERE user_id = $1', [other]);
  await pool.query('ALTER TABLE private.galx_signup_credit_grants ENABLE TRIGGER galx_attach_account_profile');

  await pool.query(migration);
  checks++;
  const profiles = (await pool.query(
    `SELECT p.id, p.account_class, p.auth_user_id, pref.locale, pref.timezone
     FROM private.galx_account_profiles AS p
     JOIN private.galx_account_profile_preferences AS pref ON pref.profile_id = p.id
     WHERE p.owner_key = ANY($1::text[])
     ORDER BY p.owner_key`,
    [[owner, other]],
  )).rows;
  assert.equal(profiles.length, 2);
  assert(profiles.every(row => row.account_class === 'human'));
  assert(profiles.some(row => row.auth_user_id === owner));
  checks++;

  const identity = (await pool.query(
    'SELECT profile_id FROM private.galx_account_identities WHERE account_id = $1',
    [owner],
  )).rows[0];
  assert.equal(identity.profile_id, profiles.find(row => row.auth_user_id === owner)?.id);
  checks++;

  const signupBridge = (await pool.query(
    'SELECT account_profile_id FROM private.galx_signup_credit_grants WHERE user_id = $1',
    [other],
  )).rows[0];
  assert.equal(signupBridge.account_profile_id, profiles.find(row => row.auth_user_id === other)?.id);
  checks++;

  const siteId = randomUUID();
  const site = (await pool.query(
    `INSERT INTO private.galx_site_workspaces(id, user_id, title)
     VALUES ($1, $2, 'Profile bridge')
     RETURNING account_profile_id`,
    [siteId, owner],
  )).rows[0];
  assert.equal(site.account_profile_id, identity.profile_id);
  checks++;

  await assert.rejects(
    pool.query(
      `INSERT INTO private.galx_site_workspaces(id, user_id, title, account_profile_id)
       VALUES ($1, $2, 'Wrong profile', $3)`,
      [randomUUID(), owner, profiles.find(row => row.auth_user_id === other)?.id],
    ),
    (error: any) => error?.code === '23514',
  );
  checks++;

  const prefsBefore = (await pool.query(
    `SELECT p.revision, pref.revision AS preference_revision
     FROM private.galx_account_profiles p
     JOIN private.galx_account_profile_preferences pref ON pref.profile_id = p.id
     WHERE p.owner_key = $1`,
    [owner],
  )).rows[0];
  await pool.query(
    'UPDATE private.galx_account_profiles SET display_name = $2, revision = revision + 1 WHERE owner_key = $1',
    [owner, 'Profile bridge test'],
  );
  await pool.query(
    'UPDATE private.galx_account_profile_preferences SET locale = $2, timezone = $3, revision = revision + 1 WHERE profile_id = (SELECT id FROM private.galx_account_profiles WHERE owner_key = $1)',
    [owner, 'es', 'America/Denver'],
  );
  const prefsAfter = (await pool.query(
    `SELECT p.display_name, p.revision, pref.locale, pref.timezone, pref.revision AS preference_revision
     FROM private.galx_account_profiles p
     JOIN private.galx_account_profile_preferences pref ON pref.profile_id = p.id
     WHERE p.owner_key = $1`,
    [owner],
  )).rows[0];
  assert.equal(prefsAfter.display_name, 'Profile bridge test');
  assert.equal(prefsAfter.locale, 'es');
  assert.equal(prefsAfter.timezone, 'America/Denver');
  assert.equal(Number(prefsAfter.revision), Number(prefsBefore.revision) + 1);
  assert.equal(Number(prefsAfter.preference_revision), Number(prefsBefore.preference_revision) + 1);
  await assert.rejects(
    pool.query('UPDATE private.galx_account_profiles SET display_name = $2 WHERE owner_key = $1', [owner, 'stale']),
    (error: any) => error?.code === '55000',
  );
  checks += 2;

  await pool.query(
    `INSERT INTO private.galx_account_identities(account_id, account_class)
     VALUES ($1, 'human'), ($2, 'autonomous')
     ON CONFLICT (account_id) DO NOTHING`,
    [operator, autonomous],
  );
  const run = (await pool.query(
    `INSERT INTO private.galx_autonomous_actor_runs(run_key, control_owner_account_id)
     VALUES ($1, $2) RETURNING run_id`,
    [`run-${randomUUID()}`, operator],
  )).rows[0].run_id;
  const actor = (await pool.query(
    `INSERT INTO private.galx_autonomous_actors(account_id, run_id, control_owner_account_id, provisioning_source)
     VALUES ($1, $2, $3, 'test') RETURNING actor_id`,
    [autonomous, run, operator],
  )).rows[0].actor_id;
  await pool.query(
    `INSERT INTO private.galx_autonomous_actor_configurations(actor_id, persona_ref, configuration_ref)
     VALUES ($1, 'persona:v1', 'config:v1')`,
    [actor],
  );
  await pool.query(
    `UPDATE private.galx_autonomous_actor_configurations
     SET persona_ref = 'persona:v2', configuration_ref = 'config:v2', configuration_version = 2
     WHERE actor_id = $1`,
    [actor],
  );
  assert.equal(Number((await pool.query(
    'SELECT count(*) FROM private.galx_autonomous_actor_configuration_versions WHERE actor_id = $1',
    [actor],
  )).rows[0].count), 2);
  await assert.rejects(
    pool.query(`UPDATE private.galx_autonomous_actor_configurations SET persona_ref = 'persona:bad' WHERE actor_id = $1`, [actor]),
    (error: any) => error?.code === '55000',
  );
  checks += 2;

  const entitlement = (await pool.query(
    `INSERT INTO private.galx_administrative_entitlements(account_id, entitlement_key, granted_by_account_id, reason)
     VALUES ($1, 'pro-v1', $2, 'Profile migration verification') RETURNING id`,
    [owner, operator],
  )).rows[0].id;
  await pool.query(
    `UPDATE private.galx_administrative_entitlements
     SET revoked_at = now(), revoked_by_account_id = $2
     WHERE id = $1`,
    [entitlement, operator],
  );
  const events = (await pool.query(
    `SELECT action FROM private.galx_administrative_entitlement_events
     WHERE entitlement_id = $1 ORDER BY event_id`,
    [entitlement],
  )).rows.map(row => row.action);
  assert.deepEqual(events, ['granted', 'revoked']);
  await assert.rejects(pool.query('DELETE FROM private.galx_administrative_entitlements WHERE id = $1', [entitlement]), (error: any) => error?.code === '55000');
  checks += 2;

  for (const table of [
    'galx_account_profiles',
    'galx_account_profile_preferences',
    'galx_autonomous_actor_configuration_versions',
    'galx_administrative_entitlement_events',
  ]) {
    const security = (await pool.query(
      'SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = $1::regclass',
      [`private.${table}`],
    )).rows[0];
    assert.equal(security.relrowsecurity, true);
    assert.equal(security.relforcerowsecurity, true);
    for (const role of ['anon', 'authenticated', 'service_role']) {
      await deniedAs(role, `SELECT * FROM private.${table}`);
    }
  }
  assert.equal((await pool.query("SELECT has_function_privilege('anon', 'private.galx_is_human_account(text)', 'EXECUTE') AS allowed")).rows[0].allowed, true);
  checks += 4 * 3 + 1;

  console.log(JSON.stringify({ checks, failed: 0, scope: 'disposable PostgreSQL; profile bridge, actor history, entitlement audit, RLS and authorization' }));
} finally {
  await pool.end();
}
