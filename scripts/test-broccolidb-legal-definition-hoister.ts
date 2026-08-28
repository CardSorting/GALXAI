import assert from 'node:assert/strict';
import { BroccoliLegalDefinitionHoister, DefinitionEntry } from '../src/core/broccolidb/BroccoliLegalDefinitionHoister';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB LEGAL DEFINITION HOISTER');
  console.log('======================================================================\n');

  BroccoliLegalDefinitionHoister.clear();

  // Regulatory Definition Preamble (GDPR Article 4 style - 8 definitions)
  const statutoryDefinitions: DefinitionEntry[] = [
    { term: 'Personal Data', definition: 'Any information relating to an identified or identifiable natural person.' },
    { term: 'Processing', definition: 'Any operation or set of operations performed on personal data or on sets of personal data.' },
    { term: 'Controller', definition: 'The natural or legal person which determines the purposes and means of the processing.' },
    { term: 'Processor', definition: 'A natural or legal person which processes personal data on behalf of the controller.' },
    { term: 'Pseudonymisation', definition: 'The processing of personal data in such a manner that the personal data can no longer be attributed to a specific data subject.' },
    { term: 'Filing System', definition: 'Any structured set of personal data which are accessible according to specific criteria.' },
    { term: 'Biometric Data', definition: 'Personal data resulting from specific technical processing relating to physical characteristics.' },
    { term: 'Genetic Data', definition: 'Personal data relating to the inherited or acquired genetic characteristics of a natural person.' },
  ];

  // Specific user query referencing only "personal data" and "controller"
  const legalInquiry = 'Under Article 6, when is the Controller permitted to process Personal Data without explicit consent?';

  console.log('[1/2] Hoisting Scoped Definitions in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliLegalDefinitionHoister.hoistRelevantDefinitions(legalInquiry, statutoryDefinitions);

  console.log(`      - Was Pruned: ${res.wasPruned}`);
  console.log(`      - Total Definitions: ${res.totalDefinitionsCount} (Retained: ${res.retainedDefinitionsCount}, Pruned: ${res.prunedDefinitionsCount})`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Scoped Definitions Preamble Preview:\n"""\n${res.scopedDefinitionsPreamble}\n"""`);

  assert.equal(res.wasPruned, true);
  assert.equal(res.retainedDefinitionsCount, 2);
  assert.equal(res.prunedDefinitionsCount, 6);
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.scopedDefinitionsPreamble.includes('Personal Data'));
  assert.ok(res.scopedDefinitionsPreamble.includes('Controller'));
  assert.ok(!res.scopedDefinitionsPreamble.includes('Genetic Data'));
  assert.ok(!res.scopedDefinitionsPreamble.includes('Biometric Data'));

  console.log('\n[✓] Statutory Definition Hoisting & Scoped Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL LEGAL DEFINITION HOISTER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
