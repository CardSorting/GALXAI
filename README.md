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

## 📊 Why Developers Choose GALXAI

| Feature | Raw OpenAI / Retail | GALXAI |
| :--- | :--- | :--- |
| **Pricing** | Full Retail List Price | **25%–40% Wholesale Discount** |
| **Prompt Caching** | Often absorbed by provider | **100% Pass-Through (75% Rebate)** |
| **Frontend Setup** | Requires manual API proxies | **Drop-in React Components (`<GalxImage />`)** |
| **API Key Security** | Vulnerable to client leaks | **Server-Only `.env.local` injection** |
| **AI Agent Directives** | Agents hallucinate boilerplate | **1-Line `npx galxai skills` setup** |
| **Rate Limit Stalls** | 429 errors during traffic spikes | **Automatic Sub-1ms Anycast Failover** |

---

## 📚 Documentation & Guides

- 📋 **[Engineering Handover & Strategy Review](HANDOVER.md)**: Architectural review document, commercial thesis, and open design trade-offs for reviewing engineers.
- 🔍 **[Enterprise Spend Forensic & Governance Hub](https://galx.ai/audit)**: Reverse-audit live OpenAI traffic, detect prompt cache collisions, and stop wasteful spend.
- 🧮 **[Universal AI ROI & Velocity Calculator](https://galx.ai/calculator)**: Simulate token savings, prompt caching rebates, and engineering tuition avoided.
- 🎯 **[Commercial Thesis & Discovery Playbook](docs/investors/08_COMMERCIAL_THESIS_AND_DISCOVERY_PLAYBOOK.md)**: ICP segmentation matrix, procurement psychology, and discovery script.
- 🏛️ **[Enterprise Spend Governance Whitepaper](docs/investors/09_ENTERPRISE_SPEND_GOVERNANCE_AND_CONTROL_PLANE.md)**: "Why is our AI bill so high and how do we make it stop?"
- 🤖 **[Agent Directives & Skills Hub](https://galx.ai/agents)**: Full prompt templates and directives for AI coding agents.
- ⚡ **[Quickstart Guide](docs/QUICKSTART.md)**: 30-second integrations for Next.js, React, Node, and Python.
- 💻 **[SDK Cheatsheet](docs/SDK_CHEATSHEET.md)**: Drop-in code snippets for every major framework.
- 🏛️ **[Architecture Decision Records](docs/adr/README.md)**: Deep technical specifications and ADR 0055.
