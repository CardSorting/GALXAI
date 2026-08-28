import assert from 'node:assert/strict';
import { BroccoliLiveSpendGuard } from '../src/core/broccolidb/BroccoliLiveSpendGuard';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB LIVE SPEND GUARD & IN-FLIGHT HARD KILL SWITCH');
  console.log('======================================================================\n');

  BroccoliLiveSpendGuard.clear();

  // 1. Set $10.00 hard budget limit for customer_experience
  console.log('[1/3] Configuring $10.00 hard monthly limit for customer_experience...');
  BroccoliLiveSpendGuard.setBudget('customer_experience', 10.00);

  // 2. Spend $5.00 (Healthy -> PROCEED)
  console.log('\n[2/3] Ingesting $5.00 spend (50% utilization -> Expected: PROCEED)...');
  const eval1 = BroccoliLiveSpendGuard.evaluateSpend('customer_experience', 5.00);
  console.log(`      - Action: ${eval1.action} | Utilization: ${eval1.budgetUtilizationPct}% | Allowed: ${eval1.allowed}`);
  assert.equal(eval1.action, 'PROCEED');
  assert.equal(eval1.allowed, true);

  // 3. Spend another $3.50 ($8.50 total -> 85% utilization -> Expected: THROTTLE_AND_DOWNGRADE)
  console.log('\n[3/3] Ingesting $3.50 spend ($8.50 total -> 85% utilization -> Expected: THROTTLE_AND_DOWNGRADE)...');
  const eval2 = BroccoliLiveSpendGuard.evaluateSpend('customer_experience', 3.50);
  console.log(`      - Action: ${eval2.action} | Utilization: ${eval2.budgetUtilizationPct}% | Allowed: ${eval2.allowed}`);
  assert.equal(eval2.action, 'THROTTLE_AND_DOWNGRADE');
  assert.equal(eval2.allowed, true);

  // 4. Spend another $2.00 ($10.50 total -> 105% utilization -> Expected: HARD_TERMINATE)
  console.log('\n[4/4] Ingesting $2.00 spend ($10.50 total -> >100% -> Expected: HARD_TERMINATE)...');
  const eval3 = BroccoliLiveSpendGuard.evaluateSpend('customer_experience', 2.00);
  console.log(`      - Action: ${eval3.action} | Utilization: ${eval3.budgetUtilizationPct}% | Allowed: ${eval3.allowed}`);
  console.log(`      - Rejection Reason: "${eval3.rejectionReason}"`);
  assert.equal(eval3.action, 'HARD_TERMINATE');
  assert.equal(eval3.allowed, false);

  console.log('\n[✓] In-Flight Live Spend Guard & Hard Kill Switch Protection Verified.');

  console.log('\n======================================================================');
  console.log('   ALL LIVE SPEND GUARD TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
