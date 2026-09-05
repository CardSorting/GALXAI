# 🛠️ GALXAI Developer & Contributing Guide

This guide covers the internal codebase structure, architectural layers, how to add new model adapters, and testing standards.

---

## 📁 Repository Structure

```text
├── docs/                             # Comprehensive Architecture & API Documentation
│   ├── adr/                          # Architecture Decision Records (0001-0119)
│   ├── maintainers/                  # Internal Maintainer Knowledge Base (20 Manuals)
│   ├── playbooks/                    # Operational Lifecycle Playbooks (Stages 1-8)
│   ├── ARCHITECTURE.md               # System overview, lifecycle, and security model
│   ├── SENIOR_ENGINEERING_REVIEW_CHAT_AND_ROLLING_CONTEXT.md # Chat memory & seat review
│   ├── FORENSIC_PAYLOAD_DISSECTION_AND_CAUSAL_ANALYSIS.md # Byte-by-byte before/after payload analysis
│   ├── STANDARDIZED_OAUTH_AND_INGESTION_ARCHITECTURE.md # Two-Tier Auth & Ingestion Spec
│   ├── SYSTEM_TOPOLOGY_AND_MAINTENANCE_ONBOARDING.md # Architecture map & onboarding runbook
│   ├── API_REFERENCE.md              # REST API endpoint specifications (/v1 & /api)
│   ├── VERCEL_DEPLOYMENT.md          # 8-Phase Pre-Flight Audit & Next.js 15 Deployment
│   ├── CLOUDFLARE_STRATEGY.md        # Edge Mesh, R2 CDN & Custom Domain Substrate
│   ├── SDK_SPECIFICATION.md          # Universal Developer SDK & Ultra-Flat Ergonomics
│   ├── OAUTH_AND_TOKEN_LIFECYCLE_SPECIFICATION.md # Enterprise OAuth 2.1 & Token Mesh
│   ├── PROVIDER_AS_AUTH_SPECIFICATION.md # Provider-as-Auth Architecture & JWE Tokens
│   ├── SUPABASE_PARANOID_ARCHITECTURE_SPEC.md # 10 Commandments & AOP-DB Protocol
│   ├── QUICKSTART.md                 # Python, Node.js, Cursor, Continue setup
│   ├── ROUTING_ALGORITHMS.md         # Mathematical derivations of P-AHT, SWRR, WLC
│   ├── SECURITY.md                   # Envelope cryptography, transport hardening & threat model
│   ├── DEVELOPER_GUIDE.md            # Contributing guide and adapter development
│   ├── INFERENCE_PIPELINE_VERIFICATION.md # Sovereign Inference Pipeline & Verification Guide
│   └── TROUBLESHOOTING.md            # Error classification and operational playbooks
├── scripts/
│   ├── test-inference-pipeline.ts    # Real end-to-end inference pipeline test & project generator
│   ├── manage-migrations.ts          # Migration executor and status manager
│   ├── push-migrations-direct.ts     # Direct Supabase migration push script (npm run db:push)
│   ├── verify-supabase-integrity.ts  # Paranoid PostgreSQL linter (npm run db:verify)
│   ├── test-supabase-integration.ts  # Live Supabase 92-test zero-egress suite (npm run db:test)
│   ├── test-chat-context-hardening.ts # Chat normalization & context hardening test
│   ├── verify-vercel-readiness.ts    # 8-Phase Pre-Flight Audit Engine
│   ├── sync-vercel-env.ts            # Automated Vercel Secret Synchronizer
│   ├── verify-deployment-smoke.ts    # Post-Deployment Live Smoke Test Suite
│   ├── populate-vault-secrets.ts     # Cryptographic Vault Secret Generator & Sync
│   ├── bootstrap-cloudflare.ts       # Automated Cloudflare resource provisioner
│   ├── test-cloudflare-workers.ts    # 46-suite Cloudflare edge verification runner
│   ├── test-sdk-edge.ts              # SDK to Edge Gateway live smoke test
│   └── validate-galxai-router.ts     # Forensic verification test runner (217 tests)
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # Gateway admin, explicit session sync, ingestion, and pool APIs
│   │   ├── v1/                       # OpenAI & Anthropic-compatible public API routes
│   │   │   ├── chat/completions/     # OpenAI chat completions (with dynamic 1M context)
│   │   │   ├── messages/             # Anthropic Claude messages
│   │   │   ├── embeddings/           # OpenAI vector embeddings
│   │   │   ├── images/generations/   # Multi-modal image generation
│   │   │   └── models/               # Model discovery
│   │   ├── auth/                     # Authentication flows; successful auth defaults to /models
│   │   ├── models/                   # Canonical model catalog, cards, comparison, and routing
│   │   ├── keys/                     # Gateway API-key management
│   │   ├── playground/               # Stateless API request diagnostic; never a chat destination
│   │   └── settings/                 # Seat quota and rolling window settings
│   ├── sdk/                          # Zero-dependency Universal SDK (TypeScript / Python)
│   ├── components/                   # Control-plane navigation, model, billing, telemetry, and docs UI
│   ├── core/                         # Pure TypeScript Gateway Engine (zero React dependencies)
│   │   ├── broccolidb/               # BroccoliDB In-Memory Reactive Tables & Compaction Mesh
│   │   ├── chat/                     # Request Normalizer & Persistence Validator
│   │   ├── circuit/                  # 4-State Circuit Breaker with Canary Warming
│   │   ├── contracts/                # Core TypeScript contracts and interfaces
│   │   ├── governor/                 # GalxElasticContextGovernor (Dynamic 1M context sizing)
│   │   ├── pool/                     # Adaptive Hydraulic Headroom (P-AHT) Pool Engine
│   │   ├── router/                   # GalxModelRouter & GalxRollingContextEngine
│   │   │   └── adapters/             # Provider-specific execution adapters (OpenAI, Grok)
│   │   ├── subscription/             # GalxSeatTierEngine (5-Hour & Weekly Quotas)
│   │   ├── substrate/                # In-memory shard cache & persistent storage bridge
│   │   ├── telemetry/                # Circular Ring Buffer Histogram Metrics Engine
│   │   ├── validator/                # Preflight key format & upstream validator
│   │   └── vault/                    # AES-256-GCM Envelope Encryption with AAD
│   └── lib/                          # Storage helpers, Supabase repositories, and utilities      # Provider-specific execution adapters (OpenAI, Grok)
│   │   ├── substrate/                # In-memory shard cache & persistent storage bridge
│   │   ├── telemetry/                # Circular Ring Buffer Histogram Metrics Engine
│   │   ├── validator/                # Preflight key format & upstream validator
│   │   └── vault/                    # AES-256-GCM Envelope Encryption with AAD
│   └── lib/                          # Storage helpers and utility functions
└── README.md                         # Project overview and quickstart
```

