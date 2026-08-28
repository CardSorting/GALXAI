import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import {
  BroccoliCompactionFacade,
  DomainOptimizationResult,
  HighVelocityBatchResult,
  MegaIncidentCascaderResult,
  MegaDocumentPyramidResult,
} from '../src/core/broccolidb/BroccoliCompactionFacade';
import * as BroccoliDbBarrel from '../src/core/broccolidb/index';
import { GET as auditCompactGet, POST as auditCompactPost, OPTIONS as auditCompactOptions } from '../src/app/api/audit/broccolidb/compact/route';
import { GET as broccolidbCompactGet, POST as broccolidbCompactPost } from '../src/app/api/broccolidb/compact/route';

async function testBarrelIsolation(): Promise<void> {
  console.log('  [1/7] Testing barrel isolation and supported public boundaries...');

  assert.ok(BroccoliDbBarrel.BroccoliCompactionFacade, 'BroccoliCompactionFacade must be exported from index.ts');
  assert.ok(BroccoliDbBarrel.BroccoliDomainSpendOptimizer, 'BroccoliDomainSpendOptimizer must be exported from index.ts');
  assert.ok(BroccoliDbBarrel.BroccoliHighVelocityPipeline, 'BroccoliHighVelocityPipeline must be exported from index.ts');
  assert.ok(BroccoliDbBarrel.BroccoliMegaIncidentStreamCascader, 'BroccoliMegaIncidentStreamCascader must be exported from index.ts');
  assert.ok(BroccoliDbBarrel.BroccoliMegaDocumentPyramidCompactor, 'BroccoliMegaDocumentPyramidCompactor must be exported from index.ts');
  assert.ok(BroccoliDbBarrel.BroccoliCompactionSafety, 'BroccoliCompactionSafety must be exported from index.ts');

  // Verify direct generated compactors are NOT leaked through barrel
  const barrelKeys = Object.keys(BroccoliDbBarrel);
  assert.equal((BroccoliDbBarrel as any).BroccoliInterrogatoryCompactor, undefined, 'BroccoliInterrogatoryCompactor must not be barrel-exported');
  assert.equal((BroccoliDbBarrel as any).BroccoliPathologyCompactor, undefined, 'BroccoliPathologyCompactor must not be barrel-exported');
  assert.equal((BroccoliDbBarrel as any).BroccoliFiveGCpCompactor, undefined, 'BroccoliFiveGCpCompactor must not be barrel-exported');
  assert.equal((BroccoliDbBarrel as any).BroccoliSwiftMt103Compactor, undefined, 'BroccoliSwiftMt103Compactor must not be barrel-exported');
  assert.equal((BroccoliDbBarrel as any).BroccoliGdsiiTapeoutCompactor, undefined, 'BroccoliGdsiiTapeoutCompactor must not be barrel-exported');

  console.log(`        - Public exports verified: ${barrelKeys.length} items (no ungrounded generated compactors leaked)`);
}

