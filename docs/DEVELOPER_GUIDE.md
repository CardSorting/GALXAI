# 🛠️ GALXAI Developer & Contributing Guide

This guide covers the internal codebase structure, architectural layers, how to add new model adapters, and testing standards.

---

## 📁 Repository Structure

```text
GALXAI/
├── docs/                             # Comprehensive Architecture & API Documentation
│   ├── adr/                          # Architecture Decision Records (0001-0054)
│   ├── playbooks/                    # Operational Lifecycle Playbooks (Stages 1-6)
│   ├── ARCHITECTURE.md               # System overview, lifecycle, and security model
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
│   └── TROUBLESHOOTING.md            # Error classification and operational playbooks
├── scripts/
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
│   │   ├── api/                      # Gateway admin, queues, health, run, & pool API routes
│   │   ├── v1/                       # OpenAI & Anthropic-compatible public API routes
│   │   │   ├── chat/completions/     # OpenAI chat completions
│   │   │   ├── messages/             # Anthropic Claude messages
│   │   │   ├── embeddings/           # OpenAI vector embeddings
│   │   │   ├── images/generations/   # Multi-modal image generation
│   │   │   └── models/               # Model discovery
│   │   ├── queues/                   # Requests & Results canvas (1-click agent copy)
│   │   ├── docs/                     # In-app interactive documentation pages
│   │   ├── keys/                     # Developer Gateway Key management
│   │   ├── models/                   # Model explorer and comparator
│   │   ├── playground/               # Interactive real-time test environment
│   │   └── vault/                    # Credential deposit and simulator
│   ├── sdk/                          # Zero-dependency Universal SDK (TypeScript / Python)
│   ├── components/                   # React UI Components
│   ├── core/                         # Pure TypeScript Gateway Engine (zero React dependencies)
│   │   ├── circuit/                  # 4-State Circuit Breaker with Canary Warming
│   │   ├── contracts/                # Core TypeScript contracts and interfaces
│   │   ├── governor/                 # Continuous Token-Bucket Calculus Governor
│   │   ├── pool/                     # Adaptive Hydraulic Headroom (P-AHT) Pool Engine
│   │   ├── router/                   # Universal Model Router & Adapter Pipeline
│   │   │   └── adapters/             # Provider-specific execution adapters (OpenAI, Grok)
│   │   ├── substrate/                # In-memory shard cache & persistent storage bridge
│   │   ├── telemetry/                # Circular Ring Buffer Histogram Metrics Engine
│   │   ├── validator/                # Preflight key format & upstream validator
│   │   └── vault/                    # AES-256-GCM Envelope Encryption with AAD
│   └── lib/                          # Storage helpers and utility functions
└── README.md                         # Project overview and quickstart
```

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

// Zero-Egress Cloudflare R2 Multimodal Asset Ingestion
const asset = await galxDb.assets.uploadAsset({
  data: Buffer.from('...image_bytes...'),
  contentType: 'image/png',
  folder: 'dalle_generations'
});

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

## 🧪 Testing & Verification Standards

GALXAI maintains dedicated forensic test runners:

```bash
# 1. Complete Pre-Deployment Quality & Build Pipeline (Audit + Lint + SSG Build)
npm run deploy:check

# 2. 8-Phase Enterprise Vercel Pre-Flight Readiness Engine
npm run vercel:verify

# 3. 12-Point Post-Deployment Live Smoke Probes
npm run vercel:smoke -- --url=https://galx.ai

# 4. Vercel Secret Synchronizer
npm run vercel:env:print   # Masked preview
npm run vercel:env:sync    # Push to project

# 5. Universal Zero-Hesitation Ergonomics & Mental Model Suite (98 automated tests)
npx tsx scripts/verify-zero-hesitation-ergonomics.ts

# 6. Universal Router, Privacy, SOC2, BroccoliDB, Ingestion Transport & API Strategy Suite (217 forensic tests)
npm run test:router
# (or: npx tsx scripts/validate-galxai-router.ts)

# 7. 6-Stage Operational Lifecycle Diagnostics Playbook
npm run playbook

# 8. Supabase Paranoid PostgreSQL Schema & RLS Auditor
npm run db:verify

# 9. Cloudflare Edge Mesh Verification Suite (46 edge tests)
npm run worker:test
# (or: npx tsx scripts/test-cloudflare-workers.ts)

# 10. SDK -> Cloudflare Edge Live Smoke Test
npx tsx scripts/test-sdk-edge.ts

# 11. TypeScript Type-Check & ESLint 9 Flat Config
npm run lint

# 12. Full Production Build (300 SSG Pages)
npm run build
```

When contributing code changes, ensure all test suites pass with 0 errors.