The hosted application boundary is defined in [Product Surface Strategy](PRODUCT_SURFACE_STRATEGY.md) and ADR 0119. Protocol and SDK names containing `chat` remain valid inference contracts; they are not permission to add a first-party browser chat, persona, sharing, or image-studio surface.

---

## 🔌 Adding a New Provider Adapter

To add support for a new provider (e.g. Anthropic or Mistral):

1. **Define the Provider Contract**:
   Update `ProviderType` in `src/core/contracts/GalxContracts.ts`:
   ```typescript
   export type ProviderType = 'openai' | 'xai-grok' | 'anthropic';
   ```

2. **Implement Provider Adapter**:
   Create `src/core/router/adapters/AnthropicAdapter.ts`:
   ```typescript
   export class AnthropicAdapter {
     static async executeChatCompletion(
       req: ChatCompletionRequest,
       secret: DecryptedGalxSecret,
       modelSpec: ModelSpecItem
     ): Promise<{ response: Response; headers: Record<string, string> }> {
       // Upstream fetch logic and response header extraction
     }
   }
   ```

3. **Register Models in Model Catalog**:
   Add model definitions in `src/core/router/ModelCatalog.ts`:
   ```typescript
   {
     id: 'claude-3.7-sonnet',
     upstreamId: 'claude-3-7-sonnet-20250219',
     name: 'Claude 3.7 Sonnet',
     provider: 'anthropic',
     category: 'llm',
     contextWindowTokens: 200000,
     maxOutputTokens: 8192,
     inputPricePer1M: 2.25,
     outputPricePer1M: 11.25,
     supportsVision: true,
     supportsReasoning: true,
     supportsStreaming: true,
     description: 'Hybrid reasoning and standard generation model.'
   }
   ```

4. **Wire into Router Dispatcher**:
   Update `src/core/router/GalxModelRouter.ts` inside `routeChatCompletion`.

---

## ⚡ Asynchronous Task Queues & Cloud Run Webhooks

GALXAI includes an asynchronous task queue engine (`GalxTaskQueueEngine`) inspired by Google Cloud Tasks and Cloud Run for non-blocking agent swarm workflows.

