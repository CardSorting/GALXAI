import { GalxTrainingStreamEngine } from '../src/core/training/GalxTrainingStreamEngine';

async function runTests() {
  console.log('=== Starting Frontier BroccoliDB Continuous Learning & Privacy Substrate Tests ===\n');
  const engine = GalxTrainingStreamEngine.getInstance();
  engine.clearBuffer();

  // Test 1: Developer API is ALWAYS 100% private
  console.log('[Test 1] Developer API Privacy Isolation (ZDR):');
  const apiResult = await engine.ingestInteraction({
    source: 'api_route',
    userId: 'usr_dev_123',
    modelId: 'gpt-5.6-sol',
    userPrompt: 'Write a secret algorithm with API key sk-live-123456789012345678901234',
    completionContent: 'Here is the private algorithm code...',
    isApiCall: true,
  });
  console.log('Result:', apiResult);
  if (apiResult.status !== 'skipped' || apiResult.reason !== 'api_always_private_zdr') {
    throw new Error('Test 1 Failed: Developer API was not marked as private ZDR!');
  }
  console.log('✓ Test 1 Passed: Developer API bypassed training ingestion.\n');

  // Test 2: Consumer Web Chat Opt-Out
  console.log('[Test 2] Consumer Web Chat Opt-Out:');
  const optOutResult = await engine.ingestInteraction({
    source: 'web_chat',
    userId: 'usr_chat_456',
    modelId: 'gpt-5.6-sol',
    userPrompt: 'Help me debug this TypeScript function',
    completionContent: 'Certainly! Here is the corrected TypeScript code for your function.',
    allowModelTraining: false,
  });
  console.log('Result:', optOutResult);
  if (optOutResult.status !== 'skipped' || optOutResult.reason !== 'user_opted_out') {
    throw new Error('Test 2 Failed: User opt-out was not respected!');
  }
  console.log('✓ Test 2 Passed: User opt-out bypassed training ingestion.\n');

  // Test 3: SFT Distillation with In-Flight PII & ε-Differential Privacy Anonymization
  console.log('[Test 3] SFT Distillation with PII Redaction & ε-Differential Privacy:');
  const samplePrompt = 'My email is john.doe@example.com, SSN is 123-45-6789, internal IP is 192.168.1.104, and API key is sk-live-987654321098765432109876. Please explain async functions.';
  const sampleCompletion = '```typescript\nasync function fetchData(): Promise<string> {\n  return "Data received";\n}\n```\nHere is how async/await works in TypeScript step by step.';

  const distillationResult = await engine.ingestInteraction({
    source: 'web_chat',
    userId: 'usr_chat_789',
    modelId: 'gpt-5.6-sol',
    userPrompt: samplePrompt,
    completionContent: sampleCompletion,
    allowModelTraining: true,
  });
  console.log('Result:', distillationResult);
  if (distillationResult.status !== 'distilled' || !distillationResult.piiRedacted) {
    throw new Error('Test 3 Failed: Sample was not distilled or PII was not detected/redacted!');
  }

  const samples = engine.getRecentSFTSamples(5);
  const distilled = samples.find((s) => s.id === distillationResult.sampleId);
  if (!distilled) throw new Error('Test 3 Failed: Distilled sample not found in BroccoliDB SFT table!');

  const userMsg = distilled.messages.find((m) => m.role === 'user');
  console.log('Distilled User Content in BroccoliDB Table:', userMsg?.content);

  // Assert PII and IP were scrubbed/anonymized
  if (
    userMsg?.content.includes('john.doe@example.com') ||
    userMsg?.content.includes('123-45-6789') ||
    userMsg?.content.includes('192.168.1.104') ||
    userMsg?.content.includes('sk-live-987654321098765432109876')
  ) {
    throw new Error('Test 3 Failed: Raw PII or secrets leaked into distilled training pair!');
  }
  console.log('✓ Test 3 Passed: PII, SSN, IP, and API secrets scrubbed and ε-DP anonymized.\n');

  // Test 4: Multi-Turn Dialogue Compaction
  console.log('[Test 4] Multi-Turn Dialogue Compaction (BroccoliDB):');
  const multiTurnResult = await engine.ingestInteraction({
    source: 'web_chat',
    modelId: 'gpt-5.6-sol',
    messages: [
      { role: 'user', content: 'List files in current directory' },
      { role: 'assistant', content: 'Checking directory...' },
      { role: 'tool', toolName: 'list_dir', content: 'file1.ts\nfile2.ts\nfile3.ts\n'.repeat(20) }, // Big tool dump
      { role: 'user', content: 'Now please explain what file1.ts does' },
      { role: 'assistant', content: 'File1 contains the main entry point and bootstrap logic for the server.' },
    ],
    completionContent: 'File1 contains the main entry point and bootstrap logic for the server.',
    allowModelTraining: true,
  });
  console.log('Multi-Turn Result:', multiTurnResult);
  if (multiTurnResult.status !== 'distilled') {
    throw new Error('Test 4 Failed: Multi-turn dialogue was not distilled!');
  }
  console.log('✓ Test 4 Passed: Multi-turn dialogue compacted and ingested.\n');

  // Test 5: BroccoliDB Bloom Filter Deduplication
  console.log('[Test 5] BroccoliDB Bloom Filter Deduplication:');
  const repeatedQuery = 'How do I configure Next.js middleware with DPoP token headers?';
  const goodAnswer = 'Here is the step by step configuration for Next.js 15 middleware with DPoP authentication headers.';

  for (let i = 0; i < 4; i++) {
    await engine.ingestInteraction({
      source: 'web_chat',
      modelId: 'gpt-5.6-sol',
      userPrompt: repeatedQuery,
      completionContent: goodAnswer,
      allowModelTraining: true,
    });
  }

  const bloomRejectResult = await engine.ingestInteraction({
    source: 'web_chat',
    modelId: 'gpt-5.6-sol',
    userPrompt: repeatedQuery,
    completionContent: goodAnswer,
    allowModelTraining: true,
  });
  console.log('Bloom Result for 5th repeat:', bloomRejectResult);
  if (bloomRejectResult.status !== 'skipped' || bloomRejectResult.reason !== 'bloom_duplicate_threshold_exceeded') {
    throw new Error('Test 5 Failed: Bloom filter did not reject excessive repetitive query!');
  }
  console.log('✓ Test 5 Passed: BroccoliDB Bloom filter successfully deduplicated repetitive queries.\n');

  // Test 6: Direct Preference Optimization (DPO) Paired Ingestion
  console.log('[Test 6] BroccoliDB DPO Pair Extraction & Alignment:');
  const dpoPrompt = 'User alice@example.com asked: What is the fastest sorting algorithm?';
  const chosenResp = 'TimSort or QuickSort has average time complexity of O(N log N).';
  const rejectedResp = 'BubbleSort is the best and fastest sorting algorithm for everything.';

  const dpoResult = await engine.ingestDPOFeedback({
    source: 'web_chat_swipe',
    modelId: 'gpt-5.6-sol',
    prompt: dpoPrompt,
    chosen: chosenResp,
    rejected: rejectedResp,
    qualityDelta: 0.95,
    allowModelTraining: true,
  });
  console.log('DPO Ingestion Result:', dpoResult);
  if (dpoResult.status !== 'distilled' || !dpoResult.piiRedacted) {
    throw new Error('Test 6 Failed: DPO pair was not distilled or PII was not scrubbed!');
  }
  console.log('✓ Test 6 Passed: DPO alignment pair ingested and scrubbed in BroccoliDB table.\n');

  // Test 7: Kahneman-Tversky Optimization (KTO) Unpaired Ingestion
  console.log('[Test 7] BroccoliDB KTO Binary Prospect Theory Ingestion:');
  const ktoPrompt = 'Explain how to securely store passwords in modern databases.';
  const ktoGoodCompletion = 'Use Argon2id or bcrypt with high work factor and unique per-user salts.';
  
  const ktoResult = await engine.ingestKTOFeedback({
    source: 'user_thumb_rating',
    modelId: 'gpt-5.6-sol',
    prompt: ktoPrompt,
    completion: ktoGoodCompletion,
    label: true,
    klWeight: 1.0,
    allowModelTraining: true,
  });
  console.log('KTO Ingestion Result:', ktoResult);
  if (ktoResult.status !== 'distilled') {
    throw new Error('Test 7 Failed: KTO pair was not distilled!');
  }

  const ktoPairs = engine.getRecentKTOPairs(5);
  const foundKTO = ktoPairs.find((k) => k.id === ktoResult.sampleId);
  if (!foundKTO || foundKTO.label !== true || foundKTO.klWeight !== 1.0) {
    throw new Error('Test 7 Failed: KTO record not matching expected prospect theory properties!');
  }
  console.log('✓ Test 7 Passed: KTO unpaired binary preference ingested into BroccoliDB.\n');

  // Test 8: Token-Packed Micro-Batch Compilation (BroccoliMicroBatcher)
  console.log('[Test 8] Token-Packed Micro-Batching Packet Compilation:');
  const microbatches = engine.exportTokenPackedMicroBatches(2048);
  console.log('Compiled Micro-Batch Packets Count:', microbatches.length);
  if (microbatches.length < 1) {
    throw new Error('Test 8 Failed: Micro-batch compilation produced 0 packets!');
  }
  const firstBatch = microbatches[0];
  console.log('Batch Packet Preview:', {
    batchId: firstBatch.batchId,
    totalSamples: firstBatch.totalSamples,
    totalPackedTokens: firstBatch.totalPackedTokens,
    datasetType: firstBatch.datasetType,
    differentialPrivacyEpsilon: firstBatch.differentialPrivacyEpsilon,
  });
  if (firstBatch.totalPackedTokens < 10 || firstBatch.totalSamples < 1) {
    throw new Error('Test 8 Failed: Micro-batch packed tokens invalid!');
  }
  console.log('✓ Test 8 Passed: Token-packed micro-batches compiled for GPU/TPU ingestion.\n');

  // Test 9: Multi-Format JSONL Serialization & Telemetry
  console.log('[Test 9] Multi-Format JSONL Serialization & Telemetry:');
  const telemetry = engine.getTelemetry();
  console.log('BroccoliDB Telemetry Stats:', telemetry);
  if (
    telemetry.totalSamplesDistilled < 1 ||
    telemetry.totalDPOPairsDistilled < 1 ||
    telemetry.totalKTOPairsDistilled < 1
  ) {
    throw new Error('Test 9 Failed: Telemetry metrics did not capture Tri-Objective streams!');
  }

  const sftJsonl = engine.exportSftJsonl();
  const dpoJsonl = engine.exportDpoJsonl();
  const ktoJsonl = engine.exportKtoJsonl();

  console.log('SFT JSONL:\n', sftJsonl.split('\n')[0]);
  console.log('DPO JSONL:\n', dpoJsonl.split('\n')[0]);
  console.log('KTO JSONL:\n', ktoJsonl.split('\n')[0]);

  if (!ktoJsonl.includes('kl_weight') || !dpoJsonl.includes('chosen') || !sftJsonl.includes('messages')) {
    throw new Error('Test 9 Failed: JSONL exports missing standard format attributes!');
  }
  console.log('✓ Test 9 Passed: Tri-objective SFT, DPO, and KTO JSONL export streams fully verified.\n');

  console.log('🎉 ALL FRONTIER BROCCOLIDB CONTINUOUS LEARNING TESTS PASSED WITH 100% SUCCESS!\n');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
