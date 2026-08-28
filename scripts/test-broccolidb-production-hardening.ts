import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BroccoliCascadingSpilloverBuffer } from '../src/core/broccolidb/BroccoliCascadingSpilloverBuffer';
import { BroccoliCompactionFacade } from '../src/core/broccolidb/BroccoliCompactionFacade';
import { BroccoliDomainSpendOptimizer } from '../src/core/broccolidb/BroccoliDomainSpendOptimizer';
import { BroccoliHighVelocityPipeline } from '../src/core/broccolidb/BroccoliHighVelocityPipeline';
import { BroccoliIncidentAnomalySlidingWindowBuffer } from '../src/core/broccolidb/BroccoliIncidentAnomalySlidingWindowBuffer';
import { BroccoliMegaDocumentPyramidCompactor } from '../src/core/broccolidb/BroccoliMegaDocumentPyramidCompactor';
import { BroccoliMegaIncidentStreamCascader } from '../src/core/broccolidb/BroccoliMegaIncidentStreamCascader';
import { BroccoliPiiDeidentificationMaskBuffer } from '../src/core/broccolidb/BroccoliPiiDeidentificationMaskBuffer';
import { BroccoliRingBufferStreamPool } from '../src/core/broccolidb/BroccoliRingBufferStreamPool';
import { BroccoliZeroAllocationByteStreamBuffer } from '../src/core/broccolidb/BroccoliZeroAllocationByteStreamBuffer';
import * as BroccoliDbBarrel from '../src/core/broccolidb/index';

function testRingBufferSnapshots(): void {
  const pool = BroccoliRingBufferStreamPool.create(1);
  pool.push('alpha', 2, { source: 'first' });
  const popped = pool.pop();
  assert.ok(popped);
  assert.equal(popped.payload, 'alpha');
  assert.equal(popped.anomalyScore, 1);

  pool.push('beta', 0.1, { source: 'second' });
  assert.equal(popped.payload, 'alpha', 'popped snapshots must not mutate when a slot is reused');
  assert.equal(popped.metadata?.source, 'first');
  assert.equal(pool.getStats().activeCount, 1);
}

function testUtf8ByteSlabBounds(): void {
  const slab = BroccoliZeroAllocationByteStreamBuffer.create(16);
  const input = 'hé🚀\n';
  const write = slab.appendString(input);
  assert.ok(write.bytesWritten > input.length, 'UTF-8 byte length must not use UTF-16 code units');
  assert.equal(slab.decodeSlice(write.offset, write.bytesWritten), input);
  assert.throws(() => slab.appendString('🚀'.repeat(10)), RangeError);
  assert.throws(() => slab.scanLines(15, 2), RangeError);
}

function testRealBoundedDiskSpillover(): void {
  const spillDirectory = mkdtempSync(join(tmpdir(), 'broccoli-hardening-test-'));
  try {
    const spill = BroccoliCascadingSpilloverBuffer.create({
      memoryThresholdBytes: 10,
      spillDirectory,
    });
    spill.storePartition('first', 1, '12345678', 0.2);
    spill.storePartition('second', 2, 'abcdefgh', 0.9);

    const stats = spill.getStats();
    assert.ok(stats.inMemoryBytes <= 10, 'RAM usage must remain under the configured watermark');
    assert.equal(stats.spilledPartitions, 1);
    assert.equal(spill.getPartitionPayload('first'), '12345678');
    assert.ok(readdirSync(spillDirectory).some(file => file.endsWith('.data')), 'spill payload must exist on disk');

    spill.storePartition('second', 3, 'x', 0.9);
    assert.equal(spill.getStats().inMemoryBytes, 1, 'overwriting a partition must release prior accounting');
    spill.clear();
    assert.equal(readdirSync(spillDirectory).length, 0);
  } finally {
    rmSync(spillDirectory, { recursive: true, force: true });
  }
}

function testChronologicalT0Isolation(): void {
  const window = BroccoliIncidentAnomalySlidingWindowBuffer.create(10);
  window.recordFrame({
    timestamp: '2026-01-01T00:00:02Z', timestampMs: 2_000, anomalyScore: 0.95,
    severityLevel: 'FATAL', sourceHost: 'later', metricSnapshot: {}, rawMessage: 'later shock',
  });
  window.recordFrame({
    timestamp: '2026-01-01T00:00:01Z', timestampMs: 1_000, anomalyScore: 0.8,
    severityLevel: 'SEV-0', sourceHost: 'root', metricSnapshot: {}, rawMessage: 'earliest shock',
  });
  window.recordFrame({
    timestamp: '2026-01-01T00:00:03Z', timestampMs: 3_000, anomalyScore: 0.9,
    severityLevel: 'CRITICAL', sourceHost: 'recovery', metricSnapshot: {}, rawMessage: 'service RESTORED',
  });

  const metrics = window.evaluateWindow();
  assert.equal(metrics.isolatedRootCauseFrame?.sourceHost, 'root');
  assert.equal(metrics.recoveryFrames, 1, 'explicit recovery markers must not be reclassified as shockwaves');
  assert.ok(window.extractT0ShockwaveSlice(0).some(frame => frame.sourceHost === 'root'));
}

function testRequestScopedPiiMaps(): void {
  const first = BroccoliPiiDeidentificationMaskBuffer.maskAndDeduplicate('first@example.com 111-22-3333');
  const second = BroccoliPiiDeidentificationMaskBuffer.maskAndDeduplicate('second@example.com 444-55-6666');
  const secondEntities = Object.values(second.surrogateMap);
  assert.ok(!secondEntities.includes('first@example.com'));
  assert.ok(!secondEntities.includes('111-22-3333'));
  assert.equal(
    BroccoliPiiDeidentificationMaskBuffer.rehydrate(first.maskedText, first.surrogateMap),
    'first@example.com 111-22-3333'
  );
}

