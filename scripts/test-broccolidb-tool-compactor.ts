import assert from 'node:assert/strict';
import { BroccoliToolCompactor, ToolDefinition } from '../src/core/broccolidb/BroccoliToolCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB DYNAMIC TOOL COMPACTOR & SEMANTIC TOOL FILTER');
  console.log('======================================================================\n');

  BroccoliToolCompactor.clear();

  // Create a realistic suite of 10 enterprise tool definitions
  const toolSuite: ToolDefinition[] = [
    {
      type: 'function',
      function: {
        name: 'query_user_billing_invoices',
        description: 'Fetches historical billing invoices, payment methods, and current outstanding balances for a customer account from Stripe.',
        parameters: { type: 'object', properties: { customerId: { type: 'string' } }, required: ['customerId'] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'refund_customer_payment',
        description: 'Issues a full or partial refund to a customer transaction via Stripe payment intent.',
        parameters: { type: 'object', properties: { chargeId: { type: 'string' }, amountUsd: { type: 'number' } }, required: ['chargeId'] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'query_vector_knowledge_base',
        description: 'Performs semantic vector search across internal engineering documentation and architecture runbooks.',
        parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'restart_kubernetes_service',
        description: 'Triggers a rolling restart for a named deployment in the production Kubernetes cluster.',
        parameters: { type: 'object', properties: { serviceName: { type: 'string' } }, required: ['serviceName'] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_jira_issue_ticket',
        description: 'Opens a new incident or bug tracking ticket in Jira with priority and description.',
        parameters: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'rotate_api_gateway_credentials',
        description: 'Invalidates existing API keys and generates fresh hashed HMAC developer credentials.',
        parameters: { type: 'object', properties: { keyId: { type: 'string' } }, required: ['keyId'] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'query_customer_crm_profile',
        description: 'Retrieves customer CRM account details, email address, company name, and plan level.',
        parameters: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'send_slack_incident_notification',
        description: 'Broadcasts an urgent incident alert message to the internal Slack engineering on-call channel.',
        parameters: { type: 'object', properties: { channel: { type: 'string' }, message: { type: 'string' } }, required: ['message'] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'fetch_database_table_schema',
        description: 'Inspects Postgres database column names, foreign keys, and indexes for a specified table.',
        parameters: { type: 'object', properties: { tableName: { type: 'string' } }, required: ['tableName'] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'export_analytics_csv_report',
        description: 'Generates a downloadable CSV export of monthly token spend and active budget drawdowns.',
        parameters: { type: 'object', properties: { month: { type: 'string' } }, required: ['month'] },
      },
    },
  ];

  console.log('[1/2] Filtering 10 Tools for User Prompt: "Why was my billing invoice charged twice?"...');
  const result = BroccoliToolCompactor.filterAndCompactTools(
    'Why was my billing invoice charged twice?',
    toolSuite,
    { maxToolsToRetain: 2, minifySchema: true }
  );

  console.log(`      - Was Compacted: ${result.wasCompacted}`);
  console.log(`      - Original Tool Count: ${result.originalToolCount} -> Retained: ${result.retainedToolCount}`);
  console.log(`      - Original Tokens: ${result.originalTokens}`);
  console.log(`      - Compacted Tokens: ${result.compactedTokens}`);
  console.log(`      - Tokens Saved: ${result.tokensSaved} (-${result.savingsPercentage}%)`);
  console.log(`      - Retained Tool Names: ${result.retainedTools.map((t) => t.function.name).join(', ')}`);

  assert.equal(result.wasCompacted, true);
  assert.equal(result.retainedToolCount, 2);
  assert.ok(result.savingsPercentage >= 70);
  assert.ok(result.retainedTools.some((t) => t.function.name === 'query_user_billing_invoices'));

  console.log('\n[✓] Dynamic Tool Compaction & Semantic Filtering Verified.');

  console.log('\n======================================================================');
  console.log('   ALL TOOL COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
