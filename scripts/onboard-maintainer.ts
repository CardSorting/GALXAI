#!/usr/bin/env node
/**
 * scripts/onboard-maintainer.ts
 * 
 * Interactive Maintainer Onboarding Diagnostic & Verification Suite.
 * Validates local workstation environment, cryptographic enclaves,
 * compaction facades, and empirical boundary readiness in < 5 seconds.
 * 
 * Usage:
 *   npm run onboard
 *   npx tsx scripts/onboard-maintainer.ts
 */

import { BroccoliCompactionFacade } from '../src/core/broccolidb/BroccoliCompactionFacade';
import { BroccoliCompactionSafety } from '../src/core/broccolidb/BroccoliCompactionSafety';
import { GalxCryptoVault } from '../src/core/vault/GalxCryptoVault';
import { BroccoliInferenceBoundaryBenchmarker } from '../src/core/broccolidb/eval/BroccoliInferenceBoundaryBenchmarker';
import * as fs from 'fs';
import * as path from 'path';

interface CheckItem {
  name: string;
  category: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  details: string;
}

const checks: CheckItem[] = [];

function recordCheck(name: string, category: string, status: 'PASS' | 'WARN' | 'FAIL', details: string) {
  checks.push({ name, category, status, details });
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`  ${icon} [${category}] ${name}: ${details}`);
}

