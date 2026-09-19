/**
 * Private internal economics for the Nova Developer message contract.
 *
 * This is deliberately not imported by public pricing/model routes. The
 * customer unit is a message; token figures here are supplier-cost guardrails
 * and capacity limits, never a customer-facing token rate card.
 */

export const NOVA_MESSAGE_ECONOMICS = {
  contractVersion: 'nova-message-v1',
  status: 'draft',
  currency: 'usd',
  unit: 'message',
  candidateUnitAmountUsd: 0.02,
  monthlySpendCapUsd: 25,
  supplierBenchmark: {
    inputUsdPerMillion: 0.20,
    cachedInputUsdPerMillion: 0.02,
    cacheWriteUsdPerMillion: 0.25,
    outputUsdPerMillion: 1.20,
  },
  guardrails: {
    maxInputTokens: 16_000,
    maxOutputTokens: 4_000,
    infrastructureReserveUsdPerMessage: 0.0015,
    retryReserveUsdPerMessage: 0.0015,
  },
} as const;

export type MessageEconomicsEstimate = {
  supplierCostUsd: number;
  reserveUsd: number;
  contributionUsd: number;
  contributionMarginPct: number;
};

const toUsd = (value: number): number => Number(value.toFixed(6));

export function estimateSupplierCost(params: {
  inputTokens: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
  outputTokens: number;
}): number {
  const inputTokens = Math.max(0, params.inputTokens);
  const cachedInputTokens = Math.min(inputTokens, Math.max(0, params.cachedInputTokens ?? 0));
  const cacheWriteTokens = Math.min(
    Math.max(0, inputTokens - cachedInputTokens),
    Math.max(0, params.cacheWriteTokens ?? 0),
  );
  const uncachedInputTokens = Math.max(0, inputTokens - cachedInputTokens - cacheWriteTokens);
  const outputTokens = Math.max(0, params.outputTokens);
  const rates = NOVA_MESSAGE_ECONOMICS.supplierBenchmark;

  return toUsd(
    (uncachedInputTokens * rates.inputUsdPerMillion
      + cachedInputTokens * rates.cachedInputUsdPerMillion
      + cacheWriteTokens * rates.cacheWriteUsdPerMillion
      + outputTokens * rates.outputUsdPerMillion) / 1_000_000,
  );
}

export function estimateMessageContribution(params: {
  inputTokens: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
  outputTokens: number;
}): MessageEconomicsEstimate {
  const supplierCostUsd = estimateSupplierCost(params);
  const reserveUsd = toUsd(
    NOVA_MESSAGE_ECONOMICS.guardrails.infrastructureReserveUsdPerMessage
      + NOVA_MESSAGE_ECONOMICS.guardrails.retryReserveUsdPerMessage,
  );
  const contributionUsd = toUsd(NOVA_MESSAGE_ECONOMICS.candidateUnitAmountUsd - supplierCostUsd - reserveUsd);
  const contributionMarginPct = NOVA_MESSAGE_ECONOMICS.candidateUnitAmountUsd > 0
    ? Number(((contributionUsd / NOVA_MESSAGE_ECONOMICS.candidateUnitAmountUsd) * 100).toFixed(2))
    : 0;

  return { supplierCostUsd, reserveUsd, contributionUsd, contributionMarginPct };
}

export function validateMessageBudget(inputTokens: number, outputTokens: number): void {
  if (!Number.isSafeInteger(inputTokens) || inputTokens < 0 || inputTokens > NOVA_MESSAGE_ECONOMICS.guardrails.maxInputTokens) {
    throw new Error('MESSAGE_INPUT_LIMIT_EXCEEDED');
  }
  if (!Number.isSafeInteger(outputTokens) || outputTokens < 0 || outputTokens > NOVA_MESSAGE_ECONOMICS.guardrails.maxOutputTokens) {
    throw new Error('MESSAGE_OUTPUT_LIMIT_EXCEEDED');
  }
}
