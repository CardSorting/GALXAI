# 🌌 GALXAI: The AI Consumption & Acceleration Layer

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)

GALXAI provides inference APIs, SDK integrations, model discovery, and operational controls for applications and agents. The application, Cloudflare Worker, and standalone relay are separate runtimes with distinct deployment and authentication boundaries.

The relay federation preserves **one active shard = one isolated relay container**. It checks fresh model capability before balancing load. See the [current contract](docs/FEDERATION_STRATEGY.md), [operator runbook](docs/RELAY_VNEXT_RUNBOOK.md), and [complete documentation catalog](docs/CATALOG.md).

The existing generic Codex image-tool route is an explicit, verified compatibility alias for `openai-gpt-image-2` on enabled OAuth workers. It uses provider-managed image selection and does not guarantee exact GPT-Image-2 or exact output dimensions. Native API-key execution remains exact. [ADR 0127](docs/adr/0127-codex-image-tool-alias-production-cutover.md) records the production cutover and actual DreamBees image verification; paid Hive remained disabled.

---

## 💡 What is GALXAI? (The 10-Second Summary)

Building AI features normally means paying a steep "infrastructure tuition": writing messy backend route proxies to hide API keys, handling loading states, debugging rate limits (HTTP 429), and paying full retail prices.

**GALXAI compresses your time-to-first-dollar with 3 simple connection layers:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. The Native SDK Way (OpenAI-Compatible Inference)                        │
│    Point the OpenAI SDK at GALXAI for explicit-model inference and application integration.       │
│    Keep application UI and inference infrastructure cleanly separated.      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. The 1-Line Drop-In Way (For Existing OpenAI Codebases)                  │
│    Add `import 'galxai/patch'` at the top of your app.                      │
│    Existing OpenAI calls use the configured GALXAI integration. │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. The AI Coding Agent Way (For Cursor, Claude Code, Windsurf, Devin)       │
│    Run `npx galxai skills`. Your AI assistant immediately knows how to      │
│    build everything properly without creating fragile proxy routes.         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Product surface boundary

GALXAI is an inference platform, not a hosted chat or image-studio application. After authentication, developers land on `/models` to choose from the canonical model fleet by workload type, inspect model IDs and economics, and continue to API-key or integration setup. Chat and image generation remain available through the OpenAI-compatible APIs and SDKs for applications that developers build and own.

See the [Product Surface Strategy](docs/PRODUCT_SURFACE_STRATEGY.md) for the hosted-surface boundary, diagnostic rules, activation journey, and roadmap decision test.

---

## ⚡ 30-Second Quickstart

Use **`https://galx.ai/v1`** as the API base URL. The `api.galx.ai` Cloudflare Worker is a separate deployment, not an interchangeable alias. See [API base URL](docs/API_BASE_URL.md).

### Step 1: Add your key in `.env.local`
You only put the API key on your server. Your users will **never** be asked for an API key:
```bash
# .env.local
GALXAI_API_KEY=galx_live_your_key_here
```

---

### Step 2: Use it in your React / Next.js app

#### Option A: Declarative Image Generator (`<GalxImage />`)
Drop the component directly into your page. It handles aspect ratios, loading spinners, hover remixing, and error fallbacks automatically:

```tsx
import { GalxImage } from 'galxai/ui';

export function HeroBanner() {
  return (
    <GalxImage
      prompt="Cyberpunk neon skyline at dusk"
      aspectRatio="16:9"
      interactive
      className="w-full h-96 rounded-2xl shadow-xl"
    />
  );
}
```

#### Option B: Direct Server Action (Zero API routes required)
If you prefer calling functions directly inside Next.js 15:

```tsx
'use client';
import { generateImageAction } from 'galxai/actions';

export function GenerateArtworkButton() {
  return (
    <button onClick={async () => {
      const res = await generateImageAction('Cyberpunk bee mascot', { aspectRatio: '1:1' });
      console.log(res.data[0].url);
    }}>
      Generate
    </button>
  );
}
```

---

## 🤖 Using AI Coding Agents? (Cursor, Claude Code, Windsurf)

If you're using an AI coding assistant to build your app, run this command in your project:

```bash
npx galxai skills
```

