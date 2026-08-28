import assert from 'node:assert/strict';
import { BroccoliDischargeCompactor } from '../src/core/broccolidb/BroccoliDischargeCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB INPATIENT HOSPITAL DISCHARGE COMPACTOR');
  console.log('======================================================================\n');

  BroccoliDischargeCompactor.clear();

  // Full mock inpatient hospital discharge summary with daily vitals, nursing logs, diagnoses, meds, and follow-up plan
  const rawDischargeText = `
GENERAL HOSPITAL - INPATIENT DISCHARGE SUMMARY
Patient: John Doe | MRN: 9482019 | DOB: 05/14/1958
Admission Date: 08/20/2026 | Discharge Date: 08/28/2026

PRIMARY DISCHARGE DIAGNOSIS:
1. Acute decompensated heart failure with reduced ejection fraction (HFrEF, EF 30%).
2. Hypertensive emergency, resolved.
3. Type 2 diabetes mellitus with diabetic nephropathy.

HOSPITAL COURSE & DAILY NURSING LOGS:
Day 1 (08/20): Patient admitted to CCU with acute pulmonary edema. IV Lasix drip started.
Day 2 (08/21): Net negative 2.4L. Dyspnea improved. Vitals stable.
Day 3 (08/22): Transferred to stepdown unit. Weaned to oral diuretics.
[12 pages of daily physical therapy progress notes and CBC/BMP routine lab flowsheets...]

DISCHARGE MEDICATIONS:
1. Furosemide 40 mg PO daily in the morning.
2. Lisinopril 10 mg PO daily.
3. Carvedilol 6.25 mg PO BID with meals.
4. Empagliflozin 10 mg PO daily.
5. Metformin 500 mg PO BID.

DISCHARGE INSTRUCTIONS & OUTPATIENT FOLLOW-UP:
Follow-up with Dr. Henderson (Outpatient Cardiology) in 7 days on September 4, 2026.
Repeat Basic Metabolic Panel (BMP) and serum potassium in 5 days at Quest Diagnostics.
Daily morning weights; call clinic if weight increases by >3 lbs in 24 hours.
`.trim();

  console.log('[1/2] Compacting Inpatient Hospital Discharge Summary in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliDischargeCompactor.compactDischargeSummary(rawDischargeText);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Diagnoses: ${res.dischargeDiagnoses.length} items`);
  console.log(`      - Medications: ${res.dischargeMedications.length} items`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Discharge Preview:\n"""\n${res.compactedDischargePrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.dischargeDiagnoses.length, 3);
  assert.equal(res.dischargeMedications.length, 5);
  assert.ok(res.savingsPercentage >= 30);
  assert.ok(res.compactedDischargePrompt.includes('Acute decompensated heart failure'));
  assert.ok(res.compactedDischargePrompt.includes('Furosemide 40 mg'));

  assert.ok(res.compactedDischargePrompt.includes('Cardiology'));
  assert.ok(!res.compactedDischargePrompt.includes('Day 1 (08/20): Patient admitted')); // Daily logs pruned

  console.log('\n[✓] Inpatient Hospital Discharge Summary Matrix Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL DISCHARGE COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