async function testFacadeUnitWorkflows(): Promise<void> {
  console.log('  [2/7] Testing BroccoliCompactionFacade unit workflows...');
  BroccoliCompactionFacade.clearAll();

  // 1. Domain Compaction (Verified)
  const legalText = `INTERROGATORY NO. 1:\nPlease state the full name, address, and telephone number of each person who witnessed the incident occurring on Jan 15, 2026.\nRESPONSE:\nDefendant objects to this interrogatory on the grounds that it is overly broad. Without waiving said objection, Defendant identifies John Doe, 123 Main St, 555-0199.`;
  const domainRes = BroccoliCompactionFacade.compactDomain(legalText, 'Interrogatory');
  assert.ok(domainRes.originalTokens > 0);
  assert.equal(domainRes.fidelityStatus, 'verified');
  assert.equal(domainRes.domain, 'Interrogatory');

  // 2. Domain Compaction (Adversarial Fallback)
  const ungroundedText = `MT103 message missing fields\n${'random noise buffer '.repeat(50)}`;
  const ungroundedRes = BroccoliCompactionFacade.compactDomain(ungroundedText, 'SWIFT_MT103');
  assert.equal(ungroundedRes.fidelityStatus, 'fallback');
  assert.equal(ungroundedRes.compactedPrompt, ungroundedText);
  assert.equal(ungroundedRes.tokensSaved, 0);

  // 3. Batch Stream Compaction
  const batchRes = BroccoliCompactionFacade.compactBatch([
    { text: legalText, domain: 'Interrogatory' },
    { payload: legalText, domainHint: 'Interrogatory' },
  ]);
  assert.equal(batchRes.totalProcessed, 2);
  assert.ok(batchRes.totalOriginalTokens > 0);
  assert.ok(batchRes.results.length === 2);

  // 4. Incident Cascader
  const repeatedErrors = Array.from({ length: 50 }, (_, i) => `2026-01-01T00:00:0${i % 10}.000Z CRITICAL DB Connection refused`).join('\n');
  const incidentText = `2026-01-01T00:00:00.000Z INFO Start\n2026-01-01T00:00:01.000Z FATAL SEV-0 ROOT_CAUSE primary DB crashed\n${repeatedErrors}\n2026-01-01T00:01:00.000Z INFO Recovered`;
  const incidentRes = BroccoliCompactionFacade.compactIncident({
    rawStreamText: incidentText,
    targetTokenBudget: 1024,
  });
  assert.ok(incidentRes.wasCompacted);
  assert.equal(incidentRes.metTargetTokenBudget, true);
  assert.ok(incidentRes.compactedIncidentPrompt.includes('ROOT_CAUSE'));

  // 5. Document Pyramid
  const docText = [
    'Confidential - Subject to NDA - Draft v1.0',
    'SECTION 1: FINANCIAL COVENANTS',
    'Borrower shall maintain $5,000,000 in liquidity on Jan 10, 2026.',
    'Borrower agrees to deliver quarterly financial statements within 45 days.',
    'Page 1 of 10',
    'Confidential - Subject to NDA - Draft v1.0',
    'SECTION 2: DEFAULT CONDITIONS',
    'Default occurs if payment is late by 30 days.',
    'Notwithstanding anything to the contrary, late fees shall be 5.0%.',
    'Page 2 of 10',
    'Confidential - Subject to NDA - Draft v1.0',
    'SECTION 3: BOILERPLATE PROVISIONS',
    'This agreement is governed by the laws of the State of Delaware.',
    'All notices must be in writing and delivered by certified mail.',
    'Page 3 of 10',
  ].join('\n');
  const docRes = BroccoliCompactionFacade.compactDocument({ rawText: docText });
  assert.ok(docRes.totalSectionsDetected >= 3);
  assert.ok(docRes.compactedPyramidPrompt.includes('$5,000,000'));
  assert.ok(docRes.compactedPyramidPrompt.includes('FINANCIAL COVENANTS'));

  // 6. Polymorphic Dispatch
  const polyDomain = BroccoliCompactionFacade.compact({ mode: 'domain', text: legalText, domainHint: 'Interrogatory' });
  assert.equal(polyDomain.mode, 'domain');
  assert.equal(polyDomain.result.fidelityStatus, 'verified');

  const polyIncident = BroccoliCompactionFacade.compact({ mode: 'incident', rawStreamText: incidentText, targetTokenBudget: 1024 });
  assert.equal(polyIncident.mode, 'incident');

  // 7. Input bounds rejection
  assert.throws(() => BroccoliCompactionFacade.compactDomain('a'.repeat(2_000_001)), RangeError);
  assert.throws(() => BroccoliCompactionFacade.compactIncident({ rawStreamText: incidentText, targetTokenBudget: 10 }), RangeError);

  console.log('        - Facade unit workflows passed with strict fail-closed safety.');
}

async function testApiRouteGetAndOptions(): Promise<void> {
  console.log('  [3/7] Testing GET and OPTIONS route endpoints...');

  // GET /api/audit/broccolidb/compact
  const getRes = await auditCompactGet();
  assert.equal(getRes.status, 200);
  const getJson = await getRes.json();
  assert.equal(getJson.status, 'operational');
  assert.equal(getJson.service, 'broccolidb-compaction-gateway');
  assert.ok(Array.isArray(getJson.supportedModes));
  assert.ok(getJson.limits.maxPayloadBytes > 0);

  // GET /api/broccolidb/compact (alias)
  const aliasGetRes = await broccolidbCompactGet();
  assert.equal(aliasGetRes.status, 200);

  // OPTIONS
  const optRes = await auditCompactOptions();
  assert.equal(optRes.status, 204);
  assert.ok(optRes.headers.get('Access-Control-Allow-Origin'));

  console.log('        - GET and OPTIONS handlers returned operational status and CORS headers.');
}

async function testApiRouteDomainCompaction(): Promise<void> {
  console.log('  [4/7] Testing POST /api/audit/broccolidb/compact with domain payload...');

  const legalText = `PROPOUNDING PARTY: Plaintiff Acme Corp
RESPONDING PARTY: Defendant Zenith LLC
SET NUMBER: One (1)
SPECIAL INTERROGATORY NO. 14: Please identify every person who participated in the trade secret misappropriation meeting on June 14, 2026.
RESPONSE TO SPECIAL INTERROGATORY NO. 14: Responding party objects on grounds of attorney-client privilege, work product doctrine, and undue burden. Subject to said objections: Dr. Alexander Chen and Marcus Thorne were present.
` + 'STANDARD BOILERPLATE OBJECTION WORDS '.repeat(60);

  const req = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': 'Bearer test_token',
    },
    body: JSON.stringify({
      mode: 'domain',
      text: legalText,
      domainHint: 'Interrogatory',
    }),
  });

  const res = await auditCompactPost(req);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.equal(json.mode, 'domain');
  assert.equal((json.data as DomainOptimizationResult).fidelityStatus, 'verified');
  assert.ok((json.data as DomainOptimizationResult).tokensSaved > 0);

  console.log(`        - Domain response: saved ${json.data.tokensSaved} tokens (${json.data.savingsPercentage}%) with verified fidelity.`);
}

