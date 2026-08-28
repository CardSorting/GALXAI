# 🚀 GALXAI Quickstart: The 30-Second Guide

Add AI capabilities to your project in under 30 seconds with **wholesale rates (25%–40% off)**, **zero backend proxy wiring**, and **zero user-facing API key modals**.

---

## ⚡ The 3 Simple Ways to Connect

```
┌────────────────────────────────────────────────────────┐
│ 1. React / Next.js -> Drop in <GalxImage /> & <GalxChat />
│ 2. Existing Code   -> Add `import 'galxai/patch'`
│ 3. AI Coding Agent -> Run `npx galxai skills`
└────────────────────────────────────────────────────────┘
```

---

## 🔑 1. Setup Your Secret Key (Server Only)

Put your API key in `.env.local` in your project root:

```bash
# .env.local
GALXAI_API_KEY=galx_live_your_key_here
```

> 🔒 **Security Guarantee**: Your users are never asked for an API key. Everything is handled securely by the backend and server actions.

---

## 🖼️ 2. React & Next.js (Zero-Boilerplate)

### A. Declarative Image Generator (`<GalxImage />`)
Renders an image with automatic aspect ratios, loading placeholders, and live hover remixing:

```tsx
import { GalxImage } from 'galxai/ui';

export function Hero() {
  return (
    <GalxImage
      prompt="Cyberpunk metropolis at dusk"
      aspectRatio="16:9"
      interactive
      className="w-full h-96 rounded-2xl shadow-xl"
    />
  );
}
```

### B. Streaming Chat Box (`<GalxChat />`)
A complete multi-turn streaming chat interface in one line of JSX:

```tsx
import { GalxChat } from 'galxai/ui';

export function ChatAssistant() {
  return (
    <GalxChat
      model="gpt-5.6-sol"
      placeholder="Ask anything..."
      className="h-[500px]"
    />
  );
}
```

### C. Direct Next.js 15 Server Action
Invoke AI functions directly from your client components with **zero route files**:

```tsx
'use client';
import { generateImageAction } from 'galxai/actions';

export function Button() {
  return (
    <button onClick={async () => {
      const res = await generateImageAction('Neon avatar', { aspectRatio: '1:1' });
      console.log(res.data[0].url);
    }}>
      Synthesize
    </button>
  );
}
```

---

## 🤖 3. AI Coding Agents (Cursor, Claude Code, Windsurf)

If you use AI coding assistants to build software, run this command in your project:

```bash
npx galxai skills
```

This generates `.cursorrules`, `CLAUDE.md`, and `AGENTS.md` with complete architectural instructions so your agent builds flawless GALXAI integrations.

---

## 🔄 4. Upgrading Existing OpenAI Code (1-Line Patch)

If your app already uses the official `openai` SDK:

```typescript
// Add at the top of your layout.tsx or index.ts:
import 'galxai/patch';

// Existing OpenAI calls now run through GALXAI at wholesale prices automatically:
import OpenAI from 'openai';
const openai = new OpenAI();
```

---

## 🐍 5. Python (OpenAI SDK Drop-In)

```python
from openai import OpenAI
import os

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key=os.environ.get("GALXAI_API_KEY")
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Explain zero-hesitation architecture"}]
)
print(response.choices[0].message.content)
```

---

## 💻 6. Zero-Install CLI (`npx galxai`)

```bash
# 1. Run prompt in terminal
npx galxai "Explain token bucket rate limiting in 10 words"

# 2. Generate image
npx galxai image "Cyberpunk city at midnight" --ratio 16:9

# 3. Check health and latency
npx galxai doctor
```

---

## 🥦 7. Dynamic Representation Selection with BroccoliDB

Evaluate and optimize incoming context with automatic density bypass and institutional noise pruning:

```typescript
import { BroccoliCompactionFacade } from '@/core/broccolidb';

// Adaptive representation selection:
// - Clean prompts (<200 tokens) bypass compaction (0% dilation overhead, 100% baseline preservation)
// - Noisy prompts/incident streams are compacted up to 92.1% with fail-closed provenance validation
const selection = BroccoliCompactionFacade.selectRepresentation({
  text: rawContextText,
  taskType: 'architecture_invariants',
  tokenBudget: 1024,
});

console.log(selection.selectedRepresentation); // Actionable, task-relevant context
```

To run empirical benchmarks:
```bash
# 1. 8-Point maintainer workstation diagnostic (<5s)
npm run onboard

# 2. 7-Tier progressive institutional entropy benchmark
npm run bench:entropy

# 3. OpenAI billed dollar empirical benchmark
npm run bench:inference-boundary
```


