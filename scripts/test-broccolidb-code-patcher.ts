import assert from 'node:assert/strict';
import { BroccoliCodePatcher } from '../src/core/broccolidb/BroccoliCodePatcher';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB CODE DIFF & AST MICRO-PATCH COMPACTOR');
  console.log('======================================================================\n');

  BroccoliCodePatcher.clear();

  // Create a realistic 500-line source file
  const fullFileLines: string[] = [];
  for (let i = 1; i <= 500; i++) {
    if (i === 250) {
      fullFileLines.push('  public async fetchHistoricalLedger(departmentId: string): Promise<Ledger[]> {');
      fullFileLines.push('    return this.legacyDb.query(departmentId);');
      fullFileLines.push('  }');
    } else {
      fullFileLines.push(`  // Line ${i}: Standard boilerplate enterprise source code methods`);
    }
  }
  const fullFileContent = fullFileLines.join('\n');

  const targetSearch = '    return this.legacyDb.query(departmentId);';
  const targetReplace = '    return this.broccolidb.ledgerTable.query({ where: { department: departmentId } });';

  console.log('[1/2] Compacting 500-Line Full-File Regeneration into Unified Diff Slice...');
  const result = BroccoliCodePatcher.compactCodePrompt(fullFileContent, targetSearch, targetReplace, 5);

  console.log(`      - Was Compacted: ${result.wasCompacted}`);
  console.log(`      - Original Full File Tokens: ${result.fullFileTokens} tokens`);
  console.log(`      - Compacted Diff Tokens: ${result.patchTokens} tokens`);
  console.log(`      - Output Tokens Slashed: ${result.tokensSaved} (-${result.savingsPercentage}%)`);

  assert.equal(result.wasCompacted, true);
  assert.ok(result.savingsPercentage >= 90);
  assert.ok(result.targetPatchSnippet.includes('<<<<<<< SEARCH'));
  assert.ok(result.targetPatchSnippet.includes('>>>>>>> REPLACE'));

  console.log('\n[✓] Code Diff Micro-Patcher & AST Token Compactor Verified.');

  console.log('\n======================================================================');
  console.log('   ALL CODE PATCHER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
