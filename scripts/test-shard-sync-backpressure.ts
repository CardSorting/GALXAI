import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GalxShardSyncBuffer } from '../src/core/pool/GalxShardSyncBuffer';
import { ShardRepository } from '../src/lib/supabase/repositories/ShardRepository';
import { ShardHealthRepository } from '../src/lib/supabase/repositories/ShardHealthRepository';

test('bounded queues, independent retries, coalescing and bounded database batches under load', async () => {
  const originalShard = ShardRepository.getInstance;
  const originalHealth = ShardHealthRepository.getInstance;
  const buffer = GalxShardSyncBuffer.getInstance();
  buffer.destroy();
  let release!: () => void;
  const gate = new Promise<void>(r => { release = r; });
  const healthBatches: any[][] = [];
  const probeBatches: any[][] = [];
  ShardRepository.getInstance = () => ({ applyLeaseHealthTransitions: async (batch: any[]) => { healthBatches.push(batch); await gate; } }) as any;
  ShardHealthRepository.getInstance = () => ({ reportHealthProbesBatch: async (batch: any[]) => { probeBatches.push(batch); await gate; return { success: false }; } }) as any;
  const transition = (shardId: string, fencingToken: number) => ({ shardId, fencingToken, expectedRegistryRevision: 1, status: 'cooldown' as const, timestampMs: fencingToken });
  try {
    buffer.enqueueStateTransition(transition('first', 1));
    buffer.enqueueProbe({ shardId: 'first', workerId: 'test', latencyMs: 1, statusCode: 200, isSuccess: true });
    const firstFlush = buffer.flushNow();
    for (let i = 0; i < 10000; i++) {
      buffer.enqueueProbe({ shardId: 's', workerId: 'test', latencyMs: 1, statusCode: 200, isSuccess: true });
      buffer.enqueueStateTransition(transition(`s-${i % 700}`, i + 2));
    }
    assert.deepEqual(buffer.getPendingCount(), { probes: 1000, transitions: 500 });
    assert(buffer.getHealth().droppedProbes >= 9000);
    assert(buffer.getHealth().droppedTransitions > 0);
    release();
    assert.deepEqual(await firstFlush, { probesFlushed: 0, transitionsFlushed: 1 });
    assert(buffer.getHealth().nextProbeFlushAtMs > Date.now());
    const second = await buffer.flushNow();
    assert.equal(second.transitionsFlushed, 100, 'telemetry backoff must not block new health state');
    assert.equal(probeBatches.length, 1, 'no immediate telemetry retry storm');
    assert.equal(healthBatches.flat().filter(t => t.shardId === 'first').length, 1, 'committed state never replayed because telemetry failed');
    assert(healthBatches.every(b => b.length <= 100));
    assert(buffer.getPendingCount().probes <= 1000);
  } finally {
    ShardRepository.getInstance = originalShard;
    ShardHealthRepository.getInstance = originalHealth;
    buffer.destroy();
  }
});