### Python SDK Async Queue Workflow
```python
import httpx

# 1. Enqueue Async Chat Task with Webhook Callback
resp = httpx.post(
    "https://api.galx.ai/v1/chat/completions",
    headers={
        "Authorization": "Bearer galx_live_...",
        "X-Galx-Async": "true",
        "X-Galx-Queue": "llm-batch",
        "X-Galx-Webhook-Url": "https://my-service.run.app/ai-webhook",
        "Idempotency-Key": "eval-run-batch-001"
    },
    json={
        "model": "gpt-5.6-sol",
        "messages": [{"role": "user", "content": "Analyze system logs"}]
    }
)
task_info = resp.json()
print("Enqueued Task:", task_info["id"], "Status:", task_info["status"])

# 2. Poll Task Status
task_url = task_info["task_url"]
status_resp = httpx.get(f"https://api.galx.ai{task_url}", headers={"Authorization": "Bearer galx_live_..."})
print("Current Task Result:", status_resp.json()["task"]["result"])
```

### TypeScript SDK Queue Client Workflow
```typescript
import { GalxQueueClient, GalxTaskQueueEngine } from '@/core/queue';

const client = new GalxQueueClient();

// 1. Enqueue Async Chat Task with FIFO Group Partitioning
const { task } = client.enqueueChat({
  queueId: 'llm-batch',
  userId: 'user_123',
  groupId: 'conversation_session_99', // Enforces sequential FIFO turn ordering
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Design an event-driven architecture.' }],
  priority: 80
});

// 2. Poll or Stream via Real-Time SSE
const unsubscribe = client.subscribeTaskEvents(task.id, (evt) => {
  console.log(`[SSE Event] ${evt.type}:`, evt.data);
});
```

### Complex DAG Workflows (Fan-In Orchestration)
```typescript
// 1. Launch Parallel Parent Tasks
const taskA = client.enqueueChat({ model: 'gpt-5.6-sol', messages: [{ role: 'user', content: 'Generate outline' }] });
const taskB = client.enqueueImage({ prompt: 'Cybernetic datacenter illustration' });

// 2. Launch Fan-In Aggregation Child Task (only runs after A & B complete)
const childTask = client.createFanInTask({
  queueId: 'agent-swarms',
  dependsOn: [taskA.task.id, taskB.task.id],
  target: {
    type: 'INTERNAL_MODEL',
    taskKind: 'chat_completion',
    chatPayload: {
      model: 'gpt-5.6-sol',
      messages: [{ role: 'user', content: 'Compile article with illustration reference' }]
    }
  }
});
```

### Webhook Signature Verification (HMAC-SHA256)
When tasks complete or fail with a webhook URL, GALXAI transmits `X-Galx-Signature: t=<timestamp>,v1=<hmac>` computed over `<timestamp>.<payload>`:

```python
import hmac, hashlib

def verify_galx_webhook(signature_header: str, raw_body: bytes, secret: str) -> bool:
    parts = dict(kv.split("=") for kv in signature_header.split(","))
    timestamp = parts.get("t")
    signature = parts.get("v1")
    expected = hmac.new(secret.encode(), f"{timestamp}.{raw_body.decode()}".encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected)
```

---

## 📦 Official Universal Developer SDK (`@galxai/sdk`)

GALXAI provides a zero-dependency universal SDK compatible with Node.js 18+, Edge Runtimes, Cloudflare Workers, Bun, Deno, and modern Browsers.

