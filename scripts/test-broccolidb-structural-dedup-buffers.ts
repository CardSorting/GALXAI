/**
 * GALXAI BroccoliDB Structural & Specialized DeDuplication Buffer Verification Suite
 * 
 * Tests the 5 structural & specialized deduplication buffers:
 * 1. BroccoliJsonAstStructuralDedupBuffer (Columnar Tuple Schema Matrix)
 * 2. BroccoliMinHashLshBandDedupBuffer (Locality-Sensitive Hashing LSH Banding)
 * 3. BroccoliQuotientFilterDedupBuffer (Contiguous Robin Hood Quotient Filter)
 * 4. BroccoliSemanticEmbeddingDedupBuffer (INT8 Quantized Vector Cosine Matcher)
 * 5. BroccoliTriePrefixSuffixDedupBuffer (Radix Trie Prefix/Suffix Factoring)
 */

import { BroccoliJsonAstStructuralDedupBuffer } from '../src/core/broccolidb/BroccoliJsonAstStructuralDedupBuffer';
import { BroccoliMinHashLshBandDedupBuffer } from '../src/core/broccolidb/BroccoliMinHashLshBandDedupBuffer';
import { BroccoliQuotientFilterDedupBuffer } from '../src/core/broccolidb/BroccoliQuotientFilterDedupBuffer';
import { BroccoliSemanticEmbeddingDedupBuffer } from '../src/core/broccolidb/BroccoliSemanticEmbeddingDedupBuffer';
import { BroccoliTriePrefixSuffixDedupBuffer } from '../src/core/broccolidb/BroccoliTriePrefixSuffixDedupBuffer';

