# 🌌 GALXAI Universal Developer Client SDK

<!-- docs-scope: domain-reference -->
> **Reading scope:** Subsystem reference retained for its own domain; not re-certified by the federation documentation refactor. Older routing, deployment, compatibility, or performance descriptions do not override the current relay contract. See the [current contract](FEDERATION_STRATEGY.md) and [complete catalog](CATALOG.md).

> Application/SDK scope: these interfaces do not replace the [federation contract](FEDERATION_STRATEGY.md). Model eligibility precedes load; no implicit model substitution occurs in the federation. The [Codex image alias](FEDERATION_STRATEGY.md#explicit-codex-image-tool-compatibility) is opt-in, verified, and provider-managed. Use the [recovery table](RELAY_API_REFERENCE.md#request-recovery) for accepted or uncertain work. Server credentials must never enter browser bundles.

> **Version**: 1.0.0  
> **Runtime Footprint**: Runtime support depends on the imported module and its dependencies
> **Compatibility**: Node.js 18+, Next.js 14/15, Cloudflare Workers, Bun, Deno, Vercel Edge

The **GALXAI Universal Developer Client SDK** provides an enterprise-grade execution layer mirroring the familiar DX patterns of **Stripe**, **OpenAI**, **Anthropic**, **Vercel AI SDK**, and **Pinecone**, unified directly upon GALXAI's proprietary **BroccoliDB** high-performance in-memory database engine.

---

## 📦 Table of Contents

1. [Quickstart & Installation](#-quickstart--installation)
2. [Touchless 1-Line APIs](#-touchless-1-line-apis)
   - [Visual Synthesis (`galx.image`)](#1-touchless-visual-synthesis-galximage)
   - [Model Inspection (`galx.model`)](#2-touchless-model-resolution-galxmodel)
   - [Text Completion (`galx.complete`)](#3-touchless-text-completion-galxcomplete)
   - [Streaming Runner (`galx.stream`)](#4-touchless-streaming-runner-galxstream)
3. [Visual Synthesis Deep Dive](#-visual-synthesis-deep-dive)
   - [Prompt Auto-Sensing](#prompt-auto-sensing)
   - [Inpainting & Mask Edits](#inpainting--mask-edits)
   - [Image Variations](#image-variations)
   - [Real-Time Diffusion Streaming](#real-time-diffusion-progress-streaming)
   - [BroccoliDB Asset Catalog](#broccolidb-asset-history-catalog)
4. [Models & Intelligence](#-models--intelligence)
   - [Side-by-Side Model Comparison](#side-by-side-comparison-matrix)
   - [Optimal Model Recommendation Engine](#optimal-model-recommendation-engine)
5. [Real-Time Streaming Diagnostics](#-real-time-streaming-diagnostics)
   - [TTFT & Throughput (TPS) Metrics](#ttft--tps-metrics)
   - [In-Flight Stream Transformers](#in-flight-stream-transformers)
6. [BroccoliDB Substrate & Persistence](#-broccolidb-substrate--persistence)
   - [Reactive In-Memory Tables](#reactive-in-memory-tables)
   - [Natural Language Querying](#natural-language-queries)
   - [Change-Data-Capture (CDC)](#reactive-cdc-event-subscriptions)
7. [Semantic Caching & Fault Tolerance](#-semantic-caching--fault-tolerance)
   - [Cosine Vector Similarity Caching](#cosine-vector-similarity-prompt-cache)
   - [Route-Isolated Circuit Breakers](#route-isolated-adaptive-circuit-breakers)
   - [Financial Budget Governor](#financial-spend--token-budget-governor)
8. [Checkpoints, Prompts Registry, & Replay Harness](#-checkpoints-prompts--replay-harness)
   - [Timeline Checkpoints & Diffing](#timeline-checkpoints--diffing)
   - [Cryptographic WAL Audit Log](#cryptographic-sha-256-wal-log)
   - [Enterprise Prompts Registry](#enterprise-prompts-registry)
   - [Deterministic Offline Replay Harness](#deterministic-offline-replay-harness)
9. [OpenAI & Anthropic Drop-in Shims](#-openai--anthropic-drop-in-shims)
10. [TypeScript Configuration & Invariants](#-typescript-configuration--invariants)

---

## ⚡ Quickstart & Installation

Install the package or import it directly:

```bash
npm install galxai
# or
pnpm add galxai
# or
bun add galxai
```

### Initialize the Client

```typescript
import { GalxAI, galx } from 'galxai';

// 1. Using the pre-instantiated singleton (auto-reads process.env.GALXAI_API_KEY)
const answer = await galx.complete('Explain distributed consensus in 1 sentence');

// 2. Custom configuration
const client = new GalxAI({
  apiKey: process.env.GALXAI_API_KEY,
  maxRetries: 3,
  timeout: 30000,
  debug: false
});

// 3. Offline Testing / CI Mock Mode
const mockClient = new GalxAI({ mock: true });
```

---

## 🚀 Touchless 1-Line APIs

The touchless APIs eliminate 90% of boilerplate: no configuration objects, no manual dimensions math, and no nested sub-resource navigation.

### 1. Touchless Visual Synthesis (`galx.image`)

Generate, stream, edit, and save images with single function calls, enriched with permanent zero-egress R2 CDN URLs and instant SVG LQIP blur placeholders:

```typescript
import { galx } from 'galxai';

// 1. One-line generation with session partitioning & built-in file saving
const img = await galx.image('A cinematic landscape of the Himalayas in 4k', {
  sessionId: 'session_himalayas_01',
  aspectRatio: '16:9'
});
console.log(img.url);     // Direct public CDN URL: "https://assets.galx.ai/..."
console.log(img.r2_url);  // Permanent Cloudflare R2 bucket reference
console.log(img.lqip);    // Instant dynamic SVG Data-URI blur placeholder
await img.save('./himalayas.png');

// 2. One-line diffusion progress stream
for await (const step of galx.image.stream('A neon cyber samurai')) {
  console.log(`Denoising: ${step.step}/${step.totalSteps} (${step.percentage}%)`);
}

// 3. One-line inpainting edit
const edited = await galx.image.edit('./portrait.png', 'Add cybernetic sunglasses');

// 4. One-line image variation
const variation = await galx.image.variation('./logo.png');
```

### 2. Touchless Model Resolution (`galx.model`)

Inspect, validate, and search models with zero hardcoded strings:

```typescript
import { galx } from 'galxai';

// 1. Platform default flagship frontier reasoning model
const defaultModel = await galx.model();
console.log(defaultModel.id); // 'gpt-5.6-sol'

// 2. Specific model lookup
const gpt = await galx.model('gpt-5.6-sol');

// 3. Check model existence safely
if (await galx.model.has('gpt-5.6-sol')) {
  console.log('Model is ready for requests');
}

// 4. Flat array of available model IDs
const ids = await galx.model.names();

// 5. Keyword search across IDs, names, and providers
const visionModels = await galx.model.search('vision');
```

### 3. Touchless Text Completion (`galx.complete`)

Automatically selects the optimal frontier reasoning model, wraps string prompts, and returns a response that is directly coercible to a string:

```typescript
import { galx } from 'galxai';

const res = await galx.complete('Explain quantum computing in 1 sentence');

// Access text directly
console.log(res.text);

// String interpolation / coercion
console.log(`${res}`);
```

### 4. Touchless Streaming Runner (`galx.stream`)

Takes a prompt string and returns a full `ChatCompletionStream`:

```typescript
import { galx } from 'galxai';

for await (const chunk of galx.stream('Write a haiku about code')) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

---

## 🎨 Visual Synthesis Deep Dive

### Prompt Auto-Sensing

The SDK automatically analyzes natural language prompt keywords to configure aspect ratios and HD quality without requiring explicit size numbers:

| Prompt Keywords | Detected Aspect Ratio | Resulting Resolution |
| :--- | :--- | :--- |
| `portrait`, `vertical`, `reel`, `story`, `phone wallpaper` | `9:16` | `1024x1792` |
| `landscape`, `wallpaper`, `desktop`, `cinematic`, `widescreen` | `16:9` | `1792x1024` |
| `banner`, `ultrawide`, `header` | `21:9` | `1792x768` |
| `avatar`, `icon`, `logo`, `pfp`, `square`, `badge` | `1:1` | `1024x1024` |
| `4k`, `8k`, `photorealistic`, `ultra-detailed`, `high resolution` | — | Automatically sets `quality: 'hd'` |

### Inpainting & Mask Edits

Modify existing imagery with standard image files, buffers, or base64 strings:

```typescript
const edited = await galx.images.edit({
  image: './scene.png',
  mask: './mask.png', // Optional mask layer
  prompt: 'A vintage red convertible parked in front',
  size: '1024x1024'
});
console.log(edited.url);
```

### Image Variations

Generate stylistic variations of any existing asset:

```typescript
const variations = await galx.images.createVariation({
  image: './original_art.png',
  n: 3
});
console.log(variations.urls); // ['https://...', 'https://...', 'https://...']
```

### Real-Time Diffusion Progress Streaming

Monitor progressive denoising iterations before the final asset completes:

```typescript
const stream = galx.images.stream('A steampunk airship flying through storm clouds');

for await (const progress of stream) {
  console.log(`Step ${progress.step}/${progress.totalSteps} (${progress.percentage}%)`);
}

const finalImage = await stream.result();
console.log(`Done! Image URL: ${finalImage.url}`);
```

### BroccoliDB Asset History Catalog

Every generated image is automatically archived in BroccoliDB's in-memory historical catalog with sub-millisecond natural language querying:

```typescript
// Query history with natural language
const landscapes = galx.images.history.queryNatural('where prompt contains landscape');

// List recent generations
const recent = galx.images.history.list({ limit: 10, sortOrder: 'desc' });
```

### Cloudflare R2 User & Session Media Partitioning

Visual assets are saved to deterministic S3-compatible paths: `users/{userId}/sessions/{sessionId}/images/{imageId}.png`, backed by Cloudflare R2 zero-egress public CDN caching (`https://assets.galx.ai/...`):

```typescript
const result = await galx.images.generate({
  model: 'openai-gpt-image-2',
  prompt: 'A futuristic bioluminescent botanical garden',
  aspectRatio: '16:9',
  sessionId: 'session_research_88',
});

console.log(result.data[0].r2_url);     // Permanent CDN URL
console.log(result.data[0].lqip);       // Vectorized SVG Blur Data URI (<300 bytes)
console.log(result.data[0].asset_id);   // e.g. "img_1788620541677_b68da3a9"
```

### Session Media Gallery & Manifest Inspection

Retrieve the aggregate session manifest (`manifest.json`) and chronological image list:

```typescript
// Fetch full session media collection
const gallery = await galx.images.sessions.get('session_research_88');

console.log(`Total Generated: ${gallery.manifest.totalImages}`);
console.log(`Total Bytes: ${(gallery.manifest.totalBytes / 1024 / 1024).toFixed(2)} MB`);

// Map over images in session
for (const asset of gallery.data) {
  console.log(`Asset: ${asset.assetId} -> ${asset.publicUrl}`);
}
```

### Atomic Cascade Session Purge

Purge all visual assets and the session manifest across Cloudflare R2 in a single roundtrip:

```typescript
// Cascade-delete session media
const purgeResult = await galx.images.sessions.delete('session_research_88');
console.log(`Purged ${purgeResult.deleted_count} assets from R2.`);
```

### Frontend Progressive Blur-Up Pattern

Use the inline `lqip` to display an instant, beautiful preview while the full lossless master loads:

```tsx
export function ProgressiveImage({ src, lqip, alt }: { src: string; lqip: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-zinc-950">
      {/* Dynamic SVG LQIP */}
      <img
        src={lqip}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full object-cover filter blur-xl scale-105 transition-opacity duration-700 ${
          loaded ? 'opacity-0' : 'opacity-100'
        }`}
      />
      {/* Full-resolution Master PNG */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`relative w-full h-full object-cover transition-opacity duration-700 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
```

---

## 🧠 Models & Intelligence

### Side-by-Side Comparison Matrix

Compare pricing and specifications between any two models:

```typescript
const comparison = await galx.models.compare('gpt-5.6-sol', 'gpt-5.6-terra');

console.log(`Cheaper Input Model: ${comparison.cheaperInputModel}`);
console.log(`Savings: ${comparison.inputSavingsPercentage}%`);
console.log(`Context Delta: ${comparison.contextWindowDelta} tokens`);
```

### Optimal Model Recommendation Engine

Filter models based on hard compute, latency, and financial constraints:

```typescript
const candidates = await galx.models.optimal({
  minContextWindow: 128000,
  reasoningRequired: true,
  maxCostPer1kInputTokens: 0.005,
  provider: 'openai'
});

console.log(`Recommended: ${candidates[0].id}`);
```

---

## ⏱️ Real-Time Streaming Diagnostics

### TTFT & TPS Metrics

`ChatCompletionStream` automatically records telemetry on first token arrival, tokens per second, and overall duration:

```typescript
const stream = galx.chat.completions.stream({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Explain thermodynamics' }]
});

await stream;

console.log(`TTFT: ${stream.metrics.timeToFirstTokenMs}ms`);
console.log(`Throughput: ${stream.metrics.tokensPerSecond} tokens/sec`);
console.log(`Total Tokens: ${stream.metrics.totalTokens}`);
console.log(`Duration: ${stream.metrics.totalDurationMs}ms`);
```

### In-Flight Stream Transformers

Chain transformation pipelines directly into the streaming pipeline:

```typescript
const stream = galx.chat.completions.stream({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Say hello world' }]
});

// Transform delta tokens in real-time
stream.pipeThrough(token => token.toUpperCase());

stream.on('content', delta => process.stdout.write(delta));
```

---

## 🥦 BroccoliDB Substrate & Persistence

### Reactive In-Memory Tables

All SDK state (telemetry, models, prompt caches, history, audit logs) is stored in high-performance BroccoliDB RAM tables:

```typescript
const table = galx.db.table('customer_context');
table.put('user_123', { tier: 'enterprise', balance: 500 });

const user = table.get('user_123');
```

### Natural Language Queries

Query in-memory tables using intuitive English criteria with sub-0.1ms latency:

```typescript
const enterpriseSpans = galx.telemetry.queryNatural('where status is ERROR and duration > 500');
```

### Reactive CDC Event Subscriptions

Subscribe to mutations across tables with change-data-capture (CDC):

```typescript
const unsubscribe = galx.db.subscribe('image_generation_history', (event) => {
  console.log(`Event: ${event.type} on key: ${event.key}`);
});
```

---

## 🛡️ Semantic Caching & Fault Tolerance

### Cosine Vector Similarity Prompt Cache

Cache responses with `<0.05ms` lookup speeds. Supports exact SHA-256 match and dense vector semantic similarity:

```typescript
// Subsequent calls with similar prompts return cached responses instantly without API billing
const res1 = await galx.complete('How do I reverse a linked list in Python?');
const res2 = await galx.complete('How to reverse a Python linked list?');
// res2 retrieved from BroccoliPromptCache in 0.04ms!
```

### Route-Isolated Adaptive Circuit Breakers

Isolate failures per route with automatic canary probing:

```typescript
// If the image generation endpoint fails, chat completions remain unaffected
client.circuitBreaker.recordFailure('/v1/images/generations');
console.log(client.circuitBreaker.getState('/v1/images/generations')); // 'OPEN'
console.log(client.circuitBreaker.getState('/v1/chat/completions'));   // 'CLOSED'
```

### Financial Spend & Token Budget Governor

Halt rogue agent loops before they incur runaway costs:

```typescript
const safeClient = galx.withBudget({
  maxSpendUsd: 25.00,
  maxTotalTokens: 500000,
  alertThresholdPercent: 80
});

// Statistical rollups
console.log(safeClient.budget.byModel());
console.log(safeClient.budget.byTag('production'));
```

---

## 🏛️ Checkpoints, Prompts & Replay Harness

### Timeline Checkpoints & Diffing

Create point-in-time snapshots and compare schema/data deltas:

```typescript
const cp1 = await galx.checkpoints.create('pre-experiment');
// Run migrations or mutations...
const cp2 = await galx.checkpoints.create('post-experiment');

const delta = await galx.checkpoints.diff(cp1.checkpointId, cp2.checkpointId);
console.log(`Changes: ${delta.tablesDelta.modified.length} tables modified`);

// Tag for fast lookup
galx.checkpoints.tag(cp1.checkpointId, 'stable-release');
```

### Cryptographic SHA-256 WAL Log

Verify audit chain integrity across all state transitions:

```typescript
const isValid = galx.wal.verifyIntegrity();
console.log(`WAL tamper check: ${isValid ? 'VERIFIED' : 'CORRUPTED'}`);

const jsonlExport = galx.wal.exportJsonl();
```

### Enterprise Prompts Registry

Manage templates, semantic versioning, and variable interpolation:

```typescript
galx.prompts.create({
  name: 'code_reviewer',
  version: '1.0.0',
  template: 'Review the following {{language}} code:\n```{{code}}```',
  defaultVariables: { language: 'typescript' }
});

const rendered = galx.prompts.render('code_reviewer', { code: 'const x = 10;' });
```

### Deterministic Offline Replay Harness

Record interactive LLM sessions into fixtures and replay them in CI/CD without network requests:

```typescript
// Record phase
galx.replay.startRecording('checkout_flow');
await runIntegrationTest();
galx.replay.stopRecording();

// Replay phase (runs in <0.01ms offline!)
galx.replay.startReplay('checkout_flow');
await runIntegrationTest();
galx.replay.stopReplay();
```

---

## 🔄 OpenAI & Anthropic Drop-in Shims

Migrate from existing SDKs without rewriting API calls:

### OpenAI Drop-in

```typescript
import { OpenAI } from 'galxai';

const openai = new OpenAI();
const completion = await openai.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

### Anthropic Drop-in

```typescript
import { Anthropic } from 'galxai';

const anthropic = new Anthropic();
const message = await anthropic.messages.create({
  model: 'gpt-5.6-sol',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

---

## 🧪 Testing & Verification

The SDK includes a comprehensive 54-test automated verification suite:

```bash
# Run complete test suite
npx tsx tests/sdk/client-sdk.test.ts

# Run strict TypeScript verification
npx tsc --noEmit
```

---

## 📄 License

MIT © [GALXAI Inc.](https://galxai.dev)
