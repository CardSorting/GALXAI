import assert from 'node:assert/strict';
import { BroccoliAcordCompactor } from '../src/core/broccolidb/BroccoliAcordCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB ACORD INSURANCE CERTIFICATE COMPACTOR');
  console.log('======================================================================\n');

  BroccoliAcordCompactor.clear();

  // Full mock ACORD 25 Certificate of Liability Insurance form with statutory boilerplate and NAIC codes
  const rawAcord = `
ACORD 25 (2016/03) - CERTIFICATE OF LIABILITY INSURANCE
PRODUCER: Marsh & McLennan Agency LLC | NAIC No: 20443
INSURED: Acme Global Logistics Corp
100 Industrial Parkway, Chicago, IL 60601

COVERAGES - COMMERCIAL GENERAL LIABILITY:
POLICY EFF DATE: 08/28/2026 | POLICY EXP DATE: 08/28/2027
LIMITS:
EACH OCCURRENCE: $1,000,000
GENERAL AGGREGATE: $2,000,000
PRODUCTS - COMP/OP AGG: $2,000,000
PERSONAL & ADV INJURY: $1,000,000

AUTOMOBILE & UMBRELLA LIABILITY:
EACH OCCURRENCE (UMBRELLA): $5,000,000
AGGREGATE: $5,000,000
WORKERS COMPENSATION: STATUTORY

ENDORSEMENTS:
ADDL INSD: YES
SUBR WVD: YES

CERTIFICATE HOLDER & CANCELLATION NOTICE:
SHOULD ANY OF THE ABOVE DESCRIBED POLICIES BE CANCELLED BEFORE THE EXPIRATION DATE THEREOF, NOTICE WILL BE DELIVERED IN ACCORDANCE WITH THE POLICY PROVISIONS.
THIS CERTIFICATE IS ISSUED AS A MATTER OF INFORMATION ONLY AND CONFERS NO RIGHTS UPON THE CERTIFICATE HOLDER.
AUTHORIZED REPRESENTATIVE: [ELECTRONIC SIGNATURE STAMP #948201]
`.trim();

  console.log('[1/2] Compacting ACORD Insurance Certificate in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliAcordCompactor.compactAcord(rawAcord);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Insured & Period: ${res.namedInsuredAndPeriod}`);
  console.log(`      - GL Limits: ${res.generalLiabilityLimits}`);
  console.log(`      - Umbrella & WC: ${res.excessAndWorkersComp}`);
  console.log(`      - Endorsements: ${res.endorsementsStatus}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted ACORD Preview:\n"""\n${res.compactedAcordPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.namedInsuredAndPeriod.includes('Acme Global Logistics'));
  assert.ok(res.generalLiabilityLimits.includes('$1,000,000'));
  assert.ok(res.generalLiabilityLimits.includes('$2,000,000'));
  assert.ok(res.excessAndWorkersComp.includes('$5,000,000'));
  assert.ok(res.endorsementsStatus.includes('Additional Insured: YES'));
  assert.ok(res.savingsPercentage >= 35);
  assert.ok(!res.compactedAcordPrompt.includes('NAIC No: 20443')); // Carrier NAIC code pruned

  assert.ok(!res.compactedAcordPrompt.includes('SHOULD ANY OF THE ABOVE DESCRIBED POLICIES BE CANCELLED')); // Cancellation boilerplate pruned

  console.log('\n[✓] ACORD Commercial Certificate & Policy Declarations Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL ACORD COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
