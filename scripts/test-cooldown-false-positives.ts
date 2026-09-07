import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GalxCircuitBreaker } from '../src/core/circuit/GalxCircuitBreaker';
import { classifyUpstreamError } from '../src/relay/quota-policy';
import { coalesceHealthTransitions, persistedHealthStatus } from '../src/core/pool/LeaseHealthTransition';
import { PostgresCircuitBreaker } from '../src/lib/db/postgres';

const breaker = new GalxCircuitBreaker();
const now = Date.now();
const account = { id: 'test', status: 'healthy', stats: { consecutiveFailures: 0, lastUsedTimestampMs: now } } as any;

test('request IDs, permission rejection and caller mistakes cannot kill healthy credentials', () => {
  for (const body of ['request_401234 returned 500', 'trace_403_429 failed', 'Request 1402 failed']) {
    assert.equal(breaker.isTerminalAuthError(body), false);
    assert.equal(breaker.dissectUpstreamError(500, body, undefined, now, account).newStatus, 'healthy');
    const relay = classifyUpstreamError({ status: 500, error: { message: body } });
    assert.equal(relay.unauthorized, false);
    assert.equal(relay.quota, false);
  }
  for (const status of [400, 403, 404, 413, 422, 499]) {
    const result = breaker.dissectUpstreamError(status, 'Request rejected', undefined, now, account);
    assert.equal(result.affectsHealth, false);
    assert.equal(result.newStatus, 'healthy');
  }
  assert.equal(breaker.dissectUpstreamError(403, 'model_permission_denied', undefined, now, account).category, 'model_incompatible');
  assert.equal(classifyUpstreamError({ status: 403, error: { code: 'model_permission_denied' } }).unauthorized, false);
  assert.equal(breaker.dissectUpstreamError(401, 'Unauthorized', undefined, now, account).newStatus, 'dead');
  assert.equal(breaker.dissectUpstreamError(400, '{"code":"invalid_api_key"}', undefined, now, account).newStatus, 'dead');
  assert.equal(classifyUpstreamError({ error: { code: 'token_revoked' } }).unauthorized, true);
});

test('transient failures need recent corroboration, but failed probes and explicit backoff open immediately', () => {
  const classify = (failures: number, lastUsedTimestampMs = now) => breaker.dissectUpstreamError(503, 'Unavailable', undefined, now,
    { ...account, stats: { consecutiveFailures: failures, lastUsedTimestampMs } });
  assert.equal(classify(0).newStatus, 'healthy');
  assert.equal(classify(1).newStatus, 'healthy');
  assert.equal(classify(2).newStatus, 'cooldown');
  assert.equal(classify(20, now - 120000).newStatus, 'healthy');
  assert.equal(breaker.dissectUpstreamError(503, 'Unavailable', undefined, now, { ...account, status: 'half_open' }).newStatus, 'cooldown');
});

test('Retry-After wins over incidental body text and jitter never shortens the deadline', () => {
  for (let i = 0; i < 100; i++) {
    for (const status of [429, 503]) {
      const result = breaker.dissectUpstreamError(status, 'Retry after 1 second', { 'Retry-After': '120' }, now, account);
      assert(result.cooldownMs! >= 120000);
      assert(result.cooldownMs! <= 122000);
    }
  }
  const date = new Date(now + 180000).toUTCString();
  assert(breaker.dissectUpstreamError(503, 'Unavailable', { 'retry-after': date }, now, account).cooldownMs! >= 179000);
  const noHint = breaker.dissectUpstreamError(503, 'request_300ms_4012 failed', undefined, now, account);
  assert.equal(noHint.newStatus, 'healthy');
});

test('health batches select the newest fenced observation and encode only durable status values', () => {
  const base = { shardId: 's', status: 'cooldown' as const, fencingToken: 10, expectedRegistryRevision: 4, timestampMs: now };
  assert.deepEqual(coalesceHealthTransitions([base, { ...base, fencingToken: 9, timestampMs: now + 10000 }]), [base]);
  assert.deepEqual(coalesceHealthTransitions([{ ...base, fencingToken: undefined }]), []);
  assert.equal(persistedHealthStatus('warming_up'), 'healthy');
  assert.equal(persistedHealthStatus('quarantined'), 'exhausted');
});

test('SQL validation, permissions and transaction conflicts cannot trip the database connection breaker', () => {
  const database = new PostgresCircuitBreaker();
  for (const code of ['23505', '23514', '22P02', '42501', '42601', '40001', '40P01']) {
    for (let i = 0; i < 10; i++) database.recordFailure({ code, message: 'Application SQL rejected' });
  }
  database.recordFailure({ code: '57014', message: 'canceling statement due to user request' });
  assert.equal(database.getStatus().state, 'CLOSED');
  assert.equal(database.getStatus().failures, 0);
  for (let i = 0; i < 3; i++) database.recordFailure({ code: 'ECONNRESET', message: 'connection reset' });
  assert.equal(database.getStatus().state, 'OPEN');
});
