/**
 * GALXAI: Comprehensive Cloudflare Workers Edge Integration & Verification Test Suite
 * Tests all 10 Cloudflare Edge components:
 * 1. GalxEdgeGateway (HTTP Ingress, Auth Guard, Model Catalog, SSE Streaming, Non-Streaming)
 * 2. GalxEdgeRouter (In-Flight Failover across upstream provider shards)
 * 3. GalxEdgeConnectionPool (Pre-warmed Keep-Alive connection pools)
 * 4. GalxEdgeCache (Stale-While-Revalidate Edge Cache + BroccoliDB Table)
 * 5. GalxR2AssetAdapter (Zero-Egress Multimodal Storage + Indexing)
 * 6. GalxEdgeBatchBuffer (Micro-Batching Buffer for Token Draws & Telemetry)
 * 7. GalxSwarmCoordinatorDO (Durable Object Swarm State Sync)
 * 8. GalxEdgeWebhookDispatcher (HMAC-SHA256 Signed Outbound Webhooks)
 * 9. GalxEdgeWire (Binary Codec & Compression)
 * 10. GalxEdgeQueueWorker (Distributed Task Queue Batch Execution)
 */

import './lib/require-isolated-worker-env';
import { WalletRepository } from '../src/lib/supabase/repositories/WalletRepository';
import { TelemetryRepository } from '../src/lib/supabase/repositories/TelemetryRepository';
import { GalxEdgeGateway } from '../src/workers/cloudflare/GalxEdgeGateway';
import { GalxEdgeRouter } from '../src/workers/cloudflare/GalxEdgeRouter';
import { GalxEdgeConnectionPool } from '../src/workers/cloudflare/GalxEdgeConnectionPool';
import { GalxEdgeCache } from '../src/workers/cloudflare/GalxEdgeCache';
import { GalxR2AssetAdapter } from '../src/workers/cloudflare/GalxR2AssetAdapter';
import { GalxEdgeBatchBuffer } from '../src/workers/cloudflare/GalxEdgeBatchBuffer';
import { GalxSwarmCoordinatorDO } from '../src/workers/cloudflare/GalxSwarmCoordinatorDO';
import { GalxEdgeWebhookDispatcher } from '../src/workers/cloudflare/GalxEdgeWebhookDispatcher';
import { GalxEdgeWire } from '../src/workers/cloudflare/GalxEdgeWire';
import { GalxEdgeQueueWorker } from '../src/workers/cloudflare/GalxEdgeQueueWorker';

const mockEnv = {
  ENVIRONMENT: 'test',
  SUPABASE_URL: 'https://test-project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key-1234567890',
  GATEWAY_AUTH_MODE: 'format-only',
  ALLOW_SYNTHETIC_RESPONSES: 'true',
  GOVERNANCE_MODE: 'observe'
};

// Explicit transport fixtures. Unexpected requests fail the suite even if a
// component catches the transport error; no production HTTP is possible.
let approvalResponse = () => Response.json({ approved: true });
let imageResponse = () => new Response();
let approvalCalls = 0;
let imageCalls = 0;
let queueCalls = 0;
let unexpectedRequests = 0;
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init);
  if (request.url === 'https://galx.ai/api/developer-access/check' && request.method === 'POST') {
    approvalCalls++;
    assert(request.redirect === 'manual', 'Approval requests never follow redirects');
    assert(request.headers.get('authorization') === 'Bearer galx_live_test_key_123', 'Approval checks receive the presented key');
    return approvalResponse();
  }
  if (new URL(request.url).origin === 'https://galx.ai' && new URL(request.url).pathname.startsWith('/v1/images/')) {
    imageCalls++;
    assert(request.redirect === 'manual', 'Image forwarding never follows redirects');
    return imageResponse();
  }
  if (request.url === 'https://test-project.supabase.co/rest/v1/rpc/fn_lease_queue_tasks_batch_cf' && request.method === 'POST') {
    queueCalls++;
    const body = await request.json();
    assert(body.p_max_tasks === 10 && body.p_queue_name === 'default', 'Queue lease uses the requested bounded batch');
    return Response.json([]);
  }
  unexpectedRequests++;
  throw new Error('Unexpected HTTP request in worker fixture');
};
process.on('exit', () => {
  if (unexpectedRequests) { console.error(`Unexpected fixture HTTP requests: ${unexpectedRequests}`); process.exitCode = 1; }
});

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    testsFailed++;
    throw new Error(message);
  } else {
    console.log(`  [✓] ${message}`);
    testsPassed++;
  }
}

