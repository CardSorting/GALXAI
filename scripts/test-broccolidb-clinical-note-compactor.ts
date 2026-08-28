import assert from 'node:assert/strict';
import { BroccoliClinicalNoteCompactor } from '../src/core/broccolidb/BroccoliClinicalNoteCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CLINICAL EHR NOTE COMPACTOR');
  console.log('======================================================================\n');

  BroccoliClinicalNoteCompactor.clear();

  // Clinical SOAP note with verbose negative ROS padding and long disease names
  const clinicalNote = `
PATIENT CLINICAL PROGRESS NOTE
Chief Complaint: Follow-up for chronic conditions and routine lab review.

History of Present Illness:
Patient is a 58-year-old male with history of essential hypertension, type 2 diabetes mellitus, and hyperlipidemia.
Currently adheres to metformin 1000mg BID and lisinopril 20mg daily.

Review of Systems:
The patient denies fever, chills, fatigue, shortness of breath, chest pain, nausea, vomiting, diarrhea, dizziness, headaches, vision changes, or palpitations.

Assessment & Plan:
1. Essential hypertension: Blood pressure 128/82. Stable on current lisinopril regimen.
2. Type 2 diabetes mellitus: HbA1c 6.8%. Well controlled.
3. Hyperlipidemia: Fasting LDL 88 mg/dL.
`.trim();

  console.log('[1/2] Compacting Clinical EHR Note in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliClinicalNoteCompactor.compactClinicalNote(clinicalNote);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Note Preview:\n"""\n${res.compactedClinicalNote}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.savingsPercentage >= 15);
  assert.ok(res.compactedClinicalNote.includes('HTN [I10]'));
  assert.ok(res.compactedClinicalNote.includes('T2DM [E11.9]'));
  assert.ok(res.compactedClinicalNote.includes('HLD [E78.5]'));
  assert.ok(res.compactedClinicalNote.includes('ROS: Negative for acute'));
  assert.ok(!res.compactedClinicalNote.includes('denies fever, chills, fatigue'));

  console.log('\n[✓] Clinical ROS Pruning & ICD-10 Normalization Verified.');

  console.log('\n======================================================================');
  console.log('   ALL CLINICAL COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
