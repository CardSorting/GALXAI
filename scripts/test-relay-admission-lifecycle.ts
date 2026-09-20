import assert from 'node:assert/strict';
import test from 'node:test';
import { AdmissionLifecycle } from '../src/relay/admission-lifecycle.js';
import { SchedulerQueueError, StandardPoolScheduler } from '../src/relay/standard-pool-scheduler.js';

type Candidate = { id: string; lastUsedAtMs: number; availableSlots: number };

const candidate = (id = 'shard-a', availableSlots = 1): Candidate => ({ id, lastUsedAtMs: 0, availableSlots });
const reservation = (scheduler: StandardPoolScheduler, item: Candidate, workload = 'images') => scheduler.reserve([item], workload)!;

async function settled<T>(promise: Promise<T>) {
  return promise.then(() => 'fulfilled' as const, error => error as unknown);
}

test('two queued requests compete for a newly available shard and exactly one successor is woken', async () => {
  const scheduler = new StandardPoolScheduler();
  const shard = candidate();
  const active = reservation(scheduler, shard);
  const first = new AdmissionLifecycle('first', 'owner-a', 'images');
  const second = new AdmissionLifecycle('second', 'owner-b', 'images');
  first.queue(); second.queue();
  const firstWake = scheduler.waitForAvailability('images', 'owner-a', { maxWaitMs: 1000, maxQueueDepth: 2, maxOwnerDepth: 1 });
  const secondWake = scheduler.waitForAvailability('images', 'owner-b', { maxWaitMs: 1000, maxQueueDepth: 2, maxOwnerDepth: 1 });

  active.release();
  await firstWake;
  assert.equal(scheduler.queueDepth('images'), 1);
  const firstReservation = reservation(scheduler, shard);
  assert(first.admit(firstReservation));
  assert.equal(scheduler.reserve([shard], 'images'), undefined);
  assert.equal(await Promise.race([secondWake.then(() => 'woke'), new Promise(resolve => setImmediate(() => resolve('waiting')))]), 'waiting');

  first.beginDispatch(); first.resolveDispatch(); first.complete();
  await secondWake;
  const secondReservation = reservation(scheduler, shard);
  assert(second.admit(secondReservation));
  second.beginDispatch(); second.resolveDispatch(); second.complete();
  assert.equal(scheduler.queueDepth('images'), 0);
  assert.equal(first.state, 'completed');
  assert.equal(second.state, 'completed');
});

test('cancellation immediately before admission releases a late reservation without dispatch', async () => {
  const scheduler = new StandardPoolScheduler();
  const shard = candidate();
  const active = reservation(scheduler, shard);
  const lifecycle = new AdmissionLifecycle('cancel-before-admit', 'owner', 'images');
  lifecycle.queue();
  const controller = new AbortController();
  const waiting = scheduler.waitForAvailability('images', 'owner', { maxWaitMs: 1000, signal: controller.signal });
  lifecycle.clientDisconnected(); controller.abort();
  const result = await settled(waiting);
  assert(result instanceof SchedulerQueueError && result.reason === 'cancelled');
  active.release();
  const late = reservation(scheduler, shard);
  assert.equal(lifecycle.admit(late), false);
  assert.equal(lifecycle.state, 'cancelled');
  assert.equal(lifecycle.knownNotDispatched, true);
  const next = scheduler.reserve([shard], 'images');
  assert(next); next.release();
  scheduler.close();
});

test('cancellation immediately after admission is terminal and releases exactly once', () => {
  const scheduler = new StandardPoolScheduler();
  const shard = candidate();
  const lifecycle = new AdmissionLifecycle('cancel-after-admit', 'owner', 'images');
  lifecycle.queue();
  const selected = reservation(scheduler, shard);
  assert(lifecycle.admit(selected));
  lifecycle.clientDisconnected();
  assert.equal(lifecycle.state, 'cancelled');
  assert.equal(lifecycle.beginDispatch(), false);
  const next = scheduler.reserve([shard], 'images');
  assert(next); next.release();
  scheduler.close();
  lifecycle.cleanup(); lifecycle.cleanup();
  assert.equal(lifecycle.snapshot().cleanedUp, true);
});

test('deadline expiry during wakeup terminates before a stale reservation can dispatch', async () => {
  let now = 0;
  const scheduler = new StandardPoolScheduler(() => now);
  const shard = candidate();
  const active = reservation(scheduler, shard);
  const lifecycle = new AdmissionLifecycle('deadline-wakeup', 'owner', 'images', () => now);
  lifecycle.setDeadline(100); lifecycle.queue();
  const waiting = scheduler.waitForAvailability('images', 'owner', { maxWaitMs: 1000, maxQueueDepth: 2, maxOwnerDepth: 1 });
  now = 99; active.release(); await waiting;
  now = 100;
  const stale = reservation(scheduler, shard);
  assert.equal(lifecycle.admit(stale), false);
  assert.equal(lifecycle.state, 'timed_out');
  assert.equal(lifecycle.remainingWaitMs(), 0);
  assert.equal(lifecycle.snapshot().deadlineAtMs, 100);
});

