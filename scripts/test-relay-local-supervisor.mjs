import test from 'node:test';
import assert from 'node:assert/strict';
import { composeHealth, firstFailedCause, poolServiceRecoveryAction, retryDelayMs, supervisorCauses } from './lib/relay-local-supervisor.mjs';

test('central readiness requires every configured service to report healthy', () => {
  const expected = ['authority', 'tls'];
  assert.deepEqual(composeHealth(expected, ['authority\tUp 4 minutes (healthy)', 'tls\tUp 2 minutes (healthy)']), { ready: true, unhealthy: [] });
  assert.equal(composeHealth(expected, ['authority\tUp 4 minutes (healthy)']).ready, false);
  assert.equal(composeHealth(expected, ['authority\tUp 4 minutes (healthy)', 'tls\tUp 2 minutes (health: starting)']).ready, false);
  assert.deepEqual(composeHealth(expected, ['authority\tUp 4 minutes (healthy)', 'tls\tUp 2 minutes (unhealthy)']), { ready: false, unhealthy: ['tls'] });
  assert.equal(composeHealth(expected, ['authority\tUp 4 minutes (healthy)', 'authority\tUp 2 minutes (healthy)']).ready, false);
  assert.equal(composeHealth([], ['authority\tUp 4 minutes (healthy)']).ready, false);
  assert.equal(composeHealth(['authority', 'bad name'], ['authority\tUp 4 minutes (healthy)']).ready, false);
  assert.equal(composeHealth(expected, ['authority\tUp 4 minutes (healthy)', 'malformed']).ready, false);
});

test('supervisor backoff stays bounded after jitter and grows with attempts', () => {
  assert.equal(retryDelayMs(1, () => 0), 4000);
  assert.equal(retryDelayMs(2, () => 0.5), 10000);
  assert.equal(retryDelayMs(7, () => 0.999999), 300000);
  assert.equal(retryDelayMs(100, () => 0.5), 300000);
  for (const attempt of [0, -1, 1.5, Number.MAX_SAFE_INTEGER]) assert.throws(() => retryDelayMs(attempt));
  assert.throws(() => retryDelayMs(1, () => 1));
});

test('recovery categories are a fixed allowlist', () => {
  assert.deepEqual(supervisorCauses, ['central', 'monitor', 'relay', 'recovery']);
});

test('supervisor preserves the first failed dependency as its recovery category', () => {
  assert.equal(firstFailedCause({ central: false, monitor: false, relay: false }), 'central');
  assert.equal(firstFailedCause({ central: true, monitor: false, relay: false }), 'monitor');
  assert.equal(firstFailedCause({ central: true, monitor: true, relay: false }), 'relay');
  assert.equal(firstFailedCause({ central: true, monitor: true, relay: true }), null);
  assert.equal(firstFailedCause({ central: true, monitor: undefined, relay: true }), 'monitor');
});

test('service recovery targets only known running or stopped container states', () => {
  assert.equal(poolServiceRecoveryAction('running'), 'restart');
  assert.equal(poolServiceRecoveryAction('restarting'), 'restart');
  for (const state of ['missing', 'created', 'exited', 'dead']) assert.equal(poolServiceRecoveryAction(state), 'start');
  for (const state of ['paused', 'removing', 'unknown', '', null]) assert.equal(poolServiceRecoveryAction(state), null);
});
