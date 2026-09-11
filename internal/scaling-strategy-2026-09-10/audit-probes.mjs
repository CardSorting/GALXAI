/** Private, offline audit probes. Run only in an isolated source snapshot. */
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';

for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  if (existsSync(name)) throw new Error('Use an isolated source snapshot without dotenv files.');
}
for (const key of ['DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'STRIPE_SECRET_KEY', 'VM_RELAY_URL']) {
  if (process.env[key]) throw new Error('Audit probes refuse configured production authority.');
}

const { NextRequest } = await import('next/server');
const { POST } = await import('../../src/app/v1/chat/completions/route.ts');
const { GalxAuthEngine } = await import('../../src/core/auth/GalxAuthEngine.ts');
const { GalxSeatTierEngine } = await import('../../src/core/subscription/GalxSeatTierEngine.ts');
const { GalxCommunityPoolGovernor } = await import('../../src/core/governor/GalxCommunityPoolGovernor.ts');
const { GalxLumiQoSPoolGovernor } = await import('../../src/core/governor/GalxLumiQoSPoolGovernor.ts');
const { GalxModelRouter } = await import('../../src/core/router/GalxModelRouter.ts');
const { ModelCatalog } = await import('../../src/core/router/ModelCatalog.ts');
const { GalxEdgeBatchBuffer } = await import('../../src/workers/cloudflare/GalxEdgeBatchBuffer.ts');
const { WalletRepository } = await import('../../src/lib/supabase/repositories/WalletRepository.ts');
const { calculateComputeCredit } = await import('../../src/lib/stripe/config.ts');
const { STRIPE_PRODUCT_TIERS } = await import('../../src/lib/stripe/products.ts');
const { publicTaskResponse } = await import('../../src/lib/security/public-task-response.ts');

const observed = {};
const originals = [GalxAuthEngine.getInstance, GalxSeatTierEngine.getInstance,
  GalxCommunityPoolGovernor.getInstance, GalxLumiQoSPoolGovernor.getInstance,
  GalxEdgeBatchBuffer.getInstance, WalletRepository.getInstance];
try {
  const draws = [];
  GalxAuthEngine.getInstance = () => ({ resolveAuthIdentity: async () => ({ authenticated: true, userId: 'audit-fixture' }) });
  GalxSeatTierEngine.getInstance = () => ({
    resolveUserSeatTier: async () => ({ tier: 'developer', isCapped: false, creditsIncludedUsd: 0 }),
    validateModelEntitlement() {}, evaluateSeatRollingLimits() {}, releaseSeatStreamSlot() {},
    recordSeatTokenDraw: async () => {}, recordSeatUsage() {},
  });
  GalxCommunityPoolGovernor.getInstance = () => ({ evaluateRequest: () => ({ allowed: true }) });
  GalxLumiQoSPoolGovernor.getInstance = () => ({ evaluateRequest: () => ({ allowed: false,
    pool: 'private-audit-pool', poolStatus: { reservedVipFloorPct: 70, congestionState: 'audit-state' },
    rejectionReason: { message: 'Temporarily unavailable', code: 'audit-limit', retryAfterSeconds: 30, resetAt: 'fixture' },
  }) });
  const response = await POST(new NextRequest('https://galx.invalid/v1/chat/completions', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-5.6-sol', messages: [{ role: 'user', content: 'fixture' }] }),
  }));
  assert.equal(response.status, 429, 'Probe must reach the intended QoS branch');
  const body = await response.json();
  observed.chat_qos_response = { status: response.status,
    exposes_pool: body.error.pool === 'private-audit-pool',
    exposes_headroom: body.error.headroom_preserved_pct === 70,
    exposes_congestion_header: response.headers.get('x-galx-congestion-state') === 'audit-state' };

  GalxEdgeBatchBuffer.getInstance = () => ({ enqueueTokenDraw: item => draws.push(item) });
  const fakeRouter = {
    pool: { releaseLeaseAuthoritatively: async () => true, extendLeaseAuthoritatively: async () => true },
    metrics: { recordSample() {} }, zdrProtocol: { createStreamingDigestHasher: () => ({ update() {} }) },
  };
  const payload = new TextEncoder().encode('data: {"choices":[{"delta":{"content":"OK"}}],"usage":{"completion_tokens":1},"private_audit_field":"fixture"}\n\ndata: [DONE]\n\n');
  async function streamProbe(singleBytes, cancel) {
    const prior = draws.length;
    const source = new ReadableStream({ start(controller) {
      if (singleBytes) for (const byte of payload) controller.enqueue(new Uint8Array([byte]));
      else controller.enqueue(payload);
      if (!cancel) controller.close();
    } });
    const stream = GalxModelRouter.prototype.wrapStreamingResponse.call(fakeRouter,
      source, { leaseId: 'audit-lease', shardId: 'audit-shard' }, 'gpt-5.6-sol', 'openai', {},
      Date.now(), { profile: 'standard' }, new Headers(), {}, 'audit-fixture', 'audit-request', 10);
    let output = '';
    if (cancel) {
      const reader = stream.getReader();
      await reader.read(); // Initial keepalive.
      await reader.read(); // Actual response bytes.
      await reader.cancel('synthetic cancellation after output');
    } else output = await new Response(stream).text();
    return { charged_draws: draws.length - prior,
      accounted_completion_tokens: draws.length > prior ? draws.at(-1).completionTokens : null,
      forwards_unknown_field: output.includes('private_audit_field') };
  }
  observed.stream_single_chunk = await streamProbe(false, false);
  observed.stream_byte_chunks = await streamProbe(true, false);
  observed.stream_cancel_after_output = await streamProbe(false, true);

  const buffer = new GalxEdgeBatchBuffer();
  clearInterval(buffer.flushTimer);
  let batchPayload;
  WalletRepository.getInstance = () => ({ drawTokensCoalescedBatch: async payload => {
    batchPayload = payload;
    throw new Error('synthetic settlement outage');
  } });
  for (const [model, requestId] of [['model-a', 'request-a'], ['model-b', 'request-b']]) {
    buffer.enqueueTokenDraw({ userId: 'audit-fixture', costUsd: 0.01, model,
      description: 'fixture', metadata: { requestId } });
  }
  await buffer.flushAll();
  observed.batch_failure = { pending_after_failure: buffer.pendingTokenDraws.length,
    payload_entries: batchPayload.length, combined_request_count: batchPayload[0].requestCount,
    retained_model: batchPayload[0].model, retains_request_metadata: Boolean(batchPayload[0].metadata) };

  observed.catalog = { unknown_resolves_to: ModelCatalog.resolveModel('audit-nonexistent-model-xyz').id,
    catalog_provider_count: new Set(ModelCatalog.listAll().map(model => model.provider)).size,
    public_model_count: ModelCatalog.listAll().length };
  observed.ten_dollar_offer = { calculated_credit_before_welcome_eligibility: calculateComputeCredit(10).totalCredit,
    product_declared_credit: STRIPE_PRODUCT_TIERS.lumi_10.totalCreditUsd };
  const publicTask = await publicTaskResponse({ id: 'audit-task', userId: 'audit-fixture', status: 'COMPLETED',
    result: { data: { choices: [{ message: { content: null, tool_calls: [{ id: 'call-fixture', type: 'function',
      function: { name: 'fixture', arguments: '{}' } }] }, finish_reason: 'tool_calls' }],
      usage: { prompt_tokens: 10, completion_tokens: 1 } } } });
  observed.async_chat_contract = { retains_tool_calls: Boolean(publicTask.result.data.choices[0].message.tool_calls),
    retains_usage: Boolean(publicTask.result.data.usage), finish_reason: publicTask.result.data.choices[0].finish_reason };
  console.log(JSON.stringify({ purpose: 'Observed baseline behavior, not desired acceptance criteria', observed }, null, 2));
} finally {
  [GalxAuthEngine.getInstance, GalxSeatTierEngine.getInstance,
    GalxCommunityPoolGovernor.getInstance, GalxLumiQoSPoolGovernor.getInstance,
    GalxEdgeBatchBuffer.getInstance, WalletRepository.getInstance] = originals;
}
