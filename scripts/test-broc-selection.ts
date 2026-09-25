import test from 'node:test';
import assert from 'node:assert/strict';
import { BrocPracticePersistenceError, BrocPracticeRepository } from '../BROC/store';

const attemptId = '11111111-1111-4111-8111-111111111111';

function reviewPool() {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const client = {
    async query(sql: string, params: unknown[] = []) {
      calls.push({ sql, params });
      if (sql.includes('FROM private.galx_star_generation_attempts AS attempt')) return {
        rowCount: 1,
        rows: [{ attempt_id: attemptId, actor_id: '22222222-2222-4222-8222-222222222222',
          account_id: 'star-account', handle: 'veyrasol', generation_id: 'generation-1',
          asset_ids: ['asset-a', 'asset-b'], state: 'completed', is_enabled: true,
          is_discoverable: true, profile_status: 'active' }],
      };
      if (sql.includes("event_type = 'candidate'")) return { rowCount: 1, rows: [{}] };
      if (sql.includes('FROM public.user_image_library') && sql.includes('FOR UPDATE')) {
        return { rowCount: 2, rows: [{ id: 'asset-a' }, { id: 'asset-b' }] };
      }
      if (sql.includes('AS next_version')) return { rowCount: 1, rows: [{ next_version: '1' }] };
      if (sql.includes("VALUES ($1::uuid, $2::uuid, 'selection'")) return { rowCount: 1, rows: [] };
      if (sql.includes('UPDATE public.user_image_library')) return { rowCount: 2, rows: [] };
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  return {
    calls,
    pool: { connect: async () => client } as any,
  };
}

test('BROC candidate selection records rationale and promotes only selected assets atomically', async () => {
  const { pool, calls } = reviewPool();
  const decision = await new BrocPracticeRepository().recordCandidateDecision(
    pool,
    attemptId,
    ['asset-a'],
    'The composition advances the Star’s current spatial question.',
    'Curator One',
  );
  assert.deepEqual(decision, { decision: 'selected', selectedAssetIds: ['asset-a'], decisionVersion: 1 });
  const insert = calls.find((call) => call.sql.includes("VALUES ($1::uuid, $2::uuid, 'selection'"));
  const update = calls.find((call) => call.sql.includes('UPDATE public.user_image_library'));
  assert.ok(insert && update);
  assert.ok(calls.indexOf(insert) < calls.indexOf(update), 'selection record must precede the visibility update');
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
  const payload = JSON.parse(String(insert.params[2]));
  assert.equal(payload.status, 'selected');
  assert.deepEqual(payload.selectedAssetIds, ['asset-a']);
  assert.match(calls.find((call) => call.sql.includes('AS next_version'))?.sql || '', /ORDER BY \(event_payload->>'decisionVersion'\)::bigint DESC, event_sequence DESC/);
  assert.equal(payload.reviewer, 'Curator One');
  assert.doesNotMatch(JSON.stringify(payload), /prompt|generation-1|asset-b/);
  assert.deepEqual(update.params.slice(0, 2), [['asset-a'], ['asset-a', 'asset-b']]);
});

test('BROC refuses a selected asset outside its completed candidate and rolls back', async () => {
  const { pool, calls } = reviewPool();
  await assert.rejects(
    new BrocPracticeRepository().recordCandidateDecision(
      pool,
      attemptId,
      ['other-asset'],
      'This asset is not part of the candidate.',
      'Curator One',
    ),
    BrocPracticePersistenceError,
  );
  assert.equal(calls.some((call) => call.sql.includes("'selection'")), false);
  assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
});

test('BROC withhold records a reason and publishes no assets', async () => {
  const { pool, calls } = reviewPool();
  const decision = await new BrocPracticeRepository().recordCandidateDecision(
    pool,
    attemptId,
    [],
    'The work repeats the previous series without enough new development.',
    'Curator Two',
  );
  assert.equal(decision.decision, 'withheld');
  assert.deepEqual(decision.selectedAssetIds, []);
  const update = calls.find((call) => call.sql.includes('UPDATE public.user_image_library'));
  assert.deepEqual(update?.params[0], []);
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
});
