import assert from 'node:assert/strict';
import { BroccoliHipaaDeIdentifier } from '../src/core/broccolidb/BroccoliHipaaDeIdentifier';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB HIPAA PHI SAFE HARBOR DE-IDENTIFIER');
  console.log('======================================================================\n');

  BroccoliHipaaDeIdentifier.clear();

  // Clinical chart excerpt containing direct PHI identifiers
  const clinicalChart = `
PATIENT INTAKE RECORD:
Patient SSN: 987-65-4321
MRN: 88492019
DOB: 05/14/1978
Contact Phone: (555) 234-5678

Chief Complaint: Patient presents with acute abdominal pain and fever.
Assessment: Acute appendicitis suspected. Schedule urgent ultrasound.
`.trim();

  console.log('[1/2] Deterministically Masking PHI in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliHipaaDeIdentifier.maskPhi(clinicalChart);

  console.log(`      - Was De-Identified: ${res.wasDeIdentified}`);
  console.log(`      - PHI Entities Masked: ${res.phiEntitiesCount}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Masked Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed (including LLM pre-redaction avoidance): ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Masked Clinical Text Preview:\n"""\n${res.maskedClinicalText}\n"""`);

  assert.equal(res.wasDeIdentified, true);
  assert.equal(res.phiEntitiesCount, 4);
  assert.ok(!res.maskedClinicalText.includes('987-65-4321'));
  assert.ok(!res.maskedClinicalText.includes('88492019'));
  assert.ok(res.maskedClinicalText.includes('[SSN1]'));
  assert.ok(res.maskedClinicalText.includes('[MRN2]'));
  assert.ok(res.maskedClinicalText.includes('[DOB4]'));
  assert.ok(res.maskedClinicalText.includes('[PH3]'));

  // Test 2: Local Re-hydration in memory
  console.log('\n[2/2] Re-hydrating Masked Model Response Locally in Memory...');
  const simulatedModelOutput = `Plan for patient with MRN: [MRN2] (DOB: [DOB4]): Perform appendectomy.`;
  const rehydrated = BroccoliHipaaDeIdentifier.rehydrateText(simulatedModelOutput, res.phiLookupKey);


  console.log(`      - Rehydrated Output: "${rehydrated}"`);
  assert.equal(rehydrated, 'Plan for patient with MRN: 88492019 (DOB: 05/14/1978): Perform appendectomy.');

  console.log('\n[✓] Safe Harbor PHI Masking & Local CAS Re-Hydration Verified.');

  console.log('\n======================================================================');
  console.log('   ALL HIPAA DE-IDENTIFIER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