async function runOnboardingDiagnostics() {
  console.log('\n======================================================================');
  console.log('  🌌 GALXAI: REPOSITORY MAINTAINER ONBOARDING DIAGNOSTIC ENGINE');
  console.log('  Target Standard: Zero-Hesitation Day-1 Developer Bootstrap');
  console.log('======================================================================\n');

  // 1. Runtime & Environment Checks
  console.log('📋 [PHASE 1: RUNTIME & WORKSTATION ENVIRONMENT]');
  const nodeVersion = process.version;
  const majorNode = parseInt(nodeVersion.replace(/^v/, '').split('.')[0], 10);
  if (majorNode >= 20) {
    recordCheck('Node.js Version', 'Runtime', 'PASS', `${nodeVersion} (Satisfies >= v20.0.0 LTS)`);
  } else {
    recordCheck('Node.js Version', 'Runtime', 'FAIL', `${nodeVersion} (Must be >= v20.0.0)`);
  }

  const envPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  if (fs.existsSync(envPath)) {
    recordCheck('Local Environment File', 'Config', 'PASS', '.env.local present');
  } else if (fs.existsSync(envExamplePath)) {
    recordCheck('Local Environment File', 'Config', 'WARN', '.env.local missing (can copy from .env.example)');
  } else {
    recordCheck('Local Environment File', 'Config', 'FAIL', 'Neither .env.local nor .env.example found');
  }

  // 2. Cryptographic Enclave & Vault
  console.log('\n🔒 [PHASE 2: CRYPTOGRAPHIC ENCLAVE & VAULT INVARIANTS]');
  try {
    const testSecret = 'sk-galx-onboarding-test-key-2026';
    const tenantUid = 'tenant_onboarding_dev';
    const shardId = 'shard_test_01';
    const encrypted = GalxCryptoVault.encryptSecret({ apiKey: testSecret }, tenantUid, shardId, 'openai');
    const decrypted = GalxCryptoVault.decryptSecret(encrypted, tenantUid, shardId, 'openai');
    
    if (decrypted.apiKey === testSecret) {
      recordCheck('AES-256-GCM + AAD Roundtrip', 'Crypto', 'PASS', 'Envelope encryption & authenticated data verified');
    } else {
      recordCheck('AES-256-GCM + AAD Roundtrip', 'Crypto', 'FAIL', 'Decrypted text does not match original');
    }
  } catch (err: any) {
    recordCheck('AES-256-GCM + AAD Roundtrip', 'Crypto', 'FAIL', `Vault cipher error: ${err.message}`);
  }

  // 3. BroccoliDB Compaction Facade
  console.log('\n🥦 [PHASE 3: BROCCOLIDB COMPACTION & SAFETY GATES]');
  try {
    const rawSample = `PROPOUNDING PARTY: Plaintiff Acme Corp
RESPONDING PARTY: Defendant Zenith LLC
SET NUMBER: One (1)
SPECIAL INTERROGATORY NO. 14: Please identify every person who participated in the trade secret misappropriation meeting on June 14, 2026.
RESPONSE TO SPECIAL INTERROGATORY NO. 14: Responding party objects on grounds of attorney-client privilege, work product doctrine, and undue burden. Subject to said objections: Dr. Alexander Chen and Marcus Thorne were present.
` + 'STANDARD BOILERPLATE OBJECTION WORDS '.repeat(60);

    const result = BroccoliCompactionFacade.compact({
      mode: 'domain',
      text: rawSample,
      domainHint: 'Interrogatory'
    });

    const domainRes = (result as any).result;
    if (result && result.mode === 'domain' && domainRes && domainRes.fidelityStatus === 'verified') {
      recordCheck('BroccoliCompactionFacade', 'Compaction', 'PASS', `Compacted with verified fidelity (${domainRes.savingsPercentage.toFixed(1)}% reduction)`);
    } else {
      recordCheck('BroccoliCompactionFacade', 'Compaction', 'WARN', 'Compaction returned fallback or unverified result');
    }






    // Test fail-closed safety gate
    const tampered = BroccoliCompactionSafety.verify(
      'The payment is $50,000.00 USD on 2026-09-01',
      'The payment is $999,999.00 USD on 2026-09-01'
    );
    if (tampered.status === 'fallback' && tampered.unsupportedFacts.length > 0) {
      recordCheck('BroccoliCompactionSafety Gate', 'Safety', 'PASS', `Correctly intercepted ungrounded fact [${tampered.unsupportedFacts.join(', ')}] (Fail-Closed)`);
    } else {
      recordCheck('BroccoliCompactionSafety Gate', 'Safety', 'FAIL', 'Safety gate failed to intercept tampered number');
    }
  } catch (err: any) {
    recordCheck('BroccoliCompactionFacade', 'Compaction', 'FAIL', `Compaction error: ${err.message}`);
  }

  // 4. Empirical Boundary Benchmarker Fast Probe
  console.log('\n📊 [PHASE 4: EMPIRICAL INFERENCE BOUNDARY TEST APPARATUS]');
  try {
    const benchSuite = await BroccoliInferenceBoundaryBenchmarker.runSuite({
      modelId: 'gpt-4o-mini',
      forceOffline: true
    });
    if (benchSuite.galxSuccessRatePercentage === 100 && benchSuite.totalDollarsSavedUSD > 0) {
      recordCheck('Inference Boundary Benchmark', 'Benchmarking', 'PASS', `Modeled savings: ${(benchSuite.overallBilledCostReductionPercentage).toFixed(1)}% (100% Quality Score)`);
    } else {
      recordCheck('Inference Boundary Benchmark', 'Benchmarking', 'WARN', 'Boundary test ran with warnings');
    }
  } catch (err: any) {
    recordCheck('Inference Boundary Benchmark', 'Benchmarking', 'FAIL', `Benchmark runner error: ${err.message}`);
  }

  // 5. Documentation & Playbook Inventory
  console.log('\n📚 [PHASE 5: DOCUMENTATION & PLAYBOOK ASSETS]');
  const requiredDocs = [
    'MAINTAINERS.md',
    'CONTRIBUTING.md',
    '.github/CODEOWNERS',
    'docs/ARCHITECTURE.md',
    'docs/BROCCOLIDB_COMPACTION_ONBOARDING_GUIDE.md',
    'docs/FORENSIC_PAYLOAD_DISSECTION_AND_CAUSAL_ANALYSIS.md',
    'docs/playbooks/08-unframed-developer-observation-protocol.md'
  ];

  let docsPass = true;
  for (const doc of requiredDocs) {
    if (!fs.existsSync(path.join(process.cwd(), doc))) {
      docsPass = false;
      recordCheck(`Doc: ${doc}`, 'Documentation', 'FAIL', 'Missing from workspace');
    }
  }
  if (docsPass) {
    recordCheck('Core Maintainer Documentation Suite', 'Documentation', 'PASS', 'All primary specs, ADRs & playbooks indexed');
  }

  // Summary Scorecard
  const passCount = checks.filter(c => c.status === 'PASS').length;
  const warnCount = checks.filter(c => c.status === 'WARN').length;
  const failCount = checks.filter(c => c.status === 'FAIL').length;

  console.log('\n======================================================================');
  console.log(`  ONBOARDING DIAGNOSTIC SCORECARD: ${passCount} PASSED | ${warnCount} WARNINGS | ${failCount} FAILS`);
  console.log('======================================================================');

  if (failCount === 0) {
    console.log('\n🎉 WORKSTATION READY! You are fully equipped for GALXAI maintenance.');
    console.log('   Next Steps:');
    console.log('   1. Review MAINTAINERS.md (Day 1 -> Day 30 Onboarding Ramp)');
    console.log('   2. Run `npm run dev` to launch the local gateway and UI.');
    console.log('   3. Run `npm run bench:inference-boundary` for the empirical boundary pass.\n');
  } else {
    console.log('\n⚠️  ACTION REQUIRED: Address the failing checks above before submitting PRs.\n');
    process.exit(1);
  }
}

runOnboardingDiagnostics().catch((err) => {
  console.error('Fatal diagnostic error:', err);
  process.exit(1);
});