async function testApiRouteBatchAndIncidentAndDocument(): Promise<void> {
  console.log('  [5/7] Testing POST /api/audit/broccolidb/compact across batch, incident, and document modes...');

  // 1. Batch mode
  const batchReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'batch',
      items: [
        { text: 'Sample text 1', domain: 'Generic' },
        { text: 'Sample text 2', domain: 'Generic' },
      ],
    }),
  });
  const batchRes = await auditCompactPost(batchReq);
  assert.equal(batchRes.status, 200);
  const batchJson = await batchRes.json();
  assert.equal(batchJson.mode, 'batch');
  assert.equal((batchJson.data as HighVelocityBatchResult).totalProcessed, 2);

  // 2. Incident mode via alias route (/api/broccolidb/compact)
  const incidentReq = new NextRequest('http://localhost:3000/api/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'incident',
      rawStreamText: '2026-01-01T00:00:00.000Z FATAL SEV-0 ROOT_CAUSE memory pressure failure\n2026-01-01T00:01:00.000Z INFO recovered',
      targetTokenBudget: 1024,
    }),
  });
  const incidentRes = await broccolidbCompactPost(incidentReq);
  assert.equal(incidentRes.status, 200);
  const incidentJson = await incidentRes.json();
  assert.equal(incidentJson.mode, 'incident');
  assert.ok((incidentJson.data as MegaIncidentCascaderResult).compactedIncidentPrompt.includes('ROOT_CAUSE'));

  // 3. Document mode
  const docReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'document',
      rawText: 'SECTION 1: TITLE\nAmount owed is $1,250.00 due on Feb 1, 2026.',
    }),
  });
  const docRes = await auditCompactPost(docReq);
  assert.equal(docRes.status, 200);
  const docJson = await docRes.json();
  assert.equal(docJson.mode, 'document');
  assert.ok((docJson.data as MegaDocumentPyramidResult).compactedPyramidPrompt.includes('$1,250.00'));

  console.log('        - Batch, incident, and document endpoints executed successfully.');
}

async function testApiValidationAndErrorHandling(): Promise<void> {
  console.log('  [6/7] Testing API route validation, bounds, and error handling...');

  // 1. Empty body
  const emptyReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '',
  });
  const emptyRes = await auditCompactPost(emptyReq);
  assert.equal(emptyRes.status, 400);

  // 2. Malformed JSON
  const malformedReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{not valid json',
  });
  const malformedRes = await auditCompactPost(malformedReq);
  assert.equal(malformedRes.status, 400);

  // 3. Invalid mode
  const badModeReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'invalid_mode_name' }),
  });
  const badModeRes = await auditCompactPost(badModeReq);
  assert.equal(badModeRes.status, 400);

  // 4. Missing required field in mode
  const missingFieldReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'incident' }), // missing rawStreamText
  });
  const missingFieldRes = await auditCompactPost(missingFieldReq);
  assert.equal(missingFieldRes.status, 400);

  // 5. Oversized payload header (413)
  const oversizedHeaderReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(15 * 1024 * 1024), // 15MB
    },
    body: JSON.stringify({ mode: 'domain', text: 'hello' }),
  });
  const oversizedHeaderRes = await auditCompactPost(oversizedHeaderReq);
  assert.equal(oversizedHeaderRes.status, 413);

  console.log('        - Route error handling validated (400 on malformed payloads, 413 on oversized payloads).');
}

async function testProductionAuthRejection(): Promise<void> {
  console.log('  [7/7] Testing production authentication gate...');

  const originalEnv = process.env.NODE_ENV;
  try {
    (process.env as any).NODE_ENV = 'production';

    // Unauthenticated request in production
    const unauthReq = new NextRequest('http://localhost:3000/api/audit/broccolidb/compact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'domain', text: 'test' }),
    });
    const unauthRes = await auditCompactPost(unauthReq);
    assert.equal(unauthRes.status, 401, 'Unauthenticated requests must be rejected with 401 in production');

  } finally {
    (process.env as any).NODE_ENV = originalEnv;
  }

  console.log('        - Production auth gate verified.');
}

async function run(): Promise<void> {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB PRODUCTION COMPACTION FACADE & API GATEWAY');
  console.log('======================================================================\n');

  await testBarrelIsolation();
  await testFacadeUnitWorkflows();
  await testApiRouteGetAndOptions();
  await testApiRouteDomainCompaction();
  await testApiRouteBatchAndIncidentAndDocument();
  await testApiValidationAndErrorHandling();
  await testProductionAuthRejection();

  console.log('\n======================================================================');
  console.log('   ALL BROCCOLIDB COMPACTION FACADE & API TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
