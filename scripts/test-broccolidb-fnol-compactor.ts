import assert from 'node:assert/strict';
import { BroccoliFnolCompactor } from '../src/core/broccolidb/BroccoliFnolCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB FNOL FIRST NOTICE OF LOSS & LOSS RUN COMPACTOR');
  console.log('======================================================================\n');

  BroccoliFnolCompactor.clear();

  // Full mock FNOL claim intake sheet & 5-year loss run history with weather reports and zero-dollar inquiries
  const rawFnol = `
PROPERTY & CASUALTY CLAIMS INTAKE - FIRST NOTICE OF LOSS (FNOL)
Claim Number: CLM-948201-PNC | Date of Loss: 08/28/2026 04:30 AM
Policyholder: Jane Doe | Policy Number: POL-77492019

INCIDENT DETAILS:
Cause of Loss: Water Damage (Supply Line Burst in Upstairs Bathroom)
Estimated Damage: $45,000.00
Loss Location: 742 Evergreen Terrace, Springfield, OR

POLICY COVERAGE TERMS:
Policy Form: Special Form HO-3 (Coverage A Dwelling: $500,000)
Policy Deductible: $2,500.00

HISTORICAL LOSS RUN STATEMENT (2021-2026):
5-Year Loss Ratio: 14.2%
Total Incurred: $4,800.00 across 1 prior paid claim (2023 Wind/Hail)
- 2024: Inquiry only - $0 paid (Closed)
- 2022: Glass chip inquiry - $0 paid (Closed)

CALLER & ADJUSTER NOTES:
Caller was polite, reported water shutting off via main supply valve at 05:00 AM.
Local weather at time of loss: 58°F, clear conditions.
Adjuster License #OR-948201-ADJ.
`.trim();

  console.log('[1/2] Compacting FNOL Claims & Loss Run in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliFnolCompactor.compactFnol(rawFnol);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Claim & Incident: ${res.claimIdAndLossDate}`);
  console.log(`      - Peril & Damage: ${res.perilAndDamageEstimate}`);
  console.log(`      - Coverage & Deductible: ${res.policyCoverageAndDeductible}`);
  console.log(`      - Loss Run: ${res.lossRunSummary}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted FNOL Preview:\n"""\n${res.compactedFnolPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.claimIdAndLossDate.includes('CLM-948201-PNC'));
  assert.ok(res.claimIdAndLossDate.includes('08/28/2026'));
  assert.ok(res.perilAndDamageEstimate.includes('Water Damage'));
  assert.ok(res.perilAndDamageEstimate.includes('$45,000.00'));
  assert.ok(res.policyCoverageAndDeductible.includes('$2,500.00'));
  assert.ok(res.lossRunSummary.includes('14.2%'));
  assert.ok(res.savingsPercentage >= 35);
  assert.ok(!res.compactedFnolPrompt.includes('Caller was polite')); // Caller notes pruned

  assert.ok(!res.compactedFnolPrompt.includes('Local weather at time of loss')); // Weather notes pruned
  assert.ok(!res.compactedFnolPrompt.includes('Glass chip inquiry - $0 paid')); // Zero dollar inquiry pruned

  console.log('\n[✓] FNOL First Notice of Loss & Loss Run Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL FNOL COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
