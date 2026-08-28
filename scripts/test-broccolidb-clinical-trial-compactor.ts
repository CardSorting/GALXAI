import assert from 'node:assert/strict';
import { BroccoliClinicalTrialCompactor } from '../src/core/broccolidb/BroccoliClinicalTrialCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CLINICAL TRIAL & MedDRA COMPACTOR');
  console.log('======================================================================\n');

  BroccoliClinicalTrialCompactor.clear();

  // Full mock FDA Clinical Trial Protocol & MedDRA adverse events table with statistical formulas and site directories
  const rawTrial = `
CLINICAL STUDY PROTOCOL - INVESTIGATIONAL NEW DRUG (IND)
Protocol ID: NCT05849201 | Study Phase: Phase 3 Randomized Double-Blind Placebo-Controlled Trial
Sponsor: Global Oncology Therapeutics Inc.

ELIGIBILITY CRITERIA:
- Age 18 to 75 years at time of screening
- Histologically confirmed metastatic non-small cell lung cancer (NSCLC) with EGFR exon 19 deletion
- Eastern Cooperative Oncology Group (ECOG) performance status of 0 or 1
- Adequate hematologic and organ function (Absolute Neutrophil Count >= 1,500/uL, Platelets >= 100,000/uL)

PRIMARY ENDPOINTS:
Overall Survival (OS) evaluated at 24 months from randomization; Progression-Free Survival (PFS) according to RECIST v1.1.

GRADE 3/4 TOXICITY & MEDDRA ADVERSE REACTIONS:
- Febrile Neutropenia (3.4% of treatment arm vs 0.8% placebo)
- Elevated Alanine Aminotransferase (ALT) Grade 3 (6.2% vs 1.1%)
- Peripheral Neuropathy Grade 3 (2.1% vs 0.4%)
- Interstitial Lung Disease / Pneumonitis Grade 3 (1.5% vs 0.0%)

INVESTIGATOR DIRECTORY & STUDY SITES:
Site 001: Memorial Sloan Kettering Cancer Center, Principal Investigator: Dr. Eleanor Vance, MD.
Site 002: MD Anderson Cancer Center, Principal Investigator: Dr. Marcus Sterling, MD.
[45 additional pages detailing power calculations, sample size justifications, and Helsinki Declaration ethical approvals...]
`.trim();

  console.log('[1/2] Compacting Clinical Trial Protocol in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliClinicalTrialCompactor.compactClinicalTrial(rawTrial);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Study: ${res.trialIdAndPhase}`);
  console.log(`      - Eligibility: ${res.eligibilitySummary}`);
  console.log(`      - Primary Endpoints: ${res.primaryEndpoints}`);
  console.log(`      - Grade 3/4 SAEs: ${res.adverseEventsGrade34}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Trial Preview:\n"""\n${res.compactedTrialPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.trialIdAndPhase.includes('NCT05849201'));
  assert.ok(res.savingsPercentage >= 25);
  assert.ok(res.compactedTrialPrompt.includes('NCT05849201'));

  assert.ok(res.compactedTrialPrompt.includes('EGFR exon 19'));
  assert.ok(res.compactedTrialPrompt.includes('Overall Survival (OS)'));
  assert.ok(res.compactedTrialPrompt.includes('Febrile Neutropenia'));
  assert.ok(!res.compactedTrialPrompt.includes('Memorial Sloan Kettering Cancer Center')); // Site directory pruned
  assert.ok(!res.compactedTrialPrompt.includes('Dr. Eleanor Vance')); // PI names pruned

  console.log('\n[✓] Clinical Trial Protocol & MedDRA SAE Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL CLINICAL TRIAL COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
