import assert from 'node:assert/strict';
import { BroccoliSymbolSlicer } from '../src/core/broccolidb/BroccoliSymbolSlicer';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB AST SYMBOL DEPENDENCY SLICER');
  console.log('======================================================================\n');

  BroccoliSymbolSlicer.clear();

  // 120-line source file with many unrelated functions (~1,500 tokens)
  const sourceCode = `
import { CryptoService } from './crypto-service';
import { TransactionPayload, AccountRecord } from './contracts';

export interface SignatureValidationOptions {
  toleranceSeconds: number;
  strictHeaderCheck: boolean;
}

export function computeHash(data: string): string {
  // Unrelated Helper Function 1
  return data.toUpperCase();
}

export function formatAddress(addr: string): string {
  // Unrelated Helper Function 2
  return addr.trim().toLowerCase();
}

export function generateRecoveryPhrase(length: number): string[] {
  // Unrelated Helper Function 3
  return new Array(length).fill('phrase');
}

export function validateStripeSignature(
  rawPayload: string,
  signatureHeader: string,
  options: SignatureValidationOptions
): boolean {
  const [timestampStr, sigStr] = signatureHeader.split(',');
  if (!timestampStr || !sigStr) {
    return false;
  }
  const timestamp = parseInt(timestampStr.split('=')[1], 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > options.toleranceSeconds) {
    return false;
  }
  return true;
}

export function calculateAccountBalance(records: AccountRecord[]): number {
  // Unrelated Helper Function 4
  return records.reduce((acc, r) => acc + r.balance, 0);
}

export function exportTaxLedger(year: number): string {
  // Unrelated Helper Function 5
  return \`Ledger report for \${year}\`;
}
`.trim();

  console.log('[1/2] Slicing AST Context for Function "validateStripeSignature"...');
  const res = BroccoliSymbolSlicer.sliceSymbolContext(sourceCode, 'validateStripeSignature');

  console.log(`      - Was Sliced: ${res.wasSliced}`);
  console.log(`      - Target Symbol: "${res.targetSymbol}"`);
  console.log(`      - Original Lines: ${res.originalLines} -> Sliced Lines: ${res.slicedLines}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Sliced Tokens: ${res.slicedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Sliced Source Code Preview:\n"""\n${res.slicedSourceCode}\n"""`);

  assert.equal(res.wasSliced, true);
  assert.ok(res.savingsPercentage >= 40);
  assert.ok(res.slicedSourceCode.includes('validateStripeSignature'));
  assert.ok(res.slicedSourceCode.includes('SignatureValidationOptions'));
  assert.ok(res.slicedSourceCode.includes('unrelated declarations omitted'));
  assert.ok(!res.slicedSourceCode.includes('generateRecoveryPhrase'));
  assert.ok(!res.slicedSourceCode.includes('exportTaxLedger'));

  console.log('\n[✓] AST Symbol Isolation & Unrelated Function Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL SYMBOL SLICER TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
