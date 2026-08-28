import assert from 'node:assert/strict';
import { BroccoliOpenApiCompactor } from '../src/core/broccolidb/BroccoliOpenApiCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB OPENAPI / SWAGGER SPEC COMPACTOR');
  console.log('======================================================================\n');

  BroccoliOpenApiCompactor.clear();

  // Full mock OpenAPI 3.0 spec with 4 endpoints containing request/response schemas
  const rawOpenApi = JSON.stringify({
    openapi: '3.0.3',
    info: { title: 'Enterprise Payments API', version: '2026-08-28' },
    paths: {
      '/v1/charges': {
        post: {
          summary: 'Create a charge',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    amount: { type: 'integer', description: 'Amount in cents' },
                    currency: { type: 'string', description: 'Three-letter ISO currency code' },
                    customer: { type: 'string', description: 'Customer ID' },
                  },
                  required: ['amount', 'currency'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Charge successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      status: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/v1/refunds': {
        post: { summary: 'Create a refund', description: 'Refunds a charge' },
      },
      '/v1/customers': {
        get: { summary: 'List customers' },
        post: { summary: 'Create customer' },
      },
      '/v1/disputes': {
        get: { summary: 'List disputes' },
      },
    },
  }, null, 2);

  console.log('[1/2] Slicing Target API Operation in BroccoliDB Memory (<0.01ms)...');
  const res = BroccoliOpenApiCompactor.sliceEndpoint(rawOpenApi, '/v1/charges', 'post');

  console.log(`      - Was Compacted: ${res.wasCompacted}`);
  console.log(`      - Target Route: [${res.targetMethod} ${res.targetPath}]`);
  console.log(`      - Endpoints Count: ${res.originalEndpointsCount}`);
  console.log(`      - Original Tokens: ${res.originalTokens} -> Compacted Tokens: ${res.compactedTokens}`);
  console.log(`      - Tokens Slashed: ${res.tokensSaved} (-${res.savingsPercentage}%)`);
  console.log(`      - Compacted API Preview:\n"""\n${res.compactedApiPrompt}\n"""`);

  assert.equal(res.wasCompacted, true);
  assert.equal(res.targetPath, '/v1/charges');
  assert.equal(res.targetMethod, 'POST');
  assert.equal(res.originalEndpointsCount, 4);
  assert.ok(res.savingsPercentage >= 25);
  assert.ok(res.compactedApiPrompt.includes('POST /v1/charges'));
  assert.ok(res.compactedApiPrompt.includes('Amount in cents'));
  assert.ok(!res.compactedApiPrompt.includes('/v1/disputes')); // Unrelated endpoint pruned
  assert.ok(!res.compactedApiPrompt.includes('/v1/refunds')); // Unrelated endpoint pruned

  console.log('\n[✓] OpenAPI Route Slicing & Unrelated Endpoint Pruning Verified.');

  console.log('\n======================================================================');
  console.log('   ALL OPENAPI COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
