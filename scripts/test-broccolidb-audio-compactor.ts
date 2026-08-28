import assert from 'node:assert/strict';
import { BroccoliAudioCompactor, AudioChunk } from '../src/core/broccolidb/BroccoliAudioCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB AUDIO TOKEN COMPACTOR & SILENCE PRUNER');
  console.log('======================================================================\n');

  BroccoliAudioCompactor.clear();

  // Create a simulated 30-second audio stream with alternating speech (high energy) and dead air silence (low energy)
  const chunks: AudioChunk[] = [];
  for (let i = 0; i < 30; i++) {
    const isSpeech = i % 2 === 0; // 50% speech, 50% dead silence
    chunks.push({
      timestampMs: i * 1000,
      durationMs: 1000,
      rmsEnergy: isSpeech ? 0.45 : 0.02, // 0.45 = clear voice, 0.02 = silent room
      payloadBase64: `raw_pcm_audio_frame_${i + 1}`,
    });
  }

  console.log('[1/2] Compacting 30-Second Real-Time Audio Payload (50% Dead Air Silence)...');
  const result = BroccoliAudioCompactor.compactAudioChunks(chunks, 40.0);

  console.log(`      - Was Compacted: ${result.wasCompacted}`);
  console.log(`      - Original Duration: ${result.originalDurationMs / 1000}s -> Compacted: ${result.compactedDurationMs / 1000}s`);
  console.log(`      - Original Audio Tokens ($40/1M): ${result.originalAudioTokens} -> Compacted: ${result.compactedAudioTokens}`);
  console.log(`      - Audio Tokens Slashed: ${result.tokensSaved} (-${result.savingsPercentage}%)`);
  console.log(`      - Direct Dollars Saved on 30s Recording: $${result.costSavedUsd.toFixed(6)}`);

  assert.equal(result.wasCompacted, true);
  assert.equal(result.compactedDurationMs, 15000); // Exactly 15s of active speech retained!
  assert.equal(result.retainedChunks.length, 15);
  assert.equal(result.savingsPercentage, 50.0);

  console.log('\n[✓] Audio Voice Activity Detection & Silence Token Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL AUDIO COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
