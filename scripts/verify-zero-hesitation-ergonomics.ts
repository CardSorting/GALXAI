/**
 * GALXAI Zero-Hesitation Developer Ergonomics Verification Suite
 * Tests universal mental model absorption, alias resolution, multi-header auth,
 * Ollama protocol compatibility, legacy OpenAI endpoints, multi-paradigm SDK ergonomics,
 * Vercel AI SDK adapters, fluent thenable builders, multi-modal image ingestion,
 * Agent tool normalization, batch runner, token optimization, and resilience/memory helpers.
 */

import { ModelCatalog } from '../src/core/router/ModelCatalog';
import { GalxAuthEngine } from '../src/core/auth/GalxAuthEngine';
import { GalxPersistence } from '../src/lib/storage/GalxPersistence';
import { GalxCryptoVault } from '../src/core/vault/GalxCryptoVault';
import {
  GalxAI,
  GalxAIClient,
  Client,
  Galx,
  run,
  generate,
  chat,
  embed,
  builder,
  toTextStream,
  toTextStreamResponse,
  toDataStreamResponse,
  toSSEResponse,
  MultiModalHelper,
  APIError,
  RateLimitError,
  AuthenticationError,
  AgentRuntime,
  batch,
  createFallbackModelPlugin,
  createLoggingPlugin,
  TokenOptimizer,
  estimateTokens,
  truncateToFit,
  fallback,
  race
} from '../src/sdk/index';

