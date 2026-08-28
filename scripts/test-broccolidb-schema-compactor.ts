import assert from 'node:assert/strict';
import { BroccoliSchemaCompactor, JsonSchemaDefinition } from '../src/core/broccolidb/BroccoliSchemaCompactor';

function run() {
  console.log('======================================================================');
  console.log('  TESTING BROCCOLIDB STRUCTURED OUTPUT JSON SCHEMA COMPACTOR');
  console.log('======================================================================\n');

  BroccoliSchemaCompactor.clear();

  // Create realistic verbose enterprise extraction JSON Schema
  const verboseSchema: JsonSchemaDefinition = {
    name: 'enterprise_invoice_extraction_schema',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The unique alphanumeric identifier representing this invoice record in the database.',
        },
        email: {
          type: 'string',
          description: 'The primary contact email address of the billing customer who received this invoice.',
        },
        timestamp: {
          type: 'string',
          description: 'The ISO-8601 formatted date and timestamp when this invoice was generated.',
        },
        total: {
          type: 'number',
          description: 'The total gross financial amount in US dollars including tax and shipping charges.',
        },
        lineItems: {
          type: 'array',
          description: 'The list of individual line item product purchases included in this transaction.',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'The name or title of the product item purchased.',
              },
              quantity: {
                type: 'integer',
                description: 'The numeric count of units purchased for this line item.',
              },
              price: {
                type: 'number',
                description: 'The unit price in dollars for a single quantity.',
              },
            },
            required: ['name', 'quantity', 'price'],
            additionalProperties: false,
          },
        },
      },
      required: ['id', 'email', 'timestamp', 'total', 'lineItems'],
      additionalProperties: false,
    },
  };

  console.log('[1/2] Compacting Verbose Invoice Extraction JSON Schema...');
  const result = BroccoliSchemaCompactor.compactSchema(verboseSchema);

  console.log(`      - Was Compacted: ${result.wasCompacted}`);
  console.log(`      - Original Tokens: ${result.originalTokens}`);
  console.log(`      - Compacted Tokens: ${result.compactedTokens}`);
  console.log(`      - Tokens Saved: ${result.tokensSaved} (-${result.savingsPercentage}%)`);

  assert.equal(result.wasCompacted, true);
  assert.ok(result.savingsPercentage >= 40);

  // Assert self-explanatory properties had descriptions pruned
  const props = result.compactedSchema.schema.properties as any;
  assert.equal(props.id.description, undefined);
  assert.equal(props.email.description, undefined);
  assert.equal(props.total.description, undefined);

  // Assert strict schema integrity remains 100% valid
  assert.equal(result.compactedSchema.strict, true);
  assert.equal(result.compactedSchema.schema.additionalProperties, false);

  console.log('\n[✓] Structured Output JSON Schema Minification Verified.');

  console.log('\n======================================================================');
  console.log('   ALL SCHEMA COMPACTOR TESTS PASSED (100%)');
  console.log('======================================================================\n');
}

run();
