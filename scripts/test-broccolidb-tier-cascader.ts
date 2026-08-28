import assert from 'node:assert/strict';
import { BroccoliTierCascader } from '../src/core/broccolidb/BroccoliTierCascader';

async function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB MULTI-LEVEL TIER CASCADER & AUTONOMOUS FALLBACKS');
  console.log('======================================================================\n');

  BroccoliTierCascader.clear();

  // 1. Test Tier 1 Classification (Routine Q&A -> Luna)
  console.log('[1/3] Testing Tier 1 Routine Query ("What is the capital of France?")...');
  const class1 = BroccoliTierCascader.classifyAndRoute('What is the capital of France?', 20, 10);
  console.log(`      - Classified Tier: ${class1.tier}`);
  console.log(`      - Recommended Model: ${class1.recommendedModelId}`);
  console.log(`      - Savings vs Sol: ${class1.savingsPercentage}%`);

  assert.equal(class1.tier, 'TIER_1_LUNA');
  assert.equal(class1.recommendedModelId, 'gpt-5.6-luna');
  assert.ok(class1.savingsPercentage >= 90);

  // 2. Test Tier 2 Classification (Document Summarization -> Terra)
  console.log('\n[2/3] Testing Tier 2 Synthesis ("Summarize the following quarterly earnings report")...');
  const class2 = BroccoliTierCascader.classifyAndRoute('Summarize the following quarterly earnings report in 3 bullets', 800, 300);
  console.log(`      - Classified Tier: ${class2.tier}`);
  console.log(`      - Recommended Model: ${class2.recommendedModelId}`);
  console.log(`      - Savings vs Sol: ${class2.savingsPercentage}%`);

  assert.equal(class2.tier, 'TIER_2_TERRA');
  assert.equal(class2.recommendedModelId, 'gpt-5.6-terra');
  assert.ok(class2.savingsPercentage >= 40);

  // 3. Test Tier 3 Classification (Mathematical Proof / Complex Reasoning -> Sol)
  console.log('\n[3/3] Testing Tier 3 Deep Reasoning ("Prove that the square root of 2 is irrational using formal logic")...');
  const class3 = BroccoliTierCascader.classifyAndRoute('Prove that the square root of 2 is irrational using formal logic and step-by-step reasoning', 1500, 800);
  console.log(`      - Classified Tier: ${class3.tier}`);
  console.log(`      - Recommended Model: ${class3.recommendedModelId}`);
  console.log(`      - Savings vs Sol: ${class3.savingsPercentage}%`);

  assert.equal(class3.tier, 'TIER_3_SOL');
  assert.equal(class3.recommendedModelId, 'gpt-5.6-sol');
  assert.equal(class3.savingsPercentage, 0);

  // 4. Test Autonomous Retry Fallback (Luna throws -> automatically recovers on Terra)
  console.log('\n[4/4] Testing Autonomous Fallback when Luna fails upstream...');
  const cascadeRes = await BroccoliTierCascader.executeWithCascade(
    'What is the capital of France?',
    20,
    10,
    {
      lunaRunner: async () => {
        throw new Error('Simulated upstream 503 from Luna endpoint');
      },
      terraRunner: async () => {
        return 'Paris (recovered on Terra)';
      },
      solRunner: async () => {
        return 'Paris (recovered on Sol)';
      },
    }
  );

  console.log(`      - Recovered Result: "${cascadeRes.result}"`);
  console.log(`      - Effective Model Used: ${cascadeRes.effectiveModel}`);
  console.log(`      - Fallback Tier: ${cascadeRes.tier}`);

  assert.equal(cascadeRes.result, 'Paris (recovered on Terra)');
  assert.equal(cascadeRes.effectiveModel, 'gpt-5.6-terra');

  console.log('\n[✓] Multi-Level Tier Cascading & Autonomous Fallback Execution Verified.');

  console.log('\n======================================================================');
  console.log('   ALL TIER CASCADER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