```typescript
import { GalxAI, RateLimitError, AuthenticationError } from '@/sdk';

const galx = new GalxAI({ apiKey: process.env.GALX_API_KEY });

// 1. Synchronous Chat Completion
const completion = await galx.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Explain distributed consensus algorithms' }]
});

// 2. Background Queue Execution with Strict FIFO Grouping & SSE Progress
const task = await galx.chat.completions.createAsync({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Batch evaluation task' }],
  queue: 'llm-batch',
  groupId: 'conversation_99'
});

for await (const progress of task.streamProgress()) {
  console.log(`[Progress ${progress.percentage}%]: ${progress.message}`);
}
// 3. Fluent Method-Chaining Builder
const response = await galx.chat
  .builder('gpt-5.6-sol')
  .system('You are an expert system architect.')
  .user('Explain Raft consensus.')
  .temperature(0.2)
  .execute();

// 4. Strongly-Typed Structured Outputs (Zod / JSON Schema)
const invoice = await galx.chat.structured({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Invoice #1024 total $450.50' }],
  schema: {
    type: 'object',
    properties: {
      invoiceId: { type: 'string' },
      totalUsd: { type: 'number' }
    },
    required: ['invoiceId', 'totalUsd']
  }
});

// 5. Vercel AI SDK Protocol Adapter for Next.js App Router
export async function POST(req: Request) {
  const { messages } = await req.json();
  const stream = await galx.chat.completions.create({
    model: 'gpt-5.6-sol',
    messages,
    stream: true
  });
  return galx.adapters.toDataStreamResponse(stream);
}

// 6. High-Throughput Batch Swarm Concurrency Evaluator
const batchResults = await galx.batch.mapConcurrent(prompts, async (p) => {
  return galx.chat.completions.create({ model: 'gpt-5.6-sol', messages: [{ role: 'user', content: p }] });
}, { concurrency: 20 });

// 7. Autonomous Agent with Multi-Step Function Calling Loop
const agent = galx.agent({
  model: 'gpt-5.6-sol',
  systemPrompt: 'You are a market analyst.',
  tools: {
    getStockQuote: {
      description: 'Get real-time stock quote',
      parameters: { ticker: { type: 'string', required: true } },
      execute: async ({ ticker }) => ({ ticker, price: 135.50, change: '+2.4%' })
    }
  }
});
const agentResult = await agent.run('What is Nvidia stock price?');
console.log(agentResult.text);

// One client/runtime can safely multiplex independent durable sessions.
const alice = agent.startSession();
const bob = agent.startSession();
await Promise.all([
  alice.run('Remember that my deployment is in us-east-1.'),
  bob.run('Remember that my deployment is in eu-west-1.'),
]);
await alice.run('Which region did I choose?'); // only Alice's session history

// Persist alice.export(), then resume it in another process:
const resumed = agent.resumeSession(alice.export());

// A bare run is intentionally stateless and zero-retention.
await agent.run('Classify this one-off input.');

// 8. Pluggable Middleware: Live Dollar Budgeting & In-Memory LRU Caching
import { createCostTrackerPlugin, createLRUCachePlugin } from '@/sdk';

galx.use(createLRUCachePlugin({ maxEntries: 500, ttlMs: 60000 }));
galx.use(createCostTrackerPlugin({
  maxBudgetUsd: 10.00,
  onBudgetExceeded: (usd) => console.warn(`Budget ceiling of $${usd} exceeded!`)
}));

// 9. Multi-Model Fallback Cascade (Auto-Failover on 429/5xx)
const fallbackRes = await galx.chat.fallbackCascade(
  ['gpt-5.6-sol', 'x-ai/grok-4.5', 'gpt-5.6-luna'],
  { messages: [{ role: 'user', content: 'Mission critical prompt' }] }
);
// 10. Supabase PostgreSQL & Cloudflare Zero-Egress Edge Substrate SDK
import { galxDb } from '@/lib/supabase';

// Multi-tenant Wallets & Micro-Metering
const wallet = await galxDb.wallets.getWallet('usr_dev_123');
await galxDb.wallets.drawTokensBatch([
  { userId: 'usr_dev_123', costUsd: 0.00005, description: 'gpt-5.6-sol inference' }
]);

// Edge Cache API (Stale-While-Revalidate)
const models = await galxDb.cache.getOrFetch('models:catalog', async () => {
  return ['gpt-5.6-sol', 'x-ai/grok-4.5'];
}, { ttlMs: 60000 });

// Zero-Egress Cloudflare R2 Multimodal User & Session Asset Ingestion with Progressive LQIP
const asset = await galxDb.assets.uploadUserSessionImage({
  userId: 'usr_dev_123',
  sessionId: 'sess_canvas_01',
  data: Buffer.from('...image_bytes...'),
  contentType: 'image/png',
  prompt: 'Cinematic wide-angle view of a cybernetic space station',
  revisedPrompt: 'A highly detailed rendering of a modular orbital outpost...',
  model: 'openai-gpt-image-2',
  aspectRatio: '16:9',
  size: '1792x1024'
});
// asset.publicUrl -> "https://assets.galx.ai/users/usr_dev_123/sessions/sess_canvas_01/images/img_1788620541677_b68da3a9.png"
// asset.lqipDataUri -> "data:image/svg+xml;utf8,%3Csvg..." (Dynamic SVG blur placeholder)

// Cloudflare Durable Object Multi-Agent Swarm Coordinator
const swarm = galxDb.createSwarmCoordinator('swarm_777', 'Market Research');
swarm.registerAgent('agent_1', 'Researcher');
swarm.setSharedContext('topic', 'Autonomous Agents');

// Multi-Tenant Budget Alerts & Hard Caps
await galxDb.budgets.createBudgetAlert({
  workspaceId: 'ws_uuid',
  thresholdPercentage: 80,
  notificationWebhookUrl: 'https://api.domain.com/alerts'
});

// Autonomous Shard Health Probes & Auto-Drain
await galxDb.health.reportHealthProbesBatch([
  { shardId: 'shard_oai_1', workerId: 'cf_worker_1', latencyMs: 180, statusCode: 200, isSuccess: true }
]);

// 11. BroccoliDB Offline Natural Language Querying & Sub-Microsecond Tables
const cheapVisionModels = galx.models.queryNatural(
  'where supportsVision = true and inputPricePer1M <= 1.0 sort by price asc'
);

const pendingTasks = galx.queues.queryNatural(
  'where state = "pending" and priority > 5 sort by createdAt desc'
);

const hipaaShards = galx.privacy.queryShardsNatural(
  'where hipaaCompliant = true and dataResidency = "eu"'
);

// 12. Privacy Shield Plugin & Zero Data Retention v10.0
import { createPrivacyShieldPlugin } from '@/sdk';

galx.use(createPrivacyShieldPlugin({
  profile: 'maximum_privacy',
  hipaaEnabled: true,
  gdprEnabled: true,
  zdrEnabled: true,
  onPIIDetected: (detectedTypes) => {
    console.log(`[PrivacyShield] Redacted sensitive entities: ${detectedTypes.join(', ')}`);
  }
}));

// 13. SOC 2 Type II Posture & Auditor Evidence Dossier
const posture = galx.compliance.getPostureReport();
const evidenceDossier = galx.compliance.getEvidenceDossier();
console.log(`SOC2 Posture Score: ${posture.overallPostureScore}% (Signed: ${evidenceDossier.cryptographicSignatureSha256})`);
```

