import assert from 'node:assert/strict';
import { BroccoliPriorAuthCompactor } from '../src/core/broccolidb/BroccoliPriorAuthCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB HEALTHCARE PRIOR AUTHORIZATION COMPACTOR');
  console.log('======================================================================\n');

  BroccoliPriorAuthCompactor.clear();

  // Full mock Prior Authorization packet with provider info, CPT/ICD codes, conservative therapy, and imaging results
  const rawPaPacket = `
PATIENT PRIOR AUTHORIZATION REQUEST FORM
Payer: BlueCross BlueShield Comprehensive Health Plan
Provider: Metro Orthopedic Surgical Center (NPI: 1948201948)
Facility Tax ID: 94-8201948 | CLIA: 05D2948102

REQUESTED SERVICES:
CPT: 27447 - Total Knee Arthroplasty, Right Knee
Diagnosis (ICD-10): M17.11 - Unilateral primary osteoarthritis, right knee

CLINICAL JUSTIFICATION:
Patient is a 68-year-old female with severe right knee osteoarthritic pain (VAS 8/10).
Conservative Therapy: Trial of 8 weeks of supervised physical therapy, daily NSAIDs (Meloxicam 15mg), and intra-articular corticosteroid injection on May 12, 2026 with no significant symptom relief.
Diagnostic Imaging: Weight-bearing X-Ray demonstrates Kellgren-Lawrence Grade 4 tricompartmental osteoarthritis with bone-on-bone joint space narrowing in the medial compartment.

STANDARD REGULATORY DISCLOSURE:
This authorization is not a guarantee of payment. Benefits are subject to all terms and conditions of the plan.
Confidential Medical Information pursuant to 45 CFR § 164.502.
`.trim();

  console.log('[1/2] Compacting Prior Authorization Clinical Packet in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliPriorAuthCompactor.compactPriorAuthPacket(rawPaPacket);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Extracted CPT Codes: ${res.cptCodes.join(', ')}`);
  console.log(`      - Extracted ICD-10 Codes: ${res.icdCodes.join(', ')}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted PA Prompt Preview:\n"""\n${res.compactedPaPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.cptCodes.length, 1);
  assert.equal(res.icdCodes.length, 1);
  assert.ok(res.savingsPercentage >= 35);
  assert.ok(res.compactedPaPrompt.includes('CPT: 27447'));
  assert.ok(res.compactedPaPrompt.includes('ICD-10: M17.11'));
  assert.ok(res.compactedPaPrompt.includes('Trial of 8 weeks of supervised physical therapy'));
  assert.ok(res.compactedPaPrompt.includes('X-Ray demonstrates Kellgren-Lawrence Grade 4'));
  assert.ok(!res.compactedPaPrompt.includes('CLIA: 05D2948102')); // Facility noise pruned
  assert.ok(!res.compactedPaPrompt.includes('45 CFR § 164.502')); // Standard disclaimer pruned

  console.log('\n[✓] Healthcare Prior Auth Medical Necessity Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL PRIOR AUTH COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
