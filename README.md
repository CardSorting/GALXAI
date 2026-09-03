# 🌌 GALXAI: The AI Consumption & Acceleration Layer

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/CardSorting/GALXAI)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

> **The fastest path from AI prototype to first dollar.**  
> Compress engineering time, eliminate fragile backend proxies, and get **25%–40% wholesale pricing** on OpenAI models (GPT-5.6 Sol, Terra, Luna & GPT-Image Suites) with **75% prompt caching pass-through**.

---

## 💡 What is GALXAI? (The 10-Second Summary)

Building AI features normally means paying a steep "infrastructure tuition": writing messy backend route proxies to hide API keys, handling loading states, debugging rate limits (HTTP 429), and paying full retail prices.

**GALXAI compresses your time-to-first-dollar with 3 simple connection layers:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. The Declarative UI Way (Zero Backend Routes)                            │
│    Drop native React components (<GalxImage />, <GalxChat />) directly     │
│    into your frontend. No fetch code. No loading state boilerplate.         │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. The 1-Line Drop-In Way (For Existing OpenAI Codebases)                  │
│    Add `import 'galxai/patch'` at the top of your app.                      │
│    All existing OpenAI calls automatically get wholesale pricing & caching. │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. The AI Coding Agent Way (For Cursor, Claude Code, Windsurf, Devin)       │
│    Run `npx galxai skills`. Your AI assistant immediately knows how to      │
│    build everything properly without creating fragile proxy routes.         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ 30-Second Quickstart

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

#### Option B: Turnkey Streaming Chat (`<GalxChat />`)
A complete, streaming multi-turn chat widget in one line of JSX:

```tsx
import { GalxChat } from 'galxai/ui';

export function AssistantModal() {
  return (
    <GalxChat
      model="gpt-5.6-sol"
      placeholder="Ask questions or synthesize ideas..."
      className="h-[500px] w-full"
    />
  );
}
```

#### Option C: Direct Server Action (Zero API routes required)
If you prefer calling functions directly inside Next.js 15:

```tsx
'use client';
import { generateImageAction } from 'galxai/actions';

export function StudioButton() {
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

## 📊 Why Developers Choose GALXAI

| Feature | Raw OpenAI / Retail | GALXAI |
| :--- | :--- | :--- |
| **Pricing** | Full Retail List Price | **25%–40% Wholesale Discount** |
| **Context Window Envelope** | Static / Clamped | **Dynamic 1.05M Frontier Sizing (Zero Clamps)** |
| **Prompt Representation** | Full uncompressed payload | **BroccoliDB Adaptive Selection ($C \to \{\text{ID}(C), T(C)\}$)** |
| **Long-Horizon Memory** | Monolithic lossy summaries | **Hybrid 5-Level Pyramid in RAM (<0.08ms)** |
| **Seat Quota Model** | Static monthly cliffs | **Dual Sliding Windows (5-Hour & Weekly Meters)** |
| **Prompt Caching** | Often absorbed by provider | **100% Pass-Through (75% Rebate)** |
| **Frontend Setup** | Requires manual API proxies | **Drop-in React Components (`<GalxImage />`, `<GalxChat />`)** |
| **API Key Security** | Vulnerable to client leaks | **Server-Only `.env.local` injection** |
| **AI Agent Directives** | Agents hallucinate boilerplate | **1-Line `npx galxai skills` setup** |
| **Rate Limit Stalls** | 429 errors during traffic spikes | **Automatic Sub-1ms Anycast Failover** |

---

## 📚 Documentation & Guides

- 🛡️ **[Maintainers Knowledge Base (20 Manuals)](docs/maintainers/README.md)**: Deep internal architectural blueprints, 30-day onboarding ramp, subsystem matrices, CI specs, outage failovers, and on-call runbooks.
- 🏛️ **[Architecture Decision Records (72 ADRs)](docs/adr/README.md)**: Deep technical specifications from ADR 0001 to ADR 0072 (including Dual Rolling Windows, Hybrid 5-Level Pyramid, and Exact-Owner Chat Persistence).
- 📋 **[Senior Engineering Review: Chat & Rolling Context](docs/SENIOR_ENGINEERING_REVIEW_CHAT_AND_ROLLING_CONTEXT.md)**: Architectural review of Hybrid BroccoliDB (L1) + PostgreSQL (L2) rolling memory, dynamic 1.05M context governor, dual rolling seat quotas, and V44-V53 migrations.
- 🤝 **[Contributing Guide](CONTRIBUTING.md)**: Development workflow, Conventional Commits, and automated git hooks (`npm run hooks:install`).
- 🥦 **[BroccoliDB Compaction Onboarding Guide](docs/BROCCOLIDB_COMPACTION_ONBOARDING_GUIDE.md)**: 19 streaming modes, 180 domain compactors, and the Epistemic Measurement Machinery.
- 📊 **[Empirical Benchmarks & Inference Boundary](docs/BENCHMARKS.md)**: Head-to-head provider boundary tests on OpenAI models with $/success accounting.
- ⚡ **[Quickstart Guide](docs/QUICKSTART.md)**: 30-second integrations for Next.js, React, Node, and Python.
- 🌌 **[Universal Developer Client SDK Guide](docs/DEVELOPER_CLIENT_SDK.md)**: Exhaustive manual for the edge-native TypeScript SDK, touchless 1-line APIs, visual synthesis, streaming diagnostics, BroccoliDB substrate, and offline replay testing.
- 💻 **[SDK Cheatsheet](docs/SDK_CHEATSHEET.md)**: Drop-in code snippets for every major framework.
- ❓ **[Frequently Asked Questions (FAQs)](docs/FAQS.md)**: Zero-hesitation philosophy, model routing, and BroccoliDB economics.
- 🔧 **[Troubleshooting & Operational Playbook](docs/TROUBLESHOOTING.md)**: Error codes, remediation steps, and verification commands.