---

## 🎨 Frontend Visual Synthesis & Session Media Management

Visual synthesis in GALXAI is built for high-velocity frontend integration. Unlike text completions that stream tiny text chunks, image synthesis yields multi-megabyte lossless assets (1 MB to 4 MB). To eliminate blank screens, layout thrashing, and high bandwidth costs, GALXAI implements:
1. **Always-On VM Relay Execution**: Routes prompts across native ChatGPT Codex WebSockets without failing on REST scope restrictions.
2. **Zero-Egress Cloudflare R2 Session Partitioning**: Automatically mirrors base64 payloads to `https://assets.galx.ai/users/{userId}/sessions/{sessionId}/images/{imageId}.png`.
3. **Dynamic Low-Quality Image Placeholders (LQIP)**: Returns inline, vectorized SVG blur data URIs (`lqip`) directly in the JSON response for instant client rendering.
4. **Session Visual Manifests**: Maintains atomic `manifest.json` aggregations per session for sub-millisecond gallery loading.
5. **Atomic Cascade Purge**: Enables one-click cleanup of all session visual assets across R2.

---

### 1. Production-Grade React 19 / Next.js 15 Client Component (`GalxImageGenerator.tsx`)

This component demonstrates progressive LQIP blur-up, session binding, aspect-ratio container preservation (zero Cumulative Layout Shift), retry handling, and download shortcuts:

