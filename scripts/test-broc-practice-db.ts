import './lib/require-isolated-integration-env';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { buildBrocScene, type BrocCanon } from '../BROC/practice';
import { BrocPracticePersistenceError, BrocPracticeRepository } from '../BROC/store';
import { STAR_DEFINITIONS } from '../src/lib/stars/star-cohort';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 2000 });
const repo = new BrocPracticeRepository();
const star = STAR_DEFINITIONS[0];
const token = randomUUID();
let checks = 0;

async function rejectsInSavepoint(
  client: import('pg').PoolClient,
  operation: () => Promise<unknown>,
  expected: (error: unknown) => boolean,
): Promise<void> {
  const savepoint = `broc_reject_${++checks}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  await assert.rejects(operation, expected);
  await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
  await client.query(`RELEASE SAVEPOINT ${savepoint}`);
}

const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(
    `INSERT INTO private.galx_account_identities(account_id, account_class)
     VALUES ($1, 'human'), ($2, 'autonomous')`,
    [`broc-control-${token}`, `broc-star-${token}`],
  );
  const runId = (await client.query(
    `INSERT INTO private.galx_autonomous_actor_runs(run_key, control_owner_account_id, state)
     VALUES ($1, $2, 'active') RETURNING run_id`,
    [`broc-run-${token}`, `broc-control-${token}`],
  )).rows[0].run_id as string;
  const cohortId = (await client.query(
    `INSERT INTO private.galx_star_cohorts(run_id, cohort_key, label, state, activated_at)
     VALUES ($1, $2, 'BROC database fixture', 'active', now()) RETURNING cohort_id`,
    [runId, `broc-cohort-${token}`],
  )).rows[0].cohort_id as string;
  const actorId = (await client.query(
    `INSERT INTO private.galx_autonomous_actors
       (account_id, run_id, cohort_id, control_owner_account_id, provisioning_source, is_enabled)
     VALUES ($1, $2, $3, $4, 'test', true) RETURNING actor_id`,
    [`broc-star-${token}`, runId, cohortId, `broc-control-${token}`],
  )).rows[0].actor_id as string;
  await client.query(
    `INSERT INTO private.galx_star_cohort_members
       (cohort_id, actor_id, control_owner_account_id, is_enabled)
     VALUES ($1, $2, $3, true)`,
    [cohortId, actorId, `broc-control-${token}`],
  );
  const attemptId = (await client.query(
    `INSERT INTO private.galx_star_generation_attempts
       (cohort_id, actor_id, kind, opportunity_number, prompt, parameters)
     VALUES ($1, $2, 'content', 1, 'BROC database fixture prompt', '{}')
     RETURNING attempt_id`,
    [cohortId, actorId],
  )).rows[0].attempt_id as string;

  const initial = await repo.loadContext(client, actorId, star);
  assert.equal(initial.canon.handle, star.handle);
  assert.equal(initial.canon.revision, 1);
  const scene = buildBrocScene(initial, 1);
  await repo.appendScene(client, actorId, attemptId, scene);
  await repo.appendScene(client, actorId, attemptId, scene);
  await repo.appendJudgment(client, actorId, attemptId, {
    eventType: 'direction',
    summary: 'Test a deliberate change in material emphasis.',
    nextQuestion: 'What does the material remember?',
    productiveContradiction: true,
  });
  const history = await repo.loadContext(client, actorId, star);
  assert.equal(history.recentEvents.filter((event) => event.eventType === 'scene').length, 1);
  assert.equal(history.recentEvents[0].eventType, 'direction');
  checks += 4;

  await rejectsInSavepoint(client,
    () => repo.appendCandidate(client, actorId, attemptId, 1),
    (error: any) => error?.code === '23514');
  await client.query(
    `UPDATE private.galx_star_generation_attempts
     SET state = 'completed', completed_at = now(), asset_ids = ARRAY['broc-fixture-asset']::text[]
     WHERE attempt_id = $1`,
    [attemptId],
  );
  await repo.appendCandidate(client, actorId, attemptId, 1);
  await repo.appendCandidate(client, actorId, attemptId, 1);
  assert.equal(Number((await client.query(
    `SELECT count(*)::int AS count FROM private.galx_star_practice_events
     WHERE attempt_id = $1 AND event_type = 'candidate'`,
    [attemptId],
  )).rows[0].count), 1);
  checks += 2;

  await rejectsInSavepoint(client,
    () => client.query(`UPDATE private.galx_star_practice_events SET event_payload = '{}' WHERE attempt_id = $1`, [attemptId]),
    (error: any) => error?.code === '55000');
  await rejectsInSavepoint(client,
    () => client.query('DELETE FROM private.galx_star_practice_events WHERE attempt_id = $1', [attemptId]),
    (error: any) => error?.code === '55000');

  const nextCanon: BrocCanon = {
    ...initial.canon,
    revision: initial.canon.revision + 1,
    artisticPosition: `${initial.canon.artisticPosition} A reviewed revision.`,
  };
  await repo.appendCanonRevision(client, actorId, attemptId, initial.canonEventId, nextCanon, 'A reviewed test revision.');
  const revised = await repo.loadContext(client, actorId, star);
  assert.equal(revised.canon.revision, 2);
  await rejectsInSavepoint(client,
    () => repo.appendCanonRevision(client, actorId, attemptId, initial.canonEventId, { ...nextCanon, revision: 3 }, 'Stale write.'),
    (error) => error instanceof BrocPracticePersistenceError);
  checks += 2;

  const grants = (await client.query(`SELECT role_name,
      has_table_privilege(role_name, 'private.galx_star_practice_events', 'SELECT') AS can_select,
      has_table_privilege(role_name, 'private.galx_star_practice_events', 'INSERT') AS can_insert,
      has_table_privilege(role_name, 'private.galx_star_practice_events', 'UPDATE') AS can_update,
      has_table_privilege(role_name, 'private.galx_star_practice_events', 'DELETE') AS can_delete
    FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS roles(role_name)
    ORDER BY role_name`)).rows;
  assert.deepEqual(grants, [
    { role_name: 'anon', can_select: false, can_insert: false, can_update: false, can_delete: false },
    { role_name: 'authenticated', can_select: false, can_insert: false, can_update: false, can_delete: false },
    { role_name: 'service_role', can_select: false, can_insert: false, can_update: false, can_delete: false },
  ]);
  for (const role of ['anon', 'authenticated', 'service_role']) {
    await rejectsInSavepoint(client, async () => {
      await client.query(`SET LOCAL ROLE ${role}`);
      return client.query('SELECT * FROM private.galx_star_practice_events');
    }, (error: any) => error?.code === '42501');
  }
  checks += 3;

  const rollback = await readFile(new URL('../supabase/rollbacks/20260925113752_broc_persistent_star_practice.down.sql', import.meta.url), 'utf8');
  await rejectsInSavepoint(client,
    () => client.query(rollback),
    (error: any) => String(error?.message).includes('preserve its canon and events'));
  checks++;
  await client.query('ROLLBACK');
  console.log(`PASS: BROC practice database invariants (${checks} assertions).`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  client.release();
  await pool.end();
}