> **What this does**: Automatically writes `.cursorrules`, `CLAUDE.md`, and `AGENTS.md` so your AI assistant knows all rules and won't accidentally build clumsy backend proxies or prompt users for API keys.

---

## 🔄 Upgrading an Existing OpenAI App? (Zero Code Changes)

If you already have a codebase using the official `openai` SDK, you don't need to rewrite anything. Just add this one import at the top of your project:

```typescript
// Add at the top of index.ts, layout.tsx, or server.ts:
import 'galxai/patch';

// Your existing OpenAI code is now automatically routed to GALXAI with wholesale pricing!
import OpenAI from 'openai';
const openai = new OpenAI();
const response = await openai.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Explain zero-hesitation architecture' }]
});
```

---

## 💻 Terminal CLI & Developer Tools

You can test models, check latency, or estimate token costs directly from your terminal with **no installation needed**:

```bash
# 1. Run prompt in terminal
npx galxai "Explain token bucket rate limiting in 10 words"

# 2. Generate image in terminal
npx galxai image "Cyberpunk city at midnight" --ratio 16:9

# 3. Health & connectivity check
npx galxai doctor

# 4. Eject UI components into your project (like shadcn)
npx galxai add image
```

---

## 🥦 BroccoliDB Context Representation Layer & Empirical Boundaries

GALXAI embeds **BroccoliDB**, an adaptive representation-selection substrate that evaluates incoming context $C \to \{ \text{ID}(C), T(C) \}$:
- **Identity Bypass ($\text{ID}(C)$)**: When context is already dense and clean ($<200$ tokens), compaction is bypassed entirely ($0.0\%$ dilation overhead, $100\%$ baseline preservation).
- **Transformation Regime ($T(C)$)**: For institutionally noisy codebases, multi-thousand-page incident logs, or high-velocity streams (180 domains, eBPF, K8s watch), it strips ceremonial redundancy while defending active invariants under strict fail-closed safety gates.
- **Hybrid Rolling Memory Mesh (5-Level Pyramid)**: Structures long-horizon conversational turns in L1 BroccoliDB RAM (`<0.08ms`) coupled with durable PostgreSQL CTEs and dynamic 1,050,000 frontier token window scaling.

```typescript
import { BroccoliCompactionFacade } from '@/core/broccolidb';

// Adaptive representation selection with fail-closed provenance validation
const selection = BroccoliCompactionFacade.selectRepresentation({
  text: rawContext,
  taskType: 'architecture_invariants',
  tokenBudget: 1024,
});
```

### Empirical Test Suites

```bash
# 1. Maintainer Workstation Onboarding Diagnostics (8 Invariant Checks)
npm run onboard

# 2. Adversarial Institutional Entropy & Action Safety Benchmark (7-Tier Gradient)
npm run bench:entropy

# 3. Empirical Inference Boundary Benchmark across OpenAI Models (Blinded A/B)
npm run bench:inference-boundary

# 4. Chat Context Hardening & Tool Invariant Test Suite
npx tsx scripts/test-chat-context-hardening.ts

# 5. Paranoid Database Integrity & 53-Migration Linter
npm run db:verify

# 6. Live Supabase 92-Test Zero-Egress Database Integration Suite
npm run db:test
```

---

## Documentation

- [Documentation catalog](docs/README.md)
- [Architecture and runtime boundaries](docs/ARCHITECTURE.md)
- [Architecture decision records](docs/adr/README.md)
- [Relay setup, deployment, and rollback](docs/VM_RELAY_DEPLOYMENT_AND_WEBSOCKET_TIMEOUT_STRATEGY.md)
- [Standalone relay API](docs/RELAY_API_REFERENCE.md)
- [Product API reference](docs/API_REFERENCE.md)
- [External agent integration](docs/LUMI.md)
- [Inference verification](docs/INFERENCE_PIPELINE_VERIFICATION.md)
- [Maintainer guides](docs/maintainers/README.md)
- [Quickstart](docs/QUICKSTART.md)
- [Contributing](CONTRIBUTING.md)

Pricing, provider capacity, and latency depend on the configured service and workload. Benchmark results are scoped observations, not universal production guarantees.
