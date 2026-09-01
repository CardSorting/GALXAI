/**
 * Test: BroccoliDB Query Transformation & Context Preservation Safety
 * Tests nested field path resolution, quoted string parsing, array containment,
 * and compaction provenance grounding.
 */

import { BroccoliNaturalQueryParser } from '../src/core/broccolidb/broccolidb-natural-query';
import { BroccoliDbTable } from '../src/core/broccolidb/broccolidb-table';
import { BroccoliCompactionSafety } from '../src/core/broccolidb/BroccoliCompactionSafety';

interface TestAuditRecord {
  id: string;
  action: string;
  metadata: {
    service: string;
    code: string;
    details: {
      tags: string[];
      error?: string;
    };
  };
  createdAt: number;
}

async function testBroccoliDbQuerySafety() {
  console.log('======================================================================');
  console.log('   🧪  TESTING BROCCOLIDB QUERY TRANSFORMATIONS & CONTEXT SAFETY      ');
  console.log('======================================================================\n');

  // 1. Test Natural Language Query Parser on Complex Nested & Quoted Inputs
  console.log('1. Testing Natural Language Query Parser Transformations...');
  const naturalQuery = 'from audits where metadata.details.error contains "Connection Timeout" limit 10 latest first';
  const parsed = BroccoliNaturalQueryParser.parse(naturalQuery);
  console.log('   ✓ Parsed Natural Query Result:', JSON.stringify(parsed, null, 2));

  if (parsed.targetTable !== 'audits' || !parsed.queryOptions.where?.['metadata.details.error']) {
    throw new Error('Failed to parse nested dot path in natural query');
  }

  // 2. Test BroccoliTable Nested Field Filtering and Array Search
  console.log('\n2. Testing BroccoliTable In-Memory Nested Field Filtering...');
  const table = new BroccoliDbTable<TestAuditRecord>("test_audits");

  table.put('rec_1', {
    id: 'rec_1',
    action: 'INFERENCE_CALL',
    metadata: {
      service: 'gateway',
      code: 'ERR_TIMEOUT',
      details: {
        tags: ['security', 'network', 'p0'],
        error: 'Upstream Connection Timeout from OpenAI'
      }
    },
    createdAt: 1000
  });

  table.put('rec_2', {
    id: 'rec_2',
    action: 'SETTLEMENT',
    metadata: {
      service: 'billing',
      code: 'OK_SETTLED',
      details: {
        tags: ['billing', 'ledger'],
        error: undefined
      }
    },
    createdAt: 2000
  });

  // Query nested error field
  const timeoutRecords = table.query({
    where: {
      'metadata.details.error': { $contains: 'connection timeout' }
    }
  });
  console.log('   ✓ Matched Records by Nested Path (Case-Insensitive):', timeoutRecords.length);
  if (timeoutRecords.length !== 1 || timeoutRecords[0].id !== 'rec_1') {
    throw new Error('Failed to match nested error field');
  }

  // Query nested array tags field
  const securityRecords = table.query({
    where: {
      'metadata.details.tags': { $contains: 'security' }
    }
  });
  console.log('   ✓ Matched Records by Nested Array Tag:', securityRecords.length);
  if (securityRecords.length !== 1 || securityRecords[0].id !== 'rec_1') {
    throw new Error('Failed to match nested array element');
  }

  // 3. Test Compaction Provenance Grounding Safety
  console.log('\n3. Testing Compaction Provenance Grounding & Context Preservation...');
  const sourceText = 'Patient blood pressure was 120/80 mmHg with glucose 95 mg/dL on 2026-09-01.';
  const validCompacted = 'BP: 120/80 mmHg | Glucose: 95 mg/dL | Date: 2026-09-01';
  const invalidCompacted = 'BP: 140/90 mmHg | Glucose: 180 mg/dL | Date: 2026-09-01'; // Hallucinated numbers

  const validResult = BroccoliCompactionSafety.verify(sourceText, validCompacted);
  console.log('   ✓ Valid Compaction Provenance:', validResult.status);
  if (validResult.status !== 'verified') {
    throw new Error('Expected valid grounded compaction to be verified');
  }

  const invalidResult = BroccoliCompactionSafety.verify(sourceText, invalidCompacted);
  console.log('   ✓ Invalid Compaction Provenance (Fails Closed):', invalidResult.status, invalidResult.unsupportedFacts);
  if (invalidResult.status !== 'fallback') {
    throw new Error('Expected ungrounded compaction with hallucinated numbers to fail closed to fallback');
  }

  console.log('\n======================================================================');
  console.log('   ✅ ALL BROCCOLIDB QUERY & CONTEXT SAFETY INVARIANTS PASSED        ');
  console.log('======================================================================\n');
}

testBroccoliDbQuerySafety().catch(err => {
  console.error('\n❌ BroccoliDB Query Safety Test Failed:', err);
  process.exit(1);
});