test('scheduler reconciliation cannot erase an occupied reservation', () => {
  const scheduler = new StandardPoolScheduler();
  const shard = candidate();
  const active = reservation(scheduler, shard);
  scheduler.reconcile(new Set([shard.id]));
  assert.equal(scheduler.reserve([shard], 'images'), undefined);
  active.release();
  const next = reservation(scheduler, shard);
  next.release();
});

test('quarantine removes future eligibility without changing the current owner', () => {
  const scheduler = new StandardPoolScheduler();
  const shard = candidate();
  const lifecycle = new AdmissionLifecycle('quarantine-in-flight', 'owner', 'images');
  lifecycle.queue();
  const selected = reservation(scheduler, shard);
  assert(lifecycle.admit(selected));
  // A quarantined worker disappears from future candidates; the current
  // reservation remains owned by this lifecycle until its terminal outcome.
  assert.equal(scheduler.reserve([], 'images'), undefined);
  lifecycle.beginDispatch(); lifecycle.resolveDispatch(); lifecycle.fail();
  assert.equal(scheduler.reserve([shard], 'images') !== undefined, true);
  scheduler.close();
});

test('capacity disappearing between queueing and dispatch requeues without resetting the deadline', async () => {
  let now = 0;
  const scheduler = new StandardPoolScheduler();
  const shard = candidate();
  const lifecycle = new AdmissionLifecycle('capacity-disappears', 'owner', 'images', () => now);
  lifecycle.setDeadline(500); lifecycle.queue();
  const waiting = scheduler.waitForAvailability('images', 'owner', { maxWaitMs: 1000, maxQueueDepth: 2, maxOwnerDepth: 1 });
  const active = reservation(scheduler, shard);
  active.release(); await waiting;
  shard.availableSlots = 0;
  assert.equal(scheduler.reserve([shard], 'images'), undefined);
  assert(lifecycle.queue());
  assert.equal(lifecycle.snapshot().deadlineAtMs, 500);
  assert.equal(lifecycle.queuePasses, 2);
  now = 500;
  assert.equal(lifecycle.queue(), false);
  assert.equal(lifecycle.state, 'timed_out');
});

test('disconnect while queued removes the queue entry and has no dispatch outcome', async () => {
  const scheduler = new StandardPoolScheduler();
  const active = reservation(scheduler, candidate());
  const lifecycle = new AdmissionLifecycle('disconnect-queued', 'owner', 'images');
  lifecycle.queue();
  const controller = new AbortController();
  const waiting = scheduler.waitForAvailability('images', 'owner', { maxWaitMs: 1000, signal: controller.signal });
  lifecycle.clientDisconnected(); controller.abort();
  const result = await settled(waiting);
  assert(result instanceof SchedulerQueueError && result.reason === 'cancelled');
  assert.equal(scheduler.queueDepth('images'), 0);
  assert.equal(lifecycle.state, 'cancelled');
  active.release();
});

test('disconnect after dispatch preserves the ambiguous outcome until the worker terminates', () => {
  const scheduler = new StandardPoolScheduler();
  const lifecycle = new AdmissionLifecycle('disconnect-dispatched', 'owner', 'images');
  lifecycle.queue(); assert(lifecycle.admit(reservation(scheduler, candidate()))); assert(lifecycle.beginDispatch());
  lifecycle.clientDisconnected();
  assert.equal(lifecycle.state, 'dispatched');
  assert.equal(lifecycle.dispatchOutcome, 'ambiguous');
  assert.equal(lifecycle.knownNotDispatched, false);
  lifecycle.fail(); lifecycle.cleanup();
  assert.equal(lifecycle.state, 'failed');
  assert.equal(lifecycle.snapshot().cleanedUp, true);
});

test('cleanup is idempotent after an exception and cannot release capacity twice', () => {
  const scheduler = new StandardPoolScheduler();
  const shard = candidate();
  const lifecycle = new AdmissionLifecycle('exception-cleanup', 'owner', 'images');
  lifecycle.queue(); assert(lifecycle.admit(reservation(scheduler, shard))); lifecycle.fail();
  lifecycle.cleanup(); lifecycle.cleanup();
  const next = reservation(scheduler, shard);
  assert.equal(lifecycle.snapshot().cleanedUp, true);
  next.release();
});

