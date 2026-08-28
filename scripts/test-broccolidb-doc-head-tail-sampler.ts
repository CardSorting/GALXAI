import assert from 'node:assert/strict';
import { BroccoliDocumentHeadTailSampler } from '../src/core/broccolidb/BroccoliDocumentHeadTailSampler';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB HEAD-TAIL DOCUMENT SAMPLER');
  console.log('======================================================================\n');

  BroccoliDocumentHeadTailSampler.clear();

  // 10-paragraph long terms of service document (~1,500 tokens)
  const headP1 = '# Master Cloud Service Agreement (Executive Summary)\nThis agreement governs the enterprise subscription between GALXAI and Enterprise Client Inc.';
  const headP2 = '1. Scope of Services: The platform provides AI FinOps, sub-microsecond vector databases, and real-time streaming spend governance.';
  
  const midBoilerplate = [
    '2. Standard Warranty Disclaimer: Services are provided strictly as-is without warranties of merchantability or fitness for a particular purpose.',
    '3. Force Majeure: Neither party shall be liable for delays caused by acts of God, earthquakes, fires, power grid outages, or telecom failures.',
    '4. Severability: If any provision is deemed unenforceable by a court of competent jurisdiction, the remaining terms remain in full force.',
    '5. Entire Agreement: This document supersedes all prior oral or written discussions, agreements, or memorandum of understanding.',
    '6. Governing Law: This agreement is governed by the laws of the State of Delaware without regard to conflict of law principles.',
    '7. Dispute Resolution: All claims shall be settled via binding AAA arbitration in Wilmington, Delaware.',
  ];

  const tailP1 = '8. Pricing & Payment Terms: Net-30 payment schedule. Invoices exceeding 60 days overdue incur 1.5% interest per month.';
  const tailP2 = 'IN WITNESS WHEREOF, the authorized representatives have executed this agreement as of August 28, 2026.';

  const fullDocument = [headP1, headP2, ...midBoilerplate, tailP1, tailP2].join('\n\n');

  console.log('[1/2] Sampling High-Density Head & Tail from 10-Paragraph Legal Agreement...');
  const res = BroccoliDocumentHeadTailSampler.sampleDocument(fullDocument, 2, 2, 100);

  console.log(`      - Was Sampled: ${res.wasSampled}`);
  console.log(`      - Original Paragraphs: ${res.originalParagraphs} -> Sampled: ${res.sampledParagraphs}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Sampled Tokens: ${res.sampledTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Condensed Document Preview:\n"""\n${res.condensedDocument}\n"""`);

  assert.equal(res.wasSampled, true);
  assert.equal(res.sampledParagraphs, 5); // 2 Head + 1 Bridge + 2 Tail
  assert.ok(res.savingsPercentage >= 50);
  assert.ok(res.condensedDocument.includes('Master Cloud Service Agreement'));
  assert.ok(res.condensedDocument.includes('intermediate paragraphs'));
  assert.ok(res.condensedDocument.includes('IN WITNESS WHEREOF'));
  assert.ok(!res.condensedDocument.includes('Force Majeure'));

  console.log('\n[✓] High-Density Head-Tail Paragraph Sampling & Middle Condensation Verified.');

  console.log('\n======================================================================');
  console.log('   ALL HEAD-TAIL SAMPLER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