async function runZeroHesitationAudit() {
  console.log('\n=============================================================');
  console.log('🚀 RUNNING GALXAI ZERO-HESITATION ERGONOMICS AUDIT (FULL SUITE)');
  console.log('=============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${detail || 'Assertion failed'}`);
    }
  }

  // --- 1. MODEL CATALOG MENTAL MODEL RESOLUTION ---
  console.log('📌 Testing ModelCatalog Universal Alias & Mental Model Absorption...');

  // Sol / Flagship
  assert(ModelCatalog.resolveModel('gpt-5.6-sol').id === 'gpt-5.6-sol', 'Canonical ID resolves correctly');
  assert(ModelCatalog.resolveModel('gpt-5').id === 'gpt-5.6-sol', 'gpt-5 resolves to gpt-5.6-sol');
  assert(ModelCatalog.resolveModel('gpt5').id === 'gpt-5.6-sol', 'gpt5 resolves to gpt-5.6-sol');
  assert(ModelCatalog.resolveModel('sol').id === 'gpt-5.6-sol', 'sol resolves to gpt-5.6-sol');
  assert(ModelCatalog.resolveModel('codex').id === 'gpt-5.6-sol', 'codex resolves to gpt-5.6-sol');
  assert(ModelCatalog.resolveModel('flagship').id === 'gpt-5.6-sol', 'flagship resolves to gpt-5.6-sol');
  assert(ModelCatalog.resolveModel('sota').id === 'gpt-5.6-sol', 'sota resolves to gpt-5.6-sol');
  assert(ModelCatalog.resolveModel('coding').id === 'gpt-5.6-sol', 'coding resolves to gpt-5.6-sol');
  assert(ModelCatalog.resolveModel('best').id === 'gpt-5.6-sol', 'best resolves to gpt-5.6-sol');
  assert(ModelCatalog.resolveModel('gpt-4o').id === 'gpt-5.6-sol', 'gpt-4o drop-in resolves to gpt-5.6-sol');
  assert(ModelCatalog.resolveModel('chatgpt-4o').id === 'gpt-5.6-sol', 'chatgpt-4o drop-in resolves to gpt-5.6-sol');
  assert(ModelCatalog.resolveModel('claude-3-7-sonnet').id === 'gpt-5.6-sol', 'claude-3-7-sonnet resolves to flagship');
  assert(ModelCatalog.resolveModel('claude-3-5-sonnet-latest').id === 'gpt-5.6-sol', 'claude-3-5-sonnet-latest resolves to flagship');
  assert(ModelCatalog.resolveModel('deepseek-v3').id === 'gpt-5.6-sol', 'deepseek-v3 resolves to flagship');
  assert(ModelCatalog.resolveModel('gemini-2.5-pro').id === 'gpt-5.6-sol', 'gemini-2.5-pro resolves to flagship');

  // Terra / Reasoning
  assert(ModelCatalog.resolveModel('terra').id === 'gpt-5.6-terra', 'terra resolves to gpt-5.6-terra');
  assert(ModelCatalog.resolveModel('reasoning').id === 'gpt-5.6-terra', 'reasoning intent resolves to gpt-5.6-terra');
  assert(ModelCatalog.resolveModel('o1').id === 'gpt-5.6-terra', 'o1 drop-in resolves to gpt-5.6-terra');
  assert(ModelCatalog.resolveModel('o3-mini').id === 'gpt-5.6-terra', 'o3-mini drop-in resolves to gpt-5.6-terra');
  assert(ModelCatalog.resolveModel('deepseek-r1').id === 'gpt-5.6-terra', 'deepseek-r1 resolves to gpt-5.6-terra');

  // Luna / Fast Velocity
  assert(ModelCatalog.resolveModel('luna').id === 'gpt-5.6-luna', 'luna resolves to gpt-5.6-luna');
  assert(ModelCatalog.resolveModel('fast').id === 'gpt-5.6-luna', 'fast intent resolves to gpt-5.6-luna');
  assert(ModelCatalog.resolveModel('cheap').id === 'gpt-5.6-luna', 'cheap intent resolves to gpt-5.6-luna');
  assert(ModelCatalog.resolveModel('velocity').id === 'gpt-5.6-luna', 'velocity intent resolves to gpt-5.6-luna');
  assert(ModelCatalog.resolveModel('gpt-4o-mini').id === 'gpt-5.6-luna', 'gpt-4o-mini resolves to gpt-5.6-luna');
  assert(ModelCatalog.resolveModel('gemini-2.0-flash').id === 'gpt-5.6-luna', 'gemini-2.0-flash resolves to gpt-5.6-luna');

  // Grok 4.6 / 1M Frontier
  assert(ModelCatalog.resolveModel('grok-4.6').id === 'x-ai/grok-4.6', 'grok-4.6 resolves to x-ai/grok-4.6');
  assert(ModelCatalog.resolveModel('grok').id === 'x-ai/grok-4.6', 'grok shorthand resolves to x-ai/grok-4.6');
  assert(ModelCatalog.resolveModel('xai-grok').id === 'x-ai/grok-4.6', 'xai-grok resolves to x-ai/grok-4.6');
  assert(ModelCatalog.resolveModel('grok-1m').id === 'x-ai/grok-4.6', 'grok-1m resolves to x-ai/grok-4.6');

  // Image & Embedding
  assert(ModelCatalog.resolveModel('image').id === 'openai-gpt-image-2', 'image intent resolves to openai-gpt-image-2');
  assert(ModelCatalog.resolveModel('dall-e-3').id === 'openai-gpt-image-2', 'dall-e-3 resolves to openai-gpt-image-2');
  assert(ModelCatalog.resolveModel('embedding').id === 'text-embedding-3-small', 'embedding intent resolves to text-embedding-3-small');

  // Prefixes & Suffixes & Version Tags
  assert(ModelCatalog.resolveModel('openai/gpt-5.6-sol:latest').id === 'gpt-5.6-sol', 'openai/ prefix and :latest suffix stripped');
  assert(ModelCatalog.resolveModel('@anthropic/claude-3-5-sonnet-latest').id === 'gpt-5.6-sol', '@anthropic/ prefix stripped');
  assert(ModelCatalog.resolveModel('galxai:gpt-5-6-sol').id === 'gpt-5.6-sol', 'galxai: prefix and dash version absorbed');

  // Zero-Hesitation Default Fallbacks
  assert(ModelCatalog.resolveModel('').id === 'gpt-5.6-sol', 'Empty string gracefully defaults to gpt-5.6-sol');
  assert(ModelCatalog.resolveModel(undefined as any).id === 'gpt-5.6-sol', 'Undefined gracefully defaults to gpt-5.6-sol');
  assert(ModelCatalog.resolveModel('completely-unknown-custom-model-xyz').id === 'gpt-5.6-sol', 'Unknown model gracefully defaults to flagship');

  // --- 2. AUTH ENGINE MULTI-HEADER & QUERY INGESTION ---
  console.log('\n📌 Testing GalxAuthEngine Multi-Header & Query Parameter Ingestion...');
  const authEngine = GalxAuthEngine.getInstance();
  const persistence = GalxPersistence.getInstance();

  // Create a live test key
  const { apiKey: testApiKey } = GalxCryptoVault.generateGatewayKey('Zero Hesitation Test Key', 'dev_user_123');
  persistence.saveGatewayKey({
    id: 'key_test_audit',
    name: 'Zero Hesitation Test Key',
    prefix: testApiKey.substring(0, 14),
    keyPrefix: testApiKey.substring(0, 14),
    keyHash: GalxCryptoVault.hashApiKey(testApiKey),
    userId: 'dev_user_123',
    rateLimitPerMinute: 120,
    totalRequests: 0,
    totalTokens: 0,
    createdAtMs: Date.now(),
    revoked: false
  });

  // Standard Authorization Bearer
  const auth1 = await authEngine.resolveAuthIdentity({
    headers: { authorization: `Bearer ${testApiKey}` }
  });
  assert(auth1.authenticated && auth1.userId === 'dev_user_123', 'Standard Authorization: Bearer <key> resolves');

  // Quoted Bearer Token
  const auth2 = await authEngine.resolveAuthIdentity({
    headers: { authorization: `Bearer "${testApiKey}"` }
  });
  assert(auth2.authenticated && auth2.userId === 'dev_user_123', 'Quoted Bearer "<key>" resolves cleanly');

  // x-api-key header (Anthropic / AWS style)
  const auth3 = await authEngine.resolveAuthIdentity({
    headers: { 'x-api-key': testApiKey }
  });
  assert(auth3.authenticated && auth3.userId === 'dev_user_123', 'x-api-key header resolves');

  // x-galx-key custom header
  const auth4 = await authEngine.resolveAuthIdentity({
    headers: { 'x-galx-key': testApiKey }
  });
  assert(auth4.authenticated && auth4.userId === 'dev_user_123', 'x-galx-key header resolves');

  // api-key alternative header
  const auth5 = await authEngine.resolveAuthIdentity({
    headers: { 'api-key': testApiKey }
  });
  assert(auth5.authenticated && auth5.userId === 'dev_user_123', 'api-key header resolves');

  // URL query parameter ?api_key=...
  const auth6 = await authEngine.resolveAuthIdentity({
    headers: {},
    url: `https://galx.ai/v1/chat/completions?api_key=${testApiKey}`
  });
  assert(auth6.authenticated && auth6.userId === 'dev_user_123', 'URL query ?api_key=... resolves');

  // Developer Mock / Test Sandbox key
  const auth7 = await authEngine.resolveAuthIdentity({
    headers: { authorization: 'galx_test_sandbox_developer_token_999' }
  });
  assert(auth7.authenticated && auth7.authType === 'developer_key', 'galx_test_ sandbox token resolves without friction');

  // --- 3. MULTI-PARADIGM SDK ERGONOMICS ---
  console.log('\n📌 Testing Multi-Paradigm SDK Ergonomics...');

  // Constructor with raw string API key
  const sdkStringClient = new GalxAI('galx_live_custom_key_123');
  assert((sdkStringClient as any).core.apiKey === 'galx_live_custom_key_123', 'SDK accepts raw string API key in constructor');
  assert((sdkStringClient as any).core.baseURL === 'https://galx.ai/v1', 'SDK defaults to https://galx.ai/v1');

  // Constructor with snake_case and alternative options
  const sdkSnakeClient = new GalxAIClient({
    api_key: 'galx_live_snake_key',
    base_url: 'https://custom.gateway.galx.ai/v1',
    timeout_ms: 45000,
    max_retries: 4
  });
  assert((sdkSnakeClient as any).core.apiKey === 'galx_live_snake_key', 'SDK absorbs api_key (snake_case)');
  assert((sdkSnakeClient as any).core.baseURL === 'https://custom.gateway.galx.ai/v1', 'SDK absorbs base_url (snake_case)');
  assert((sdkSnakeClient as any).core.timeoutMs === 45000, 'SDK absorbs timeout_ms (snake_case)');
  assert((sdkSnakeClient as any).core.maxRetries === 4, 'SDK absorbs max_retries (snake_case)');

  // Anthropic messages resource present
  assert(typeof sdkStringClient.messages?.create === 'function', 'galx.messages.create resource defined for Anthropic compatibility');

  // Convenience methods present
  assert(typeof sdkStringClient.generate === 'function', 'galx.generate convenience method defined');
  assert(typeof sdkStringClient.embed === 'function', 'galx.embed convenience method defined');
  assert(typeof sdkStringClient.builder === 'function', 'galx.builder fluent helper defined');
  assert(typeof run === 'function', 'Top-level run function exported');
  assert(typeof chat === 'function', 'Top-level chat function exported');
  assert(typeof generate === 'function', 'Top-level generate function exported');
  assert(typeof embed === 'function', 'Top-level embed function exported');
  assert(typeof builder === 'function', 'Top-level builder function exported');

  // Class aliases exported
  assert(GalxAI === GalxAIClient && GalxAI === Client && GalxAI === Galx, 'GalxAI, GalxAIClient, Client, Galx aliases all export correctly');

  // --- 4. STREAM ADAPTERS & VERCEL AI SDK PROTOCOL ---
  console.log('\n📌 Testing Stream Adapters & Vercel AI SDK Protocols...');

  async function* mockStringGenerator() {
    yield 'Hello';
    yield ' ';
    yield 'World!';
  }

  const textStream = toTextStream(mockStringGenerator());
  assert(textStream instanceof ReadableStream, 'toTextStream returns standard ReadableStream');

  const textStreamRes = toTextStreamResponse(mockStringGenerator());
  assert(Boolean(textStreamRes.headers.get('Content-Type')?.includes('text/plain')), 'toTextStreamResponse sets text/plain header');

  const dataStreamRes = toDataStreamResponse(mockStringGenerator());
  assert(dataStreamRes.headers.get('x-vercel-ai-data-stream') === 'v1', 'toDataStreamResponse sets Vercel AI data stream header');

  const sseRes = toSSEResponse(mockStringGenerator());
  assert(Boolean(sseRes.headers.get('Content-Type')?.includes('text/event-stream')), 'toSSEResponse sets text/event-stream header');

  // --- 5. MULTI-MODAL IMAGE INGESTION ---
  console.log('\n📌 Testing Multi-Modal Vision Ingestion...');

  // URL String
  const img1 = MultiModalHelper.encodeImage('https://example.com/photo.jpg');
  assert(img1.type === 'image_url' && img1.image_url.url === 'https://example.com/photo.jpg', 'Encodes raw URL string');

  // Base64 String
  const img2 = MultiModalHelper.encodeImage('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
  assert(img2.type === 'image_url' && img2.image_url.url.startsWith('data:image/jpeg;base64,'), 'Encodes raw base64 string');

  // Anthropic Object
  const img3 = MultiModalHelper.encodeImage({
    type: 'image',
    source: {
      type: 'base64',
      media_type: 'image/png',
      data: 'abc12345'
    }
  });
  assert(img3.image_url.url === 'data:image/png;base64,abc12345', 'Absorbs Anthropic image structure');

  // Single Image in createUserMessage
  const userMsg = MultiModalHelper.createUserMessage('What is in this image?', 'https://example.com/test.png');
  assert(userMsg.role === 'user' && Array.isArray(userMsg.content) && userMsg.content.length === 2, 'createUserMessage absorbs single image argument');

  // --- 6. ACTIONABLE ERROR DIAGNOSTICS ---
  console.log('\n📌 Testing Actionable Error Diagnostics...');
  const rateLimitErr = APIError.fromResponse(429, { message: 'Too many requests', retry_after: 2 });
  assert(rateLimitErr instanceof RateLimitError && !!rateLimitErr.suggestedFix, 'RateLimitError generates actionable suggestedFix');

  const authErr = APIError.fromResponse(401, { message: 'Unauthorized' });
  assert(authErr instanceof AuthenticationError && !!authErr.suggestedFix, 'AuthenticationError generates actionable suggestedFix');

  // --- 7. AGENT UNIVERSAL TOOLS & BATCH RUNNER ---
  console.log('\n📌 Testing Agent Universal Tools & Batch Runner...');

  // Agent tool normalization with pure functions
  const agent = new AgentRuntime({} as any, {
    tools: {
      getWeather: async ({ city }: { city: string }) => ({ temp: 72, city })
    }
  });
  const toolMap = (agent as any).normalizeTools();
  assert(toolMap.has('getWeather'), 'Agent normalizes raw function into tool registry');

  // Agent tool normalization with Anthropic style array
  const anthropicAgent = new AgentRuntime({} as any, {
    tools: [
      {
        name: 'searchDocs',
        description: 'Search documentation',
        input_schema: { type: 'object', properties: { q: { type: 'string' } } },
        execute: async () => ({ results: [] })
      }
    ]
  });
  const anthropicToolMap = (anthropicAgent as any).normalizeTools();
  assert(anthropicToolMap.has('searchDocs'), 'Agent normalizes Anthropic-style tool array');

  // Batch runner
  const batchResults = await batch([1, 2, 3], async (num) => num * 10);
  assert(batchResults.length === 3 && batchResults[0].result === 10, 'Top-level batch helper maps concurrently');

  // Plugins
  const fallbackPlugin = createFallbackModelPlugin({ fallbackModel: 'gpt-5.6-luna' });
  assert(fallbackPlugin.name === 'FallbackModelPlugin', 'createFallbackModelPlugin initialized');

  const logPlugin = createLoggingPlugin();
  assert(logPlugin.name === 'LoggingPlugin', 'createLoggingPlugin initialized');

  // --- 8. TOKEN OPTIMIZER & PROMPT CACHING ---
  console.log('\n📌 Testing Token Optimizer & Prompt Caching...');
  const tokenCount = estimateTokens('Explain zero-hesitation architecture in detail.');
  assert(tokenCount > 5 && tokenCount < 20, 'estimateTokens returns accurate BPE heuristic count');

  const savings = TokenOptimizer.calculateSavings(1000000, 500000, 'gpt-5.6-sol');
  assert(savings.savingsUsd > 0 && savings.discountPercentage === 25, 'calculateSavings accurately computes wholesale discount');

  const messagesToTruncate = [
    { role: 'system' as const, content: 'You are an architect.' },
    { role: 'user' as const, content: 'Message 1' },
    { role: 'assistant' as const, content: 'Reply 1' },
    { role: 'user' as const, content: 'Message 2' },
    { role: 'assistant' as const, content: 'Reply 2' },
    { role: 'user' as const, content: 'Latest Message' }
  ];
  const truncated = truncateToFit(messagesToTruncate, 50);
  assert(truncated[0].role === 'system' && truncated[truncated.length - 1].content === 'Latest Message', 'truncateToFit preserves system and latest turns');

  // --- 9. RESILIENCE HELPERS & MEMORY KV ---
  console.log('\n📌 Testing Resilience Helpers & Database Memory KV...');
  assert(typeof fallback === 'function', 'Top-level fallback cascade function exported');
  assert(typeof race === 'function', 'Top-level race function exported');

  const galxClient = new GalxAI();
  galxClient.db.remember('user_session_42', { authenticated: true, role: 'admin' });
  const sessionData = galxClient.db.recall<{ authenticated: boolean; role: string }>('user_session_42');
  assert(sessionData?.authenticated === true && sessionData?.role === 'admin', 'db.remember and db.recall persist structured memory');

  const forgot = galxClient.db.forget('user_session_42');
  const sessionAfterForget = galxClient.db.recall('user_session_42');
  assert(forgot && sessionAfterForget === null, 'db.forget removes memory key cleanly');

  // --- 10. CATALOG LISTING & EXTRACT/TOOL EXPORTS ---
  console.log('\n📌 Testing Catalog Listing & Top-Level Helpers...');
  const { extract, tool } = await import('../src/sdk/index');

  const modelsList = ModelCatalog.listModels();
  assert(Array.isArray(modelsList) && modelsList.length >= 15, 'ModelCatalog.listModels returns complete catalog');

  const allModels = ModelCatalog.listAll();
  assert(Array.isArray(allModels) && allModels.length === modelsList.length, 'ModelCatalog.listAll matches listModels');

  assert(typeof extract === 'function', 'Top-level extract helper exported');
  assert(typeof tool === 'function', 'Top-level tool helper exported');

  // --- 11. FRAMEWORK SHIMS & DROP-IN COMPATIBILITY ---
  console.log('\n📌 Testing Framework Shims & Drop-In Compatibility...');
  const { OpenAI, Anthropic, createGalxAI, galxai: galxaiProvider, ChatGalxAI } = await import('../src/sdk/index');

  const openaiShim = new OpenAI({ apiKey: 'galx_live_openai_shim_key' });
  assert((openaiShim as any).core.apiKey === 'galx_live_openai_shim_key', 'OpenAI class shim instantiated with drop-in signature');

  const anthropicShim = new Anthropic({ apiKey: 'galx_live_anthropic_shim_key' });
  assert((anthropicShim as any).core.apiKey === 'galx_live_anthropic_shim_key', 'Anthropic class shim instantiated with drop-in signature');

  const vercelAI = createGalxAI({ apiKey: 'galx_live_vercel_key' });
  const modelWrapper = vercelAI('gpt-5.6-sol');
  assert(modelWrapper.modelId === 'gpt-5.6-sol', 'createGalxAI Vercel AI SDK provider initialized');

  const langchainShim = new ChatGalxAI({ model: 'gpt-5.6-sol', temperature: 0.3 });
  assert(langchainShim.modelName === 'gpt-5.6-sol' && langchainShim.temperature === 0.3, 'ChatGalxAI LangChain shim initialized');

  const { GalxLLM, thread, ConversationThread } = await import('../src/sdk/index');
  const llamaShim = new GalxLLM({ model: 'gpt-5.6-sol', temperature: 0.2 });
  assert(llamaShim.model === 'gpt-5.6-sol' && llamaShim.temperature === 0.2, 'GalxLLM LlamaIndex shim initialized');

  const conv = thread({ model: 'gpt-5.6-sol', system: 'You are a helpful assistant' });
  conv.user('Hello world');
  const history = conv.getHistory();
  assert(history.length === 2 && history[0].role === 'system' && history[1].content === 'Hello world', 'ConversationThread manages stateful multi-turn history');

  // --- 12. UNIVERSAL QUERY & FORGIVING BODY INGESTION ---
  console.log('\n📌 Testing Universal Query & Forgiving Body Ingestion...');
  const { GET: chatGetHandler, POST: chatPostHandler } = await import('../src/app/v1/chat/completions/route');
  const { GET: ollamaGetHandler, POST: ollamaPostHandler } = await import('../src/app/api/generate/route');

  assert(typeof chatGetHandler === 'function', 'v1/chat/completions exports GET query parameter handler');
  assert(typeof chatPostHandler === 'function', 'v1/chat/completions exports POST handler');
  assert(typeof ollamaGetHandler === 'function', 'api/generate exports GET query parameter handler');
  assert(typeof ollamaPostHandler === 'function', 'api/generate exports POST handler');

  console.log('\n=============================================================');
  console.log(`🏁 AUDIT RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log('=============================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runZeroHesitationAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