```tsx
'use client';

import React, { useState } from 'react';

interface GenerationResult {
  url: string;
  r2_url: string;
  lqip: string;
  asset_id: string;
  revised_prompt?: string;
}

interface ImageGeneratorProps {
  sessionId?: string;
  defaultAspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:2';
  onGenerated?: (result: GenerationResult) => void;
}

export function GalxImageGenerator({
  sessionId = 'session_default',
  defaultAspectRatio = '16:9',
  onGenerated,
}: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState(defaultAspectRatio);
  const [loading, setLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Derive CSS aspect ratio to eliminate layout shift
  const aspectClass = {
    '16:9': 'aspect-[16/9]',
    '9:16': 'aspect-[9/16]',
    '1:1': 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '3:2': 'aspect-[3/2]',
  }[aspectRatio];

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setImageLoaded(false);

    try {
      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-galx-session-id': sessionId,
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio,
          model: 'openai-gpt-image-2',
          sessionId,
        }),
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.error?.message || `HTTP ${response.status}: Failed to generate`);
      }

      const json = await response.json();
      const generated = json.data[0];
      setResult(generated);
      onGenerated?.(generated);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-2xl">
      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Visual Synthesis Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your scene in rich detail (e.g. Cyberpunk metropolis at dusk with neon reflections)..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors text-sm placeholder-zinc-500 resize-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Aspect Ratio:</span>
            {(['16:9', '9:16', '1:1', '4:3', '3:2'] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAspectRatio(ratio)}
                className={`px-2.5 py-1 text-xs rounded-lg font-mono transition-all ${
                  aspectRatio === ratio
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            {loading ? 'Synthesizing...' : 'Generate Image'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-3.5 rounded-xl bg-red-950/50 border border-red-800/50 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Visual Canvas with Progressive LQIP Blur-Up */}
      {(loading || result) && (
        <div className={`relative mt-6 w-full ${aspectClass} rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 transition-all`}>
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-20">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-zinc-400 font-mono tracking-wide animate-pulse">
                Synthesizing via Always-On Relay & R2 CDN...
              </p>
            </div>
          )}

          {result && (
            <>
              {/* Layer 1: Instant SVG LQIP Blur Placeholder */}
              <img
                src={result.lqip}
                alt="Loading preview"
                aria-hidden="true"
                className={`absolute inset-0 w-full h-full object-cover filter blur-xl scale-105 transition-opacity duration-700 ${
                  imageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              />

              {/* Layer 2: Sharp R2 CDN Master Image */}
              <img
                src={result.r2_url || result.url}
                alt={result.revised_prompt || prompt}
                onLoad={() => setImageLoaded(true)}
                className={`relative w-full h-full object-cover transition-opacity duration-700 z-10 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Overlay Metadata & Action Bar */}
              {imageLoaded && (
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-20 flex items-center justify-between text-xs text-zinc-200">
                  <span className="font-mono text-[11px] truncate max-w-md">
                    {result.asset_id}
                  </span>
                  <a
                    href={result.r2_url || result.url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur text-white transition-colors"
                  >
                    Open Lossless PNG ↗
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

---

### 2. Next.js 15 Backend Route Handler (`app/api/images/generate/route.ts`)

Proxy client requests safely while preserving session context and adding idempotency:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = req.headers.get('x-galx-session-id') || body.sessionId || 'session_default';
    const idempotencyKey = req.headers.get('idempotency-key') || crypto.randomUUID();

    // Call GALXAI Visual Synthesis Gateway
    const response = await fetch('https://api.galx.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GALXAI_API_KEY}`,
        'x-galx-session-id': sessionId,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        model: body.model || 'openai-gpt-image-2',
        prompt: body.prompt,
        aspect_ratio: body.aspect_ratio || '16:9',
        quality: body.quality || 'hd',
        sessionId,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Internal Server Error' } },
      { status: 500 }
    );
  }
}
```

---

### 3. Next.js 15 Server Action Alternative (`actions/generate-image.ts`)

If you prefer Server Actions over Route Handlers:

```typescript
'use server';

export async function generateImageAction(formData: {
  prompt: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:2';
  sessionId?: string;
}) {
  const apiKey = process.env.GALXAI_API_KEY;
  if (!apiKey) throw new Error('Missing GALXAI_API_KEY');

  const sessionId = formData.sessionId || 'session_default';

  const res = await fetch('https://api.galx.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'x-galx-session-id': sessionId,
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      model: 'openai-gpt-image-2',
      prompt: formData.prompt,
      aspect_ratio: formData.aspectRatio || '16:9',
      quality: 'hd',
      sessionId,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  return res.json();
}
```

---

### 4. Official OpenAI SDK Drop-In (Browser or Server)

If your application already uses the standard `openai` npm package:

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://api.galx.ai/v1',
  apiKey: process.env.GALXAI_API_KEY,
  defaultHeaders: {
    'x-galx-session-id': 'session_interactive_42',
  },
});

// Standard OpenAI visual synthesis call:
const response = await client.images.generate({
  model: 'openai-gpt-image-2',
  prompt: 'A hyperrealistic mechanical clockwork humming bird',
  // @ts-ignore - GALXAI accepts declarative aspect_ratio or standard size
  aspect_ratio: '16:9',
  quality: 'hd',
});

// Access permanent R2 CDN URL & instant LQIP blur placeholder:
const image = response.data[0];
console.log('CDN URL:', image.url);
console.log('Permanent R2:', (image as any).r2_url);
console.log('SVG LQIP:', (image as any).lqip);
```

---

### 5. Session Visual Gallery React Component (`GalxSessionGallery.tsx`)

Display all visual media generated during a multi-turn conversation or agent task:

```tsx
'use client';

import React, { useEffect, useState } from 'react';

interface SessionImageItem {
  assetId: string;
  key: string;
  publicUrl: string;
  sizeBytes: number;
  contentType: string;
  lqipDataUri?: string;
  createdAtMs?: number;
}

interface SessionManifest {
  sessionId: string;
  userId: string;
  totalImages: number;
  totalBytes: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export function GalxSessionGallery({ sessionId }: { sessionId: string }) {
  const [images, setImages] = useState<SessionImageItem[]>([]);
  const [manifest, setManifest] = useState<SessionManifest | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadGallery() {
    setLoading(true);
    try {
      const res = await fetch(`/v1/images/sessions/${sessionId}`);
      if (res.ok) {
        const json = await res.json();
        setImages(json.data || []);
        setManifest(json.manifest || null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sessionId) loadGallery();
  }, [sessionId]);

  if (loading) {
    return <div className="p-4 text-xs font-mono text-zinc-500 animate-pulse">Loading session gallery...</div>;
  }

  if (images.length === 0) {
    return <div className="p-4 text-xs text-zinc-500">No images generated in this session yet.</div>;
  }

  const totalMb = manifest ? (manifest.totalBytes / (1024 * 1024)).toFixed(2) : '0';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800 pb-2">
        <span>Session Gallery ({manifest?.totalImages || images.length} assets · {totalMb} MB)</span>
        <button onClick={loadGallery} className="hover:text-zinc-200">Refresh ↻</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((img) => (
          <div key={img.assetId} className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
            {img.lqipDataUri && (
              <img
                src={img.lqipDataUri}
                alt=""
                className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-105"
              />
            )}
            <img
              src={img.publicUrl}
              alt=""
              loading="lazy"
              className="relative w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 z-10"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
              <a
                href={img.publicUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="px-2.5 py-1 text-xs bg-white/20 hover:bg-white/30 rounded-lg text-white"
              >
                Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 6. Atomic Cascade Purge Component (`PurgeSessionMediaButton.tsx`)

Delete all session assets from Cloudflare R2 with instant feedback:

```tsx
'use client';

import React, { useState } from 'react';

export function PurgeSessionMediaButton({
  sessionId,
  onPurged,
}: {
  sessionId: string;
  onPurged?: () => void;
}) {
  const [purging, setPurging] = useState(false);

  async function handlePurge() {
    if (!confirm('Are you sure you want to permanently delete all images in this session?')) return;

    setPurging(true);
    try {
      const res = await fetch(`/v1/images/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onPurged?.();
      }
    } finally {
      setPurging(false);
    }
  }

  return (
    <button
      onClick={handlePurge}
      disabled={purging}
      className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 text-xs font-medium transition-colors disabled:opacity-50"
    >
      {purging ? 'Purging...' : 'Purge Session Media'}
    </button>
  );
}
```

---

## 🛠️ Interactive Developer CLI

Run instant zero-install diagnostics directly against the gateway:

```bash
# Run full substrate health audit & latency benchmarks
npx galxai doctor

# Fast ping test
npx galxai ping

# List supported models and context windows
npx galxai models

# Stream real-time terminal completions with token velocity (tokens/sec)
npx galxai chat gpt-5.6-sol "Explain the Raft consensus algorithm concisely."
```

---

## 🛡️ Workspace Authentication & Route Protection Guidelines

All internal, stateful, and developer management pages in GALXAI must implement the **Universal Developer Authentication Perimeter (ADR 0036)**:
- Wrap private views in `<AuthRequiredGate title="..." description="..." checkoutAmount={...}>`.
- Never expose unauthenticated chat textareas or guest passes that could trigger upstream quota consumption.
- Guide unauthenticated visitors through the dual Developer Connect (`/auth/connect`) or Prepay Compute (`/checkout`) conversion funnels.

---

## 🌐 Two-Tier Authentication & Sharding Isolation Model

When building UI or backend features in GALXAI, adhere to the strict two-tier identity isolation boundary:

1. **Frontend Layer (Platform User Identity)**:
   - Always use `@/contexts/AuthContext` (`useAuth()`), backed by standard Supabase Auth (`@supabase/ssr`).
   - The user interacts via standard 1-click OAuth (GitHub, Google) or Email Magic Link.
   - Never surface shard IDs, token pooling, or provider credentials to UI end-users.

2. **Backend Infrastructure Layer (Substrate Sharding)**:
   - Lives entirely within `src/core/` and `/api/auth/ingest`.
   - Ingests upstream provider credentials using RFC 9530 SHA-256 digests (`crypto.timingSafeEqual`) and IETF `Idempotency-Key` headers.
   - Operates completely autonomously to route upstream model queries.

---

---

## 🥦 BroccoliDB Compaction Engine Contributing Guidelines

When contributing to BroccoliDB data compaction, streaming deduplication, or domain spend optimization:

1. **Single Public Boundary**:
   - Application code, API routes, and external consumers must **only** import `BroccoliCompactionFacade` from `@/core/broccolidb`.
   - Never import individual domain compactor classes (`BroccoliInterrogatoryCompactor`, `BroccoliPathologyCompactor`, etc.) directly into route handlers or UI components.
2. **Barrel Cleanliness**:
   - Never re-export generated domain compactors in `src/core/broccolidb/index.ts`. All 180 domain compactors are private implementation details dispatched internally by `BroccoliDomainSpendOptimizer`.
3. **Fail-Closed Provenance Gate**:
   - All domain compactions must be verified against the source text by `BroccoliCompactionSafety.verify()`.
   - If any number, date, currency, percentage, or identifier cannot be grounded in the source text, the compactor must fail closed and return the unmodified source text (`fidelityStatus: 'fallback'`).
4. **Input Size Bounding**:
   - Always enforce defensive size limits (`BroccoliCompactionFacade.MAX_TEXT_LENGTH = 2,000,000` chars, `MAX_PAYLOAD_BYTES = 10MB`, `MAX_BATCH_FRAMES = 10,000`).
5. **Onboarding Reference**:
   - Read [BROCCOLIDB_COMPACTION_ONBOARDING_GUIDE.md](BROCCOLIDB_COMPACTION_ONBOARDING_GUIDE.md) for full mental model diagrams and runbooks.

---

## 🧪 Testing & Verification Standards

GALXAI maintains dedicated forensic test runners:

```bash
# 1. Complete Pre-Deployment Quality & Build Pipeline (Audit + Lint + SSG Build)
npm run deploy:check

# 2. BroccoliDB Empirical Inference Boundary Benchmark (OpenAI Models)
# 0. Maintainer Workstation 8-Point Onboarding Diagnostic (<5s)
npm run onboard

# 1. Install Pre-Commit (tsc) & Commit-Msg (Conventional Commits) Hooks
npm run hooks:install

# 2. Interactive Maintainer Compactor Scaffolder CLI
npm run scaffold:compactor -- --name=MyDomain --cluster=Healthcare

# 3. Adversarial Institutional Entropy & Action Safety Benchmark (7-Tier Gradient)
npm run bench:entropy

# 4. BroccoliDB Empirical Inference Boundary Benchmark (OpenAI Models)
npm run bench:inference-boundary

# 5. Compaction Facade & HTTP API Gateway Suite (19 modes, 7 test suites)
npm run test:broccolidb:api

# 6. BroccoliDB Production Hardening & Provenance Regressions
npm run test:broccolidb:hardening

# 7. Master 180-Domain Compactor Cluster Suite (100% Verified)
npm run bench:180-domains


# 7. 8-Phase Enterprise Vercel Pre-Flight Readiness Engine
npm run vercel:verify

# 8. 12-Point Post-Deployment Live Smoke Probes
npm run vercel:smoke -- --url=https://galx.ai

# 9. Vercel Secret Synchronizer
npm run vercel:env:print   # Masked preview
npm run vercel:env:sync    # Push to project

# 10. Universal Zero-Hesitation Ergonomics & Mental Model Suite (98 automated tests)
npx tsx scripts/verify-zero-hesitation-ergonomics.ts

# 11. Universal Router, Privacy, SOC2, BroccoliDB, Ingestion Transport & API Strategy Suite (218 forensic tests)
npm run test:router

# 12. 8-Stage Operational Lifecycle Diagnostics Playbook
npm run playbook

# 13. Supabase Paranoid PostgreSQL Schema & RLS Auditor
npm run db:verify

# 14. Cloudflare Edge Mesh Verification Suite (46 edge tests)
npm run worker:test

# 15. Real End-to-End Inference Pipeline (100% Wire Execution & Output Generation)
npm run test:inference

# 16. SDK -> Cloudflare Edge Live Smoke Test
npx tsx scripts/test-sdk-edge.ts

# 17. TypeScript Type-Check & ESLint 9 Flat Config
npm run lint

# 18. Full Production Build (300 SSG Pages)
npm run build

```

When contributing code changes, ensure all test suites pass with 0 errors.
