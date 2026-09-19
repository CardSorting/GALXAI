import assert from 'node:assert/strict';
import {
  NOVA_MESSAGE_ECONOMICS,
  estimateMessageContribution,
  estimateSupplierCost,
  validateMessageBudget,
} from '../src/lib/billing/message-economics';

assert.equal(NOVA_MESSAGE_ECONOMICS.unit, 'message');
assert.equal(NOVA_MESSAGE_ECONOMICS.status, 'draft');
assert.equal(estimateSupplierCost({ inputTokens: 16_000, outputTokens: 4_000 }), 0.008);
assert.equal(estimateSupplierCost({ inputTokens: 16_000, cachedInputTokens: 16_000, outputTokens: 4_000 }), 0.00512);
assert.equal(estimateSupplierCost({ inputTokens: 16_000, cacheWriteTokens: 16_000, outputTokens: 4_000 }), 0.0088);

const estimate = estimateMessageContribution({ inputTokens: 16_000, outputTokens: 4_000 });
assert.equal(estimate.supplierCostUsd, 0.008);
assert.equal(estimate.reserveUsd, 0.003);
assert.equal(estimate.contributionUsd, 0.009);
assert.equal(estimate.contributionMarginPct, 45);

validateMessageBudget(16_000, 4_000);
assert.throws(() => validateMessageBudget(16_001, 1), /MESSAGE_INPUT_LIMIT_EXCEEDED/);
assert.throws(() => validateMessageBudget(1, 4_001), /MESSAGE_OUTPUT_LIMIT_EXCEEDED/);

console.log('Nova message economics checks passed.');

