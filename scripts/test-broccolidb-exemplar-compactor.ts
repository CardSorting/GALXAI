import assert from 'node:assert/strict';
import { BroccoliExemplarCompactor } from '../src/core/broccolidb/BroccoliExemplarCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB DYNAMIC FEW-SHOT EXEMPLAR COMPACTOR');
  console.log('======================================================================\n');

  BroccoliExemplarCompactor.clear();

  // Register 10 realistic few-shot exemplars across different domains
  const sampleBank = [
    { id: 'ex_sql_1', category: 'sql_aggregation', input: 'Get total revenue per customer', output: 'SELECT customer_id, SUM(amount) FROM orders GROUP BY customer_id;' },
    { id: 'ex_sql_2', category: 'sql_filtering', input: 'Find all users active in the last 30 days', output: 'SELECT * FROM users WHERE last_login >= NOW() - INTERVAL \'30 days\';' },
    { id: 'ex_sql_3', category: 'sql_joins', input: 'Join invoices with payments', output: 'SELECT * FROM invoices i INNER JOIN payments p ON i.id = p.invoice_id;' },
    { id: 'ex_sql_4', category: 'sql_ordering', input: 'Top 10 highest paying clients', output: 'SELECT * FROM clients ORDER BY total_spend DESC LIMIT 10;' },
    { id: 'ex_sql_5', category: 'sql_indexes', input: 'Create index on audit timestamp', output: 'CREATE INDEX idx_audit_time ON audit_log(timestamp_ms);' },
    { id: 'ex_sentiment_1', category: 'sentiment', input: 'I love this product, it works great!', output: 'POSITIVE' },
    { id: 'ex_sentiment_2', category: 'sentiment', input: 'The service was terribly slow and broke down.', output: 'NEGATIVE' },
    { id: 'ex_classifier_1', category: 'ticket_routing', input: 'My credit card was charged twice', output: 'BILLING_DISPUTES' },
    { id: 'ex_classifier_2', category: 'ticket_routing', input: 'How do I invite team members to my org?', output: 'WORKSPACE_SETTINGS' },
    { id: 'ex_classifier_3', category: 'ticket_routing', input: 'The webhook endpoint is returning 500 errors', output: 'DEVELOPER_API_SUPPORT' },
  ];

  for (const ex of sampleBank) {
    BroccoliExemplarCompactor.registerExemplar(ex);
  }

  // Query: "How do I calculate total revenue from the payments table?"
  console.log('[1/2] Selecting Top 2 Relevant Exemplars for Query: "How do I calculate total revenue per customer?"...');
  const result = BroccoliExemplarCompactor.selectTopExemplars('How do I calculate total revenue per customer?', 2);

  console.log(`      - Total Exemplars in Bank: ${result.totalExemplarsAvailable}`);
  console.log(`      - Selected Exemplars Count: ${result.selectedExemplarsCount}`);
  console.log(`      - Original Bank Tokens: ${result.originalBankTokens} -> Selected: ${result.selectedTokens}`);
  console.log(`      - Tokens Saved: ${result.tokensSaved} (-${result.savingsPercentage}%)`);
  console.log(`      - Rendered Exemplar Block:\n${result.renderedExemplarBlock}`);

  assert.equal(result.wasCompacted, true);
  assert.equal(result.selectedExemplarsCount, 2);
  assert.ok(result.savingsPercentage >= 65);
  assert.ok(result.renderedExemplarBlock.includes('SELECT customer_id, SUM(amount)'));

  console.log('\n[✓] Dynamic Few-Shot Exemplar Selection & Token Compaction Verified.');

  console.log('\n======================================================================');
  console.log('   ALL EXEMPLAR COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
