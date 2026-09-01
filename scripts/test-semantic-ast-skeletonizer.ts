/**
 * Test: Semantic AST Skeletonizer & Code Context Compressor
 * Tests code interface extraction, function body collapsing, and token reduction metrics.
 */

import { GalxSemanticAstSkeletonizer } from '../src/core/context/GalxSemanticAstSkeletonizer';

async function testSemanticAstSkeletonizer() {
  console.log('======================================================================');
  console.log('   🧪  TESTING SEMANTIC AST SKELETONIZER & CONTEXT PYRAMIDS           ');
  console.log('======================================================================\n');

  const skeletonizer = GalxSemanticAstSkeletonizer.getInstance();

  const mockCode = `
import { getSupabaseAdmin } from '@/lib/supabase/client';

export interface UserContext {
  id: string;
  role: string;
}

export class EngineService {
  private count = 0;

  public async processBatch(items: string[]): Promise<number> {
    let sum = 0;
    for (let i = 0; i < items.length; i++) {
      sum += items[i].length;
      console.log('Processing item:', items[i]);
    }
    return sum;
  }

  public getStatus(): string {
    return 'healthy';
  }
}
  `;

  console.log('1. Skeletonizing Mock TypeScript Code...');
  const result1 = skeletonizer.skeletonize(mockCode, 'src/services/EngineService.ts');
  console.log('   ✓ Raw Tokens:', result1.rawTokens);
  console.log('   ✓ Skeleton Tokens:', result1.skeletonTokens);
  console.log(`   ✓ Tokens Saved: ${result1.tokensSaved} (${result1.reductionRatioPct}% reduction)`);
  console.log('   ✓ Skeletonized Output Preview:\n' + result1.skeletonContent);

  if (!result1.skeletonContent.includes('export interface UserContext') || !result1.skeletonContent.includes('implementation collapsed')) {
    throw new Error('Expected interface preserved and function body collapsed');
  }

  console.log('\n2. Testing 0ms L1 In-Memory Skeleton Cache Hit...');
  const result2 = skeletonizer.skeletonize(mockCode, 'src/services/EngineService.ts');
  console.log('   ✓ L1 Cached:', result2.cachedL1);
  if (!result2.cachedL1) {
    throw new Error('Expected L1 cache hit');
  }

  console.log('\n======================================================================');
  console.log('   ✅ ALL SEMANTIC AST SKELETONIZER INVARIANTS PASSED                ');
  console.log('======================================================================\n');
}

testSemanticAstSkeletonizer().catch(err => {
  console.error('\n❌ Skeletonizer Test Failed:', err);
  process.exit(1);
});