async function runAllTests() {
  console.log('\n======================================================================');
  console.log('   GALXAI CLOUDFLARE EDGE MESH VERIFICATION TEST SUITE');
  console.log('======================================================================\n');

  // --- 1. GalxEdgeGateway Tests ---
  console.log('--- Phase 1: GalxEdgeGateway Ingress & SSE Streaming ---');
  const gateway = new GalxEdgeGateway(mockEnv);

  // 1.1 Health endpoint
  const healthReq = new Request('https://api.galx.ai/health', {
    method: 'GET',
    headers: { 'cf-ray': '8f123456789-IAD' }
  });
  const healthResp = await gateway.handleRequest(healthReq);
  assert(healthResp.status === 200, 'Health endpoint returns HTTP 200');
  const healthJson = await healthResp.json() as any;
  assert(healthJson.status === 'healthy', 'Health payload status is "healthy"');
  assert(JSON.stringify(Object.keys(healthJson).sort()) === JSON.stringify(['status', 'timestamp']), 'Health response uses the public field allowlist');
  assert(typeof healthJson.timestamp === 'number', 'Health timestamp is numeric');
  assert(!JSON.stringify(healthJson).includes('8f123456789-IAD'), 'Health never reflects private ingress diagnostics');

  // 1.2 Auth Guard: Rejection of invalid / missing keys
  const unauthReq = new Request('https://api.galx.ai/v1/models', {
    method: 'GET',
    headers: { Authorization: 'Bearer sk-invalid-key-format' }
  });
  const unauthResp = await gateway.handleRequest(unauthReq);
  assert(unauthResp.status === 401, 'Invalid API key format rejected with HTTP 401');

  const unconfiguredAuthGateway = new GalxEdgeGateway({
    ENVIRONMENT: 'production',
    SUPABASE_URL: 'https://test-project.supabase.co'
  });
  const unconfiguredAuthResp = await unconfiguredAuthGateway.handleRequest(new Request('https://api.galx.ai/v1/models', {
    headers: { Authorization: 'Bearer galx_live_test_key_123' }
  }));
  assert(unconfiguredAuthResp.status === 503, 'Production authentication fails closed when its backend is not configured');

  const queryCredentialResp = await unconfiguredAuthGateway.handleRequest(new Request(
    'https://api.galx.ai/v1/models?api_key=galx_live_test_key_123'
  ));
  assert(queryCredentialResp.status === 401, 'Production rejects API keys in query strings');

  // 1.3 List Models Endpoint
  const modelsReq = new Request('https://api.galx.ai/v1/models', {
    method: 'GET',
    headers: { Authorization: 'Bearer galx_live_test_key_123' }
  });
  const modelsResp = await gateway.handleRequest(modelsReq);
  assert(modelsResp.status === 200, 'List models returns HTTP 200');
  const modelsJson = await modelsResp.json() as any;
  assert(Array.isArray(modelsJson.data) && modelsJson.data.length > 0, 'Models payload contains non-empty array');
  assert(modelsJson.data.some((m: any) => m.id === 'gpt-5.6-sol'), 'Model catalog contains "gpt-5.6-sol"');
  assert(modelsJson.data.every((m: any) => m.pricing_tier === 'provider_public'), 'Model catalog does not invent a wholesale pricing tier');

  // Approval must be checked again after a successful request; cached key
  // validity must not grant a revoked or unavailable preview entitlement.
  for (const fixture of [
    { name: 'pending', status: 403, body: { error: 'private-canary' }, expected: 403 },
    { name: 'revoked', status: 401, body: { error: 'private-canary' }, expected: 401 },
    { name: 'unavailable', status: 500, body: { error: 'private-canary' }, expected: 503 },
    { name: 'unapproved success', status: 200, body: { approved: false }, expected: 503 },
    { name: 'malformed approval', status: 200, body: { approved: 'true' }, expected: 503 },
  ]) {
    approvalResponse = () => Response.json(fixture.body, { status: fixture.status });
    const before = approvalCalls;
    const denied = await gateway.handleRequest(modelsReq.clone());
    assert(denied.status === fixture.expected, `${fixture.name} preview access fails closed`);
    assert(approvalCalls === before + 1, 'Every developer request rechecks preview approval');
    assert(!(await denied.text()).includes('private-canary'), 'Preview denial hides backend details');
  }
  approvalResponse = () => { throw new Error('private-canary'); };
  const approvalOutage = await gateway.handleRequest(modelsReq.clone());
  assert(approvalOutage.status === 503, 'Approval transport failure fails closed');
  assert(!(await approvalOutage.text()).includes('private-canary'), 'Approval transport errors remain private');
  approvalResponse = () => Response.json({ approved: true });

  // 1.4 Non-Streaming Chat Completion
  const nonStreamReq = new Request('https://api.galx.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer galx_live_test_key_123',
      'content-type': 'application/json',
      'cf-ray': '8f123456789-SJC'
    },
    body: JSON.stringify({
      model: 'gpt-5.6-sol',
      messages: [{ role: 'user', content: 'Hello edge!' }],
      conversation_id: 'edge_session_a',
      session_mode: 'new',
      turn_id: 'edge_turn_a',
    })
  });
  const nonStreamResp = await gateway.handleRequest(nonStreamReq);
  assert(nonStreamResp.status === 200, 'Non-streaming chat completion returns HTTP 200');
  const nonStreamJson = await nonStreamResp.json() as any;
  assert(nonStreamJson.choices[0].message.role === 'assistant', 'Response has assistant message');
  assert(nonStreamJson.usage.total_tokens > 0, 'Response includes token usage statistics');
  assert(nonStreamResp.headers.get('x-galx-simulated') === 'true', 'Local synthetic response is explicitly labeled');
  assert(nonStreamJson.conversation_id === 'edge_session_a', 'Edge responses preserve logical conversation identity');
  assert(nonStreamJson.turn_id === 'edge_turn_a', 'Edge responses preserve turn identity');
  assert(nonStreamResp.headers.get('x-galx-session-mode') === 'new', 'Edge exposes the resolved session lifecycle mode');
  assert(nonStreamResp.headers.get('x-galx-session-authority') === 'client-context', 'Direct edge execution does not claim durable session authority');

  const conflictingSessionResp = await gateway.handleRequest(new Request('https://api.galx.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer galx_live_test_key_123',
      'content-type': 'application/json',
      'x-galx-session-id': 'edge_session_b',
    },
    body: JSON.stringify({
      model: 'gpt-5.6-sol',
      messages: [{ role: 'user', content: 'Conflict' }],
      conversation_id: 'edge_session_a',
    }),
  }));
  assert(conflictingSessionResp.status === 400, 'Edge rejects conflicting body and header session identities');

  const unsupportedModelResp = await gateway.handleRequest(new Request('https://api.galx.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer galx_live_test_key_123',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ model: 'gpt-5.6-slo', messages: [{ role: 'user', content: 'Typo' }] })
  }));
  assert(unsupportedModelResp.status === 400, 'Unknown model IDs fail explicitly instead of silently changing models');

  const failClosedGateway = new GalxEdgeGateway({
    ENVIRONMENT: 'development',
    SUPABASE_URL: 'https://test-project.supabase.co',
    GATEWAY_AUTH_MODE: 'format-only'
  });
  const failClosedResp = await failClosedGateway.handleRequest(new Request('https://api.galx.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer galx_live_test_key_123',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ model: 'gpt-5.6-sol', messages: [{ role: 'user', content: 'Hello' }] })
  }));
  assert(failClosedResp.status === 503, 'Missing upstream compute fails closed instead of returning a synthetic success');

  const evidenceGateway = new GalxEdgeGateway({
    ...mockEnv,
    GOVERNANCE_MODE: 'enforce',
    GOVERNANCE_POLICY_JSON: JSON.stringify({
      mode: 'enforce',
      approvedRoutes: [{
        id: 'eval_edge_classification_v1',
        requestedModel: 'gpt-5.6-sol',
        targetModel: 'gpt-5.6-luna',
        workload: 'classification',
        status: 'approved',
        sampleSize: 500,
        baselineSuccessRate: 0.98,
        candidateSuccessRate: 0.98,
        lowerBoundQualityDelta: -0.005,
        evaluatedAt: '2026-08-27T00:00:00.000Z',
        expiresAt: '2027-08-27T00:00:00.000Z'
      }]
    })
  });
  const evidenceResp = await evidenceGateway.handleRequest(new Request('https://api.galx.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer galx_live_test_key_123',
      'content-type': 'application/json',
      'x-galx-workload': 'classification',
      'x-galx-department': 'support'
    },
    body: JSON.stringify({ model: 'gpt-5.6-sol', messages: [{ role: 'user', content: 'Classify this ticket' }] })
  }));
  assert(evidenceResp.headers.get('x-galx-governance-action') === 'route', 'Approved quality evidence enables enforcement routing');
  assert(evidenceResp.headers.get('x-galx-model-effective') === 'gpt-5.6-luna', 'Governance route exposes the effective model');

  // 1.5 SSE Streaming Chat Completion
  const streamReq = new Request('https://api.galx.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer galx_live_test_key_123',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-5.6-sol',
      messages: [{ role: 'user', content: 'Stream test' }],
      stream: true
    })
  });
  const streamResp = await gateway.handleRequest(streamReq);
  assert(streamResp.status === 200, 'Streaming chat completion returns HTTP 200');
  assert(streamResp.headers.get('content-type')?.includes('text/event-stream') === true, 'Streaming response has text/event-stream content type');
  
  const reader = streamResp.body?.getReader();
  let accumulatedText = '';
  if (reader) {
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulatedText += decoder.decode(value);
    }
  }
  assert(accumulatedText.includes('data:'), 'SSE stream contains "data:" chunks');
  assert(accumulatedText.includes('[DONE]'), 'SSE stream terminates with "[DONE]" marker');

  // 1.6 OpenAI-Compatible Vector Embeddings
  const embReq = new Request('https://api.galx.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer galx_live_test_key_123',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: ['Vector test sentence 1', 'Vector test sentence 2']
    })
  });
  const embResp = await gateway.handleRequest(embReq);
  assert(embResp.status === 200, 'Embeddings endpoint returns HTTP 200');
  const embJson = (await embResp.json()) as any;
  assert(Array.isArray(embJson.data) && embJson.data.length === 2, 'Embeddings returned 2 vector objects');
  assert(embJson.data[0].embedding.length === 1536, 'Embedding vector has 1536 dimensions');

  // Public image delivery is handled by the site's owner authorization, without
  // developer-preview gating. Default output is binary; JSON is explicit.
  const imageRequest = (path = '/v1/images/generations', method = 'POST', accept = 'image/png') => new Request(`https://api.galx.ai${path}`, {
    method, headers: { authorization: 'Bearer image-fixture', 'content-type': 'application/json', accept },
    ...(method === 'POST' ? { body: JSON.stringify({ prompt: 'Fixture', model: 'image' }) } : {}),
  });
  const approvalBeforeImages = approvalCalls;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  imageResponse = () => new Response(png, { headers: { 'content-type': 'image/png', 'x-galx-shard': 'private-canary' } });
  const binary = await gateway.handleRequest(imageRequest());
  assert(binary.status === 200 && binary.headers.get('content-type') === 'image/png', 'Default image response is binary');
  assert(Buffer.from(await binary.arrayBuffer()).equals(png), 'Trusted site image bytes survive forwarding');
  assert(binary.headers.get('x-galx-shard') === null, 'Image forwarding strips private headers');
  imageResponse = () => Response.json({ created: 1, data: [{ b64_json: png.toString('base64'), shard: 'private-canary' }], diagnostics: 'private-canary' });
  const jsonImage = await gateway.handleRequest(imageRequest('/v1/images/generations', 'POST', 'application/json'));
  const jsonImageBody = await jsonImage.json() as any;
  assert(JSON.stringify(Object.keys(jsonImageBody).sort()) === JSON.stringify(['created','data']), 'Image JSON uses an explicit field allowlist');
  assert(JSON.stringify(Object.keys(jsonImageBody.data[0])) === JSON.stringify(['b64_json']), 'Image item JSON strips internal fields');
  imageResponse = () => Response.json({ id: 'fixture', status: 'queued', task_url: '/v1/images/tasks/fixture', diagnostics: 'private-canary' }, { status: 202 });
  const acceptedImage = await gateway.handleRequest(imageRequest('/v1/images/generations', 'POST', 'application/json'));
  assert(acceptedImage.status === 202, 'Async image submission preserves accepted status');
  assert(!JSON.stringify(await acceptedImage.json()).includes('private-canary'), 'Async image acknowledgement strips diagnostics');
  imageResponse = () => Response.json({ task: { id: 'fixture', status: 'completed', diagnostics: 'private-canary',
    result: { data: { created: 1, data: [{ b64_json: png.toString('base64'), diagnostics: 'private-canary' }] } } } });
  const completedImage = await gateway.handleRequest(imageRequest('/v1/images/tasks/fixture', 'GET', 'application/json'));
  const completedBody = await completedImage.json() as any;
  assert(completedBody.task.status === 'completed' && completedBody.task.result.data.data[0].b64_json === png.toString('base64'), 'Async retrieval preserves the completed artifact');
  assert(!JSON.stringify(completedBody).includes('private-canary'), 'Async retrieval uses nested public allowlists');
  for (const path of ['/v1/images/tasks/fixture', '/v1/images/assets/fixture/thumbnail']) {
    imageResponse = () => Response.json({ error: { message: 'private-canary' } }, { status: 404 });
    const missing = await gateway.handleRequest(imageRequest(path, 'GET'));
    assert(missing.status === 404 && !(await missing.text()).includes('private-canary'), 'Image retrieval preserves owner denial without forwarding details');
  }
  imageResponse = () => new Response(null, { status: 307, headers: { location: 'https://untrusted.example/private-canary' } });
  const redirected = await gateway.handleRequest(imageRequest());
  assert(redirected.status === 503 && redirected.headers.get('location') === null, 'Image redirects fail closed');
  imageResponse = () => new Response('<html>private-canary</html>', { status: 502, headers: { 'content-type': 'text/html' } });
  const failedImage = await gateway.handleRequest(imageRequest());
  assert(failedImage.status === 503 && !(await failedImage.text()).includes('private-canary'), 'Image upstream failure is sanitized');
  assert(approvalCalls === approvalBeforeImages && imageCalls === 8, 'Public image routes are independent of developer approval');

  // --- 2. GalxEdgeRouter Tests ---
  console.log('\n--- Phase 2: GalxEdgeRouter In-Flight Provider Failover ---');
  const router = GalxEdgeRouter.getInstance();
  let attempts = 0;
  const routeResult = await router.routeWithFailover({
    request: { model: 'gpt-5.6-sol', messages: [{ role: 'user', content: 'Test' }] },
    primaryShard: { shardId: 'shard-fail', provider: 'openai', accountLabel: 'Primary RateLimited', priority: 100, isHealthy: true },
    backupShards: [
      { shardId: 'shard-healthy', provider: 'openai', accountLabel: 'Secondary Shard', priority: 90, isHealthy: true }
    ],
    executeFn: async (shard) => {
      attempts++;
      if (shard.shardId === 'shard-fail') {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 });
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Success from backup' } }] }), { status: 200 });
    }
  });
  assert(attempts === 2, 'Edge router made 2 attempts before succeeding');
  assert(routeResult.failoverOccurred === true, 'Edge router detected failover event');
  assert(routeResult.shardUsed.shardId === 'shard-healthy', 'Edge router routed to healthy secondary shard');

  // --- 3. GalxEdgeConnectionPool Tests ---
  console.log('\n--- Phase 3: GalxEdgeConnectionPool Pre-Warming ---');
  const connPool = GalxEdgeConnectionPool.getInstance();
  assert(connPool.isEndpointWarm('openai'), 'Connection metadata initializes its warm flag');
  const warmHeaders = connPool.getWarmHeaders('openai');
  assert(warmHeaders['Connection'] === 'keep-alive', 'Connection metadata supplies a keep-alive header');

  // --- 4. GalxEdgeCache Tests ---
  console.log('\n--- Phase 4: GalxEdgeCache Stale-While-Revalidate ---');
  const edgeCache = GalxEdgeCache.getInstance();
  edgeCache.clear();

  let fetchCount = 0;
  const mockFetcher = async () => {
    fetchCount++;
    return { data: `version_${fetchCount}` };
  };

  // First fetch: MISS
  const res1 = await edgeCache.getOrFetch('test-key', mockFetcher, { ttlMs: 100, swrTtlMs: 500 });
  assert(res1.source === 'MISS' && res1.value.data === 'version_1', 'First fetch is a cache MISS');
  assert(fetchCount === 1, 'Fetcher called once');

  // Immediate second fetch: HIT
  const res2 = await edgeCache.getOrFetch('test-key', mockFetcher, { ttlMs: 100, swrTtlMs: 500 });
  assert(res2.source === 'HIT' && res2.value.data === 'version_1', 'Immediate second fetch is a cache HIT');
  assert(fetchCount === 1, 'Fetcher not called again on HIT');

  // Natural query test on edge cache BroccoliDB table
  const queryResult = edgeCache.queryNatural('key equals "test-key"');
  assert(queryResult.length === 1 && queryResult[0].key === 'test-key', 'BroccoliDB natural query on edge cache succeeded');

  // --- 5. GalxR2AssetAdapter Tests ---
  console.log('\n--- Phase 5: GalxR2AssetAdapter Multimodal Storage & CDN ---');
  const r2Adapter = GalxR2AssetAdapter.getInstance();
  const upload = await r2Adapter.uploadAsset({
    data: Buffer.from('fake-image-bytes-dalle-3'),
    contentType: 'image/webp',
    folder: 'dalle'
  });
  assert(upload.publicUrl.startsWith('https://assets.galx.ai/dalle/'), 'R2 Asset URL uses assets.galx.ai CDN host');
  assert(upload.sizeBytes > 0, 'R2 Asset size accurately recorded');
  
  const retrieved = r2Adapter.getAsset(upload.assetId);
  assert(retrieved !== null && retrieved.assetId === upload.assetId, 'R2 Asset retrieved from BroccoliDB hot table');

  // --- 6. GalxEdgeBatchBuffer Tests ---
  console.log('\n--- Phase 6: GalxEdgeBatchBuffer Micro-Batching ---');
  const batchBuffer = GalxEdgeBatchBuffer.getInstance();
  let persistedDraws = 0;
  let persistedTelemetry = 0;
  WalletRepository.getInstance().drawTokensCoalescedBatch = async (items) => {
    persistedDraws += items.length;
    return { results: items.map(item => ({ userId: item.userId, success: true, newBalance: 1 })) } as any;
  };
  TelemetryRepository.getInstance().recordTelemetryBatch = async (items) => { persistedTelemetry += items.length; return items.length; };
  const draw = batchBuffer.enqueueTokenDrawAsync({
    userId: 'user_test_edge',
    costUsd: 0.0015,
    description: 'Micro draw test'
  });
  batchBuffer.enqueueTelemetry({
    provider: 'openai',
    modelId: 'gpt-5.6-sol',
    shardId: 'shard-01',
    latencyMs: 124
  });
  const flushResult = await batchBuffer.flushAll();
  assert((await draw).success && persistedDraws === 1 && persistedTelemetry === 1, 'Batch entries reach isolated repository fixtures');
  assert(flushResult.draws >= 1, 'Batch buffer successfully flushed token draws');
  assert(flushResult.telemetry >= 1, 'Batch buffer successfully flushed telemetry samples');

  // --- 7. GalxSwarmCoordinatorDO Tests ---
  console.log('\n--- Phase 7: GalxSwarmCoordinatorDO Durable Object Swarm State ---');
  const swarmDO = new GalxSwarmCoordinatorDO('swarm_cf_001', 'Autonomous Code Refactor');
  swarmDO.registerAgent('agent_architect', 'System Architect');
  swarmDO.registerAgent('agent_coder', 'Core Engineer');
  swarmDO.updateAgentStatus('agent_architect', 'THINKING', 'Analyzing AST tree');
  swarmDO.setSharedContext('repoScope', 'src/workers/cloudflare');

  const swarmState = swarmDO.getState();
  assert(swarmState.agents.length === 2, 'Swarm DO maintains registered agents');
  assert(swarmState.sharedContext.repoScope === 'src/workers/cloudflare', 'Swarm DO stores shared context in edge memory');
  assert(swarmState.agents.find(a => a.agentId === 'agent_architect')?.status === 'THINKING', 'Swarm DO tracks agent status');

  // Test DO HTTP Fetch Handler
  const doFetchResp = await swarmDO.fetch(new Request('https://do/state', { method: 'GET' }));
  assert(doFetchResp.status === 200, 'Swarm DO HTTP fetch /state returns HTTP 200');
  const doStateJson = (await doFetchResp.json()) as any;
  assert(doStateJson.swarmId === 'swarm_cf_001', 'Swarm DO HTTP RPC returns valid swarm ID');

  const doRegisterResp = await swarmDO.fetch(
    new Request('https://do/agent/register', {
      method: 'POST',
      body: JSON.stringify({ agentId: 'agent_tester', role: 'QA Sentinel' })
    })
  );
  assert(doRegisterResp.status === 200, 'Swarm DO HTTP fetch /agent/register returns HTTP 200');

  // --- 8. GalxEdgeWebhookDispatcher Tests ---
  console.log('\n--- Phase 8: GalxEdgeWebhookDispatcher HMAC Signatures ---');
  const webhookDispatcher = GalxEdgeWebhookDispatcher.getInstance();
  const webhookSecret = 'whsec_galxai_test_secret_32bytes_long';
  const dispatchResult = await webhookDispatcher.dispatch({
    targetUrl: 'https://example.com/webhook',
    payload: { event: 'task.completed', taskId: 'task_123' },
    secret: webhookSecret,
    eventType: 'task.completed'
  });
  assert(dispatchResult.isSuccess === true, 'Webhook dispatch simulation completes (no delivery attempted)');
  assert(dispatchResult.signature.startsWith('sha256='), 'Webhook payload includes HMAC-SHA256 signature');

  // --- 9. GalxEdgeWire Tests ---
  console.log('\n--- Phase 9: GalxEdgeWire Binary Codec ---');
  const edgeWire = GalxEdgeWire.getInstance();
  const testPayload = { model: 'gpt-5.6-sol', tokens: 1500, stream: true };
  const encoded = edgeWire.encodeBinary(testPayload);
  assert(encoded instanceof Uint8Array && encoded.length > 0, 'Payload encoded to Uint8Array binary format');
  const decoded = edgeWire.decodeBinary<typeof testPayload>(encoded);
  assert(decoded.model === testPayload.model && decoded.tokens === 1500, 'Binary buffer accurately decoded back to typed object');

  // --- 10. GalxEdgeQueueWorker Tests ---
  console.log('\n--- Phase 10: GalxEdgeQueueWorker Cron Task Fleet ---');
  const queueWorker = new GalxEdgeQueueWorker(mockEnv);
  const batchProc = await queueWorker.processBatch('default', 10);
  assert(queueCalls === 1 && batchProc.processed === 0 && batchProc.errors === 0, 'Empty queue fixture is leased once and processes no tasks');
  assert(unexpectedRequests === 0, 'No unmocked network requests occurred');

  console.log('\n======================================================================');
  console.log(`   ALL ${testsPassed} CLOUDFLARE EDGE VERIFICATION TESTS PASSED (0 FAILS)!`);
  console.log('======================================================================\n');
}

runAllTests().catch((err) => {
  console.error('\n[FATAL ERROR IN TEST SUITE]:', err);
  process.exit(1);
});