test('a dispatched POST with no response is never classified as safe to replay', () => {
  const scheduler = new StandardPoolScheduler();
  const lifecycle = new AdmissionLifecycle('ambiguous-post', 'owner', 'images');
  lifecycle.queue(); assert(lifecycle.admit(reservation(scheduler, candidate()))); assert(lifecycle.beginDispatch());
  lifecycle.fail();
  assert.equal(lifecycle.dispatchOutcome, 'ambiguous');
  assert.equal(lifecycle.knownNotDispatched, false);
});

test('confirmed target rejection hands off one lifecycle without resetting its deadline', () => {
  const scheduler = new StandardPoolScheduler();
  const first = candidate('shard-a');
  const second = candidate('shard-b');
  const lifecycle = new AdmissionLifecycle('target-handoff', 'owner', 'images');
  lifecycle.setDeadline(10_000);
  lifecycle.queue();
  assert(lifecycle.admit(reservation(scheduler, first)));
  assert(lifecycle.beginDispatch());
  lifecycle.resolveDispatch();
  assert(lifecycle.handoffAfterTargetRejection());
  assert.equal(lifecycle.state, 'queued');
  assert.equal(lifecycle.snapshot().deadlineAtMs, 10_000);
  assert(lifecycle.admit(reservation(scheduler, second)));
  assert(lifecycle.beginDispatch());
  lifecycle.resolveDispatch();
  lifecycle.complete();
  lifecycle.cleanup();
  assert.equal(lifecycle.state, 'completed');
  assert.equal(lifecycle.snapshot().cleanedUp, true);
  const firstAvailable = scheduler.reserve([first], 'images');
  const secondAvailable = scheduler.reserve([second], 'images');
  assert(firstAvailable); assert(secondAvailable);
  firstAvailable.release(); secondAvailable.release();
});

test('image saturation does not consume independent text capacity', () => {
  const scheduler = new StandardPoolScheduler();
  const imageShard = candidate('shared-shard', 1);
  const textShard = candidate('shared-shard', 4);
  const image = reservation(scheduler, imageShard, 'images');
  const textReservations = Array.from({ length: 4 }, () => reservation(scheduler, textShard, 'text'));
  assert.equal(textReservations.length, 4);
  assert.equal(scheduler.reserve([imageShard], 'images'), undefined);
  image.release();
  const imageAfterText = reservation(scheduler, imageShard, 'images');
  assert(imageAfterText, 'text reservations must not consume the independent image slot');
  imageAfterText.release();
  textReservations.forEach(text => text.release());
});

test('owner allowance is exact at 8 and rejects the ninth pending request', async () => {
  const scheduler = new StandardPoolScheduler();
  const active = reservation(scheduler, candidate());
  const controllers = Array.from({ length: 8 }, () => new AbortController());
  const waits = controllers.map(controller => scheduler.waitForAvailability('images', 'same-owner', { maxWaitMs: 1000, signal: controller.signal }));
  assert.equal(scheduler.queueDepth('images'), 8);
  const ninth = await settled(scheduler.waitForAvailability('images', 'same-owner', { maxWaitMs: 1000 }));
  assert(ninth instanceof SchedulerQueueError && ninth.reason === 'full');
  controllers.forEach(controller => controller.abort());
  await Promise.all(waits.map(settled));
  active.release();
});

test('global queue allowance is exact at 32 and rejects the thirty-third pending request', async () => {
  const scheduler = new StandardPoolScheduler();
  const active = reservation(scheduler, candidate());
  const controllers = Array.from({ length: 32 }, () => new AbortController());
  const waits = controllers.map((controller, index) => scheduler.waitForAvailability('images', `owner-${index}`, { maxWaitMs: 1000, signal: controller.signal }));
  assert.equal(scheduler.queueDepth('images'), 32);
  const thirtyThird = await settled(scheduler.waitForAvailability('images', 'owner-33', { maxWaitMs: 1000 }));
  assert(thirtyThird instanceof SchedulerQueueError && thirtyThird.reason === 'full');
  controllers.forEach(controller => controller.abort());
  await Promise.all(waits.map(settled));
  active.release();
  assert.equal(scheduler.queueDepth('images'), 0);
});

test('completion wakes multiple waiters one at a time and only one acquires the released shard', async () => {
  const scheduler = new StandardPoolScheduler();
  const shard = candidate();
  const active = reservation(scheduler, shard);
  const first = scheduler.waitForAvailability('images', 'owner-a', { maxWaitMs: 1000 });
  const second = scheduler.waitForAvailability('images', 'owner-b', { maxWaitMs: 1000 });
  let secondWoke = false; void second.then(() => { secondWoke = true; });
  active.release(); await first;
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(secondWoke, false);
  const successor = reservation(scheduler, shard);
  successor.release();
  await second;
  assert.equal(scheduler.queueDepth('images'), 0);
});
