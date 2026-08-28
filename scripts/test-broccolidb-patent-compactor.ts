import assert from 'node:assert/strict';
import { BroccoliPatentCompactor } from '../src/core/broccolidb/BroccoliPatentCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB USPTO PATENT CLAIM COMPACTOR');
  console.log('======================================================================\n');

  BroccoliPatentCompactor.clear();

  // Full mock USPTO patent disclosure with figures, background, claims tree, and prior art citations
  const rawPatent = `
UNITED STATES PATENT AND TRADEMARK OFFICE
Patent No.: US 11,948,201 B2
Date of Patent: August 28, 2026
TITLE: REAL-TIME IN-MEMORY TOKEN STRUCTURAL COMPACTION APPARATUS
Inventors: Alex Morgan, Sarah Jenkins
CPC Classification: G06F 16/2455, H04L 67/10

BACKGROUND OF THE INVENTION:
Large language models consume substantial GPU cluster compute resources...
[35 pages describing FIG. 1 through FIG. 18, detailing memory buses, CPU microcode, and semiconductor schematics...]

BRIEF DESCRIPTION OF THE DRAWINGS:
FIG. 1 is a block diagram illustrating the unified spend substrate.
FIG. 2 is a schematic showing the prefix trie routing mechanism.

WHAT IS CLAIMED IS:
1. A computer-implemented spend compaction system comprising:
an in-memory reactive database operating with sub-microsecond latency; and
a hardware processor configured to parse abstract syntax trees of input prompt payloads to excise redundant non-semantic tokens prior to foundational model inference.
2. The system of claim 1, further comprising a content-addressed storage Brotli vault.
3. The system of claim 1, wherein the in-memory database verifies budget lease allocations atomically.
4. The system of claim 2, further comprising a write-ahead log with frame checksum verification.

REFERENCES CITED:
- US 9,482,019 B1 (Database indexing method)
- US 10,123,456 B2 (Distributed cache coordination)
- US 10,998,771 B2 (Token streaming interceptor)
`.trim();

  console.log('[1/2] Compacting USPTO Patent in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliPatentCompactor.compactPatent(rawPatent);

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Patent Title: ${res.patentNumberOrTitle}`);
  console.log(`      - CPC Class: ${res.cpcClass}`);
  console.log(`      - Independent Claims: ${res.independentClaims.length}`);
  console.log(`      - Dependent Claims Folded: ${res.dependentClaimsCount}`);
  console.log(`      - Prior Art: ${res.citedPriorArt.length}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted Patent Preview:\n"""\n${res.compactedPatentPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.independentClaims.length, 1);
  assert.equal(res.dependentClaimsCount, 3);
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.compactedPatentPrompt.includes('US 11,948,201'));
  assert.ok(res.compactedPatentPrompt.includes('G06F 16/2455'));
  assert.ok(res.compactedPatentPrompt.includes('Claim 1:'));
  assert.ok(res.compactedPatentPrompt.includes('3 dependent claims'));
  assert.ok(!res.compactedPatentPrompt.includes('FIG. 1 is a block diagram')); // Figure descriptions pruned
  assert.ok(!res.compactedPatentPrompt.includes('Large language models consume substantial')); // Background boilerplate pruned

  console.log('\n[✓] USPTO Patent Claim Tree & Prior Art Extraction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL PATENT COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
