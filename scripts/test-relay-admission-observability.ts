import assert from 'node:assert/strict';
import test from 'node:test';
import { AdmissionEventBuffer } from '../src/relay/admission-observability.js';

test('private admission events are allowlisted, bounded and sink failures are non-fatal', () => {
  const emitted:any[] = [];
  const buffer = new AdmissionEventBuffer(2, event => emitted.push(event));
  const base = { requestId:'a'.repeat(200), workload:'images', state:'queued' as const, queuePasses:1 };
  buffer.record({...base, name:'received'});
  buffer.record({...base, name:'candidate_rejected', targetId:'shard-a', reason:'capability_mismatch'});
  buffer.record({...base, name:'terminal', reason:'no_compatible_candidate'});
  assert.equal(buffer.snapshot().length, 2);
  assert.equal(buffer.snapshot()[0].name, 'candidate_rejected');
  assert.equal(buffer.snapshot()[0].requestId.length, 128);
  assert.equal(emitted.length, 3);
  assert(!Object.keys(emitted[0]).some(key => ['prompt','body','credential','token','provider'].some(secret => key.toLowerCase().includes(secret))));

  const failingSink = new AdmissionEventBuffer(1, () => { throw Error('diagnostics unavailable'); });
  assert.doesNotThrow(() => failingSink.record({...base, name:'dispatch_started'}));
});
