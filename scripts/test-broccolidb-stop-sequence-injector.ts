import assert from 'node:assert/strict';
import { BroccoliStopSequenceInjector } from '../src/core/broccolidb/BroccoliStopSequenceInjector';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB DYNAMIC STOP SEQUENCE AUTO-INJECTOR');
  console.log('======================================================================\n');

  BroccoliStopSequenceInjector.clear();

  // 1. Test ReAct Agent Pattern (Missing Stop Sequences)
  const reactPrompt = `
You are an autonomous ReAct agent.
Thought: I need to query the user's invoices in Stripe.
Action: stripe_query_invoices
Action Input: {"customerId": "cust_123"}
`;

  console.log('[1/2] Injecting Missing Stop Sequences into ReAct Agent Prompt...');
  const result1 = BroccoliStopSequenceInjector.injectStopSequences(reactPrompt);

  console.log(`      - Was Injected: ${result1.wasInjected}`);
  console.log(`      - Detected Pattern: ${result1.detectedPattern}`);
  console.log(`      - Injected Stop Sequences:`, result1.injectedStopSequences);
  console.log(`      - Estimated Avoided Output Tokens: ${result1.estimatedAvoidedTokens} tokens`);

  assert.equal(result1.wasInjected, true);
  assert.equal(result1.detectedPattern, 'REACT_AGENT_LOOP');
  assert.ok(result1.injectedStopSequences.includes('\nObservation:'));
  assert.ok(result1.injectedStopSequences.includes('\nUser:'));

  // 2. Test Structured Q&A Pattern
  const qaPrompt = `
Question: What is the primary function of a DNS resolver?
Answer:
`;

  console.log('\n[2/2] Injecting Missing Stop Sequences into Structured Q&A Prompt...');
  const result2 = BroccoliStopSequenceInjector.injectStopSequences(qaPrompt);

  console.log(`      - Was Injected: ${result2.wasInjected}`);
  console.log(`      - Detected Pattern: ${result2.detectedPattern}`);
  console.log(`      - Injected Stop Sequences:`, result2.injectedStopSequences);

  assert.equal(result2.wasInjected, true);
  assert.equal(result2.detectedPattern, 'STRUCTURED_QA');
  assert.ok(result2.injectedStopSequences.includes('\nQuestion:'));

  console.log('\n[✓] Dynamic Stop Sequence Auto-Injection Verified.');

  console.log('\n======================================================================');
  console.log('   ALL STOP SEQUENCE INJECTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
