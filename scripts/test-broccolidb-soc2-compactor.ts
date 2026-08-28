import assert from 'node:assert/strict';
import { BroccoliSoc2Compactor } from '../src/core/broccolidb/BroccoliSoc2Compactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SOC 2 & SECURITY AUDIT COMPACTOR');
  console.log('======================================================================\n');

  BroccoliSoc2Compactor.clear();

  // Full mock SOC 2 Type II report with auditor boilerplate, facility descriptions, and testing logs
  const rawSoc2 = `
INDEPENDENT SERVICE AUDITOR'S REPORT ON CONTROLS RELEVANT TO SECURITY & CONFIDENTIALITY
REPORT ON: GALXAI Technologies Inc | AUDIT PERIOD: January 1, 2026 to December 31, 2026
TRUST SERVICES CRITERIA: Security, Availability, and Confidentiality (CC6.1 - CC8.1)

INDEPENDENT AUDITOR OPINION:
In our opinion, in all material respects, management's description of the system is fairly presented, and controls operated effectively throughout the testing period.
AUDITOR OPINION: UNQUALIFIED

CONTROL TESTING SUMMARY:
CONTROLS TESTED: 84
EXCEPTIONS NOTED: NONE

KEY TRUST SERVICES CONTROLS TESTED:
CC6.1: Multi-Factor Authentication (MFA) is strictly enforced for all administrative and user access to production infrastructure.
CC6.6: Boundary protection systems, Web Application Firewalls (WAF), and automated DDoS mitigation are actively monitored.
CC7.1: Continuous vulnerability scanning and annual third-party penetration tests are executed with zero critical findings.

SYSTEM BOUNDARIES & INFRASTRUCTURE OVERVIEW:
GALXAI operates cloud infrastructure across multiple AWS regions (us-east-1, us-west-2) utilizing SOC 2 certified data center facilities with biometric access controls...
`.trim();

  console.log('[1/2] Compacting SOC 2 Report in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliSoc2Compactor.compactSoc2(rawSoc2);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Entity: ${res.orgAndScope}`);
  console.log(`      - Opinion: ${res.auditorOpinionAndPeriod}`);
  console.log(`      - Testing: ${res.controlsAndExceptions}`);
  console.log(`      - Controls: ${res.coreSecurityControls}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted SOC 2 Preview:\n"""\n${res.compactedSoc2Prompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.orgAndScope.includes('GALXAI Technologies Inc'));
  assert.ok(res.auditorOpinionAndPeriod.includes('UNQUALIFIED'));
  assert.ok(res.controlsAndExceptions.includes('84 Controls'));
  assert.ok(res.controlsAndExceptions.includes('0 Exceptions Noted'));
  assert.ok(res.savingsPercentage >= 30);
  assert.ok(!res.compactedSoc2Prompt.includes('In our opinion, in all material respects')); // Boilerplate pruned
  assert.ok(!res.compactedSoc2Prompt.includes('biometric access controls')); // Facility description pruned

  console.log('\n[✓] SOC 2 Type II & Security Audit Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL SOC 2 COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