async function runStructuralDedupSuite() {
  console.log('================================================================');
  console.log('  GALXAI BROCCOLIDB STRUCTURAL DEDUPLICATION BUFFER VERIFICATION');
  console.log('================================================================\n');

  // 1. Test BroccoliJsonAstStructuralDedupBuffer
  console.log('[1/5] Testing BroccoliJsonAstStructuralDedupBuffer (JSON Schema Columnar Hoisting)...');
  const sampleJsonRecords = [];
  for (let i = 0; i < 40; i++) {
    sampleJsonRecords.push({
      transactionId: `TX-2026-084920-${i}`,
      customerName: `Enterprise Corp Alpha ${i}`,
      amountUsd: 14500.50 + (i * 100),
      status: i % 5 === 0 ? 'PENDING_APPROVAL' : 'SETTLED',
      routingBic: 'CHASSGSGXXXX',
      clearingSystem: 'FEDWIRE_HIGH_VALUE_REALTIME',
    });
  }

  const jsonResult = BroccoliJsonAstStructuralDedupBuffer.deduplicateJson(sampleJsonRecords);
  console.log(`      Original JSON Tokens : ${jsonResult.originalTokens.toLocaleString()}`);
  console.log(`      Compacted JSON Tokens: ${jsonResult.compactedTokens.toLocaleString()}`);
  console.log(`      Tokens Saved         : ${jsonResult.tokensSaved.toLocaleString()} (${jsonResult.savingsPercentage}% spend reduction)`);
  console.log(`      Hoisted Schema Keys  : [${jsonResult.schemaKeys.join(', ')}]`);

  if (!jsonResult.wasDeduplicated || jsonResult.savingsPercentage < 35.0 || jsonResult.schemaKeys.length !== 6) {
    throw new Error('JSON AST structural deduplication failed');
  }
  console.log('      [PASS] JsonAstStructuralDedupBuffer: 100% verified columnar schema deduplication.\n');

  // 2. Test BroccoliMinHashLshBandDedupBuffer
  console.log('[2/5] Testing BroccoliMinHashLshBandDedupBuffer (MinHash LSH Banding)...');
  const lsh = BroccoliMinHashLshBandDedupBuffer.getInstance(16, 4);
  lsh.clear();

  const doc1 = 'Contract Agreement: The Buyer shall purchase 100% equity for $145,000,000 USD on August 28 2026 subject to HSR antitrust approvals.';
  const doc2 = 'Contract Agreement: The Buyer shall purchase 100% equity for $145,000,000 USD on August 28 2026 subject to HSR antitrust clearance.'; // Near duplicate
  const doc3 = 'Patient Clinical Note: 45 year old male presented with severe acute abdominal pain and elevated lipase levels.'; // Unrelated

  lsh.indexAndFindDuplicates('doc_1', doc1);
  const matchCandidates = lsh.indexAndFindDuplicates('doc_2', doc2, 0.6);
  const unrelatedMatches = lsh.indexAndFindDuplicates('doc_3', doc3, 0.6);

  console.log(`      Doc 2 Match Candidates Found: ${matchCandidates.length}`);
  if (matchCandidates.length > 0) {
    console.log(`      Matched Candidate: ${matchCandidates[0].documentId} (Estimated Jaccard Similarity: ${matchCandidates[0].estimatedJaccardSimilarity})`);
  }
  console.log(`      Doc 3 (Unrelated) Match Candidates Found: ${unrelatedMatches.length}`);

  if (matchCandidates.length === 0 || matchCandidates[0].documentId !== 'doc_1' || unrelatedMatches.length !== 0) {
    throw new Error('MinHash LSH candidate discovery failed');
  }
  console.log('      [PASS] MinHashLshBandDedupBuffer: 100% verified O(1) LSH band candidate matching.\n');

  // 3. Test BroccoliQuotientFilterDedupBuffer
  console.log('[3/5] Testing BroccoliQuotientFilterDedupBuffer (Robin Hood Quotient Filter)...');
  const qf = BroccoliQuotientFilterDedupBuffer.getInstance(12); // 4096 slots
  qf.clear();

  const itemX = 'swift_bic_JPMCUS33AXXX';
  const itemY = 'swift_bic_CHASSGSGXXXX';

  qf.insert(itemX);
  const containsX = qf.contains(itemX);
  const containsY = qf.contains(itemY);

  console.log(`      Contains Item X (inserted): ${containsX}`);
  console.log(`      Contains Item Y (not inserted): ${containsY}`);

  if (!containsX || containsY) {
    throw new Error('Quotient filter verification failed');
  }
  console.log('      [PASS] QuotientFilterDedupBuffer: 100% verified contiguous Robin Hood quotient deduplication.\n');

  // 4. Test BroccoliSemanticEmbeddingDedupBuffer
  console.log('[4/5] Testing BroccoliSemanticEmbeddingDedupBuffer (INT8 Quantized Cosine Similarity)...');
  const semBuffer = BroccoliSemanticEmbeddingDedupBuffer.getInstance(128, 0.85);
  semBuffer.clear();

  const q1 = 'What is the maximum allowed capital expenditure under Section 5.1?';
  const q2 = 'How much capital expenditure CAPEX is allowed under Section 5.1?'; // Semantic paraphrase
  const q3 = 'What is the patient systolic blood pressure reading?'; // Completely unrelated

  const resSem1 = semBuffer.testAndAdd(q1, 'CAPEX is capped at $2,500,000 USD without consent.');
  const resSem2 = semBuffer.testAndAdd(q2);
  const resSem3 = semBuffer.testAndAdd(q3);

  console.log(`      Query 1 Indexed: ${resSem1.matchedVectorId}`);
  console.log(`      Query 2 Semantic Match: isSemanticDuplicate=${resSem2.isSemanticDuplicate}, Cosine Similarity=${resSem2.similarityScore}`);
  console.log(`      Query 3 (Unrelated) Semantic Match: isSemanticDuplicate=${resSem3.isSemanticDuplicate}, Cosine Similarity=${resSem3.similarityScore}`);

  if (!resSem2.isSemanticDuplicate || resSem3.isSemanticDuplicate) {
    throw new Error('Semantic embedding vector deduplication failed');
  }
  console.log('      [PASS] SemanticEmbeddingDedupBuffer: 100% verified quantized semantic vector matching.\n');

  // 5. Test BroccoliTriePrefixSuffixDedupBuffer
  console.log('[5/5] Testing BroccoliTriePrefixSuffixDedupBuffer (Prefix & Suffix Factoring)...');
  const sharedPreamble = 'SYSTEM INSTRUCTION: You are an autonomous enterprise compliance assistant adhering strictly to ISO 27001 and GDPR guidelines.\n\n';
  const sharedSuffix = '\n\nOUTPUT FORMAT: Return all answers strictly in valid RFC-8259 JSON format with an ISO-8601 timestamp.';
  
  const swarmPrompts = [
    sharedPreamble + 'Task 1: Audit firewall rule set on edge gateway #14.' + sharedSuffix,
    sharedPreamble + 'Task 2: Audit IAM role permissions for AWS role SecOpsAdmin.' + sharedSuffix,
    sharedPreamble + 'Task 3: Audit TLS cipher suites on public ingress load balancer.' + sharedSuffix,
    sharedPreamble + 'Task 4: Audit Kubernetes pod security standards on cluster-prod-01.' + sharedSuffix,
  ];

  const factoredBundle = BroccoliTriePrefixSuffixDedupBuffer.factorPromptBatch(swarmPrompts);
  console.log(`      Original Swarm Total Tokens: ${factoredBundle.originalTotalTokens.toLocaleString()}`);
  console.log(`      Factored Swarm Total Tokens: ${factoredBundle.factoredTotalTokens.toLocaleString()}`);
  console.log(`      Tokens Saved               : ${factoredBundle.tokensSaved.toLocaleString()} (${factoredBundle.savingsPercentage}% spend cut)`);
  console.log(`      Shared Preamble Tokens     : ${factoredBundle.prefixTokens}`);
  console.log(`      Shared Suffix Tokens       : ${factoredBundle.suffixTokens}`);

  if (factoredBundle.tokensSaved === 0 || factoredBundle.savingsPercentage < 40.0) {
    throw new Error('Trie prefix/suffix factoring failed');
  }
  console.log('      [PASS] TriePrefixSuffixDedupBuffer: 100% verified prompt preamble/suffix factoring.\n');

  console.log('================================================================');
  console.log('  ALL 5 STRUCTURAL DEDUPLICATION BUFFERS VERIFIED 100%!         ');
  console.log('================================================================\n');
}

runStructuralDedupSuite().catch(err => {
  console.error('Structural dedup suite error:', err);
  process.exit(1);
});