function testFailClosedDomainCompaction(): void {
  const raw = `MT103 partial message without settlement fields\n${'unparsed source payload '.repeat(200)}`;
  const result = BroccoliDomainSpendOptimizer.optimize(raw, 'SWIFT_MT103');
  assert.equal(result.fidelityStatus, 'fallback');
  assert.ok(result.unsupportedFacts.length > 0);
  assert.equal(result.compactedPrompt, raw);
  assert.equal(result.tokensSaved, 0);
}

function testCollisionSafeMemoization(): void {
  BroccoliHighVelocityPipeline.clear();
  const first = 'A'.repeat(256);
  const second = `A${'B'}${'A'.repeat(254)}`;
  assert.equal(
    BroccoliHighVelocityPipeline.fastHash(first, 'Generic'),
    BroccoliHighVelocityPipeline.fastHash(second, 'Generic'),
    'fixture must exercise a sampled-hash collision'
  );

  BroccoliHighVelocityPipeline.processSingle(first, 'Generic');
  const secondResult = BroccoliHighVelocityPipeline.processSingle(second, 'Generic');
  assert.equal(secondResult.compactedPrompt, second);
}

function testExtractiveDocumentSentences(): void {
  const raw = [
    'SECTION 1: PAYMENT TERMS',
    'Buyer shall pay exactly $111.00 on January 2, 2026.',
    'Seller must retain exactly $222.00 until January 3, 2026.',
    'SECTION 2: LIABILITY TERMS',
    'Liability shall be capped at exactly $333.00.',
    'Indemnity must survive for 24 months.',
  ].join('\n');
  const result = BroccoliMegaDocumentPyramidCompactor.compactMegaDocument(raw);
  for (const marker of ['$111.00', '$222.00', '$333.00', '24 months']) {
    assert.ok(result.compactedPyramidPrompt.includes(marker), `missing extractive marker ${marker}`);
  }
}

function testIncidentBudgetReporting(): void {
  const repeated = Array.from({ length: 300 }, (_, index) =>
    `2026-01-01T00:00:${String(index % 60).padStart(2, '0')}.000Z CRITICAL Error: Connection refused retry ${index}`
  ).join('\n');
  const raw = [
    '2026-01-01T00:00:00.000Z INFO baseline healthy',
    '2026-01-01T00:00:01.000Z FATAL SEV-0 ROOT_CAUSE database panic',
    repeated,
    '2026-01-01T00:10:00.000Z replica promoted during failover',
    '2026-01-01T00:11:00.000Z service RECOVERED and RESOLVED',
  ].join('\n');
  const result = BroccoliMegaIncidentStreamCascader.cascadeMegaIncident({
    rawStreamText: raw,
    targetTokenBudget: 1024,
  });
  assert.equal(result.metTargetTokenBudget, true);
  assert.ok(result.compactedTokens <= 1024);
  assert.ok(result.compactedIncidentPrompt.includes('ROOT_CAUSE'));
  assert.ok(result.compactedIncidentPrompt.includes('Connection refused'));
  assert.ok(result.compactedIncidentPrompt.includes('promoted'));
  assert.throws(
    () => BroccoliMegaIncidentStreamCascader.cascadeMegaIncident({ rawStreamText: raw, targetTokenBudget: 0 }),
    RangeError
  );
}

function testFacadeAndBarrelBoundaryHardening(): void {
  // 1. Barrel isolation: Verify direct generated compactors are shielded
  assert.ok(BroccoliDbBarrel.BroccoliCompactionFacade);
  assert.ok(BroccoliDbBarrel.BroccoliDomainSpendOptimizer);
  assert.ok(BroccoliDbBarrel.BroccoliHighVelocityPipeline);
  assert.ok(BroccoliDbBarrel.BroccoliMegaDocumentPyramidCompactor);
  assert.ok(BroccoliDbBarrel.BroccoliMegaIncidentStreamCascader);
  assert.ok(BroccoliDbBarrel.BroccoliCompactionSafety);

  assert.equal((BroccoliDbBarrel as any).BroccoliInterrogatoryCompactor, undefined);
  assert.equal((BroccoliDbBarrel as any).BroccoliPathologyCompactor, undefined);
  assert.equal((BroccoliDbBarrel as any).BroccoliFiveGCpCompactor, undefined);

  // 2. Facade execution: Polymorphic and bounded
  const polyRes = BroccoliCompactionFacade.compact({
    mode: 'domain',
    text: 'SWIFT MT103 partial without settlement fields',
    domainHint: 'SWIFT_MT103',
  });
  assert.equal(polyRes.mode, 'domain');
  assert.equal(polyRes.result.fidelityStatus, 'fallback');

  assert.throws(() => BroccoliCompactionFacade.compactDomain('a'.repeat(2_000_001)), RangeError);
}

function run(): void {
  testRingBufferSnapshots();
  testUtf8ByteSlabBounds();
  testRealBoundedDiskSpillover();
  testChronologicalT0Isolation();
  testRequestScopedPiiMaps();
  testFailClosedDomainCompaction();
  testCollisionSafeMemoization();
  testExtractiveDocumentSentences();
  testIncidentBudgetReporting();
  testFacadeAndBarrelBoundaryHardening();
  console.log('BroccoliDB production hardening regression suite passed.');
}

run();
