import assert from 'node:assert/strict';
import { BroccoliSlotCompactor } from '../src/core/broccolidb/BroccoliSlotCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB SLOT STATE COMPACTOR');
  console.log('======================================================================\n');

  BroccoliSlotCompactor.clear();

  // 12-turn chit-chat intake history (~850 tokens)
  const intakeChatHistory = [
    { role: 'assistant', content: 'Welcome to GALXAI! What is your full legal name?' },
    { role: 'user', content: 'Hi there, my name is Alice Smith.' },
    { role: 'assistant', content: 'Nice to meet you, Alice! What company are you representing today?' },
    { role: 'user', content: 'I am representing Acme Financial Services Inc.' },
    { role: 'assistant', content: 'Great. What is your corporate billing email address?' },
    { role: 'user', content: 'You can reach our team at billing@acmefinancial.com.' },
    { role: 'assistant', content: 'Got it. How many seats will your organization need for the initial deployment?' },
    { role: 'user', content: 'We are planning to start with 50 engineer seats.' },
    { role: 'assistant', content: 'Understood. Do you require HIPAA and SOC2 Type II compliance controls?' },
    { role: 'user', content: 'Yes, we are a financial firm so SOC2 compliance is mandatory.' },
    { role: 'assistant', content: 'Perfect. Which cloud deployment region do you prefer for data residency?' },
    { role: 'user', content: 'We need all vector embeddings and BroccoliDB instances located in us-east-1.' },
  ];

  // Active extracted slot state in BroccoliDB
  const activeSlots = {
    name: 'Alice Smith',
    company: 'Acme Financial Services Inc',
    email: 'billing@acmefinancial.com',
    seats: 50,
    soc2Compliant: true,
    region: 'us-east-1',
  };

  const latestUserUtterance = 'Can we also enable SSO with Okta SAML 2.0?';

  console.log('[1/2] Compacting 12-Turn Intake Chit-Chat into Dense Slot Matrix...');
  const res = BroccoliSlotCompactor.compactIntakeHistory(
    'session_onboarding_441',
    intakeChatHistory,
    activeSlots,
    latestUserUtterance
  );

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Original Chit-Chat Turns: ${res.originalTurnsCount}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Prompt Sent to Model:\n"""\n${res.condensedPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.ok(res.savingsPercentage >= 65);
  assert.ok(res.condensedPrompt.includes('ACCUMULATED_INTAKE_SLOTS'));
  assert.ok(res.condensedPrompt.includes('Alice Smith'));
  assert.ok(res.condensedPrompt.includes('Okta SAML 2.0'));
  assert.ok(!res.condensedPrompt.includes('Nice to meet you, Alice!'));

  console.log('\n[✓] Conversational Chit-Chat Discarding & Slot Matrix Compaction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL SLOT COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
