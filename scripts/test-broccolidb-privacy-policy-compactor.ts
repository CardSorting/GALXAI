import assert from 'node:assert/strict';
import { BroccoliPrivacyPolicyCompactor } from '../src/core/broccolidb/BroccoliPrivacyPolicyCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB PRIVACY POLICY & DPA COMPACTOR');
  console.log('======================================================================\n');

  BroccoliPrivacyPolicyCompactor.clear();

  // Full mock Privacy Policy & GDPR/CCPA DPA with cookie notices and arbitration waivers
  const rawPrivacy = `
GLOBAL DATA PRIVACY POLICY & CUSTOMER DATA PROCESSING ADDENDUM (DPA)
DATA CONTROLLER: Acme SaaS Enterprise Corp | GOVERNING LAW: GDPR (EU 2016/679) & CCPA/CPRA (California)

CATEGORIES OF PERSONAL DATA PROCESSED:
DATA COLLECTED: Account Identifiers (Name, Business Email), System IP Telemetry, API Query Logs
PROCESSING PURPOSES: Core Service Provisioning, Continuous Infrastructure Monitoring, and Billing

AI MODEL TRAINING & SUB-PROCESSORS:
STRICTLY OPTED OUT: NO CUSTOMER DATA IS USED TO TRAIN FOUNDATIONAL OR INTERNAL AI MODELS.
THIRD-PARTY SUB-PROCESSORS: Amazon Web Services (Cloud Hosting), Stripe Inc (Billing Processing), Datadog (Observability)

DATA RETENTION & REVISION NOTICE:
DATA RETENTION: Duration of Active Subscription Agreement + 90 Days post-termination
SUB-PROCESSOR NOTICE: 30 Days Prior Written Notice via Security Portal

COOKIE POLICY & STATUTORY CONSUMER RIGHTS:
We use first-party and third-party cookies to improve website functionality. You may configure your browser to reject cookies.
California Residents have the right to request deletion of personal information under Cal. Civ. Code § 1798.100.
BINDING ARBITRATION WAIVER: Any disputes shall be resolved via binding individual arbitration under AAA commercial rules.
CONTACT US: For inquiries, please email dpo@acmesaas.com.
`.trim();

  console.log('[1/2] Compacting Privacy Policy in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliPrivacyPolicyCompactor.compactPrivacyPolicy(rawPrivacy);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Controller: ${res.controllerAndFramework}`);
  console.log(`      - Data: ${res.dataCategoriesAndPurpose}`);
  console.log(`      - AI & Sharing: ${res.aiTrainingAndSharing}`);
  console.log(`      - Retention: ${res.retentionAndSubprocessors}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Privacy Preview:\n"""\n${res.compactedPrivacyPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.controllerAndFramework.includes('Acme SaaS Enterprise Corp'));
  assert.ok(res.controllerAndFramework.includes('GDPR'));
  assert.ok(res.aiTrainingAndSharing.includes('STRICTLY OPTED OUT'));
  assert.ok(res.aiTrainingAndSharing.includes('Amazon Web Services'));
  assert.ok(res.retentionAndSubprocessors.includes('90 Days'));
  assert.ok(res.savingsPercentage >= 30);
  assert.ok(!res.compactedPrivacyPrompt.includes('BINDING ARBITRATION WAIVER')); // Arbitration clause pruned

  assert.ok(!res.compactedPrivacyPrompt.includes('We use first-party and third-party cookies')); // Cookie text pruned
  assert.ok(!res.compactedPrivacyPrompt.includes('dpo@acmesaas.com')); // Contact email pruned

  console.log('\n[✓] Privacy Policy & GDPR/CCPA DPA Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL PRIVACY POLICY COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
