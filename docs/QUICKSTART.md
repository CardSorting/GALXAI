# 🚀 GALXAI Quickstart: The 30-Second Guide

Add AI capabilities to your project in under 30 seconds with **wholesale rates (25%–40% off)**, **zero backend proxy wiring**, and **zero user-facing API key modals**.

---

## ⚡ The 3 Simple Ways to Connect

```
┌────────────────────────────────────────────────────────┐
│ 1. React / Next.js -> Use the SDK or <GalxImage />
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

## 🖼️ 2. React & Next.js Visual Synthesis (Progressive Blur-Up & Session Partitioning)

GALXAI serves images directly from Cloudflare R2 (`https://assets.galx.ai/...`) partitioned by user and session, accompanied by an inline, dynamic SVG Data-URI blur placeholder (`lqip`) to guarantee zero layout shift and instant visual feedback.

### A. Next.js 15 Client Component with Progressive Blur-Up (`ImageCard.tsx`)

```tsx
'use client';

import { useState } from 'react';

export function ImageCard({ prompt, sessionId = 'session_quickstart' }: { prompt: string; sessionId?: string }) {
  const [data, setData] = useState<{ url: string; lqip: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setLoaded(false);
    try {
      const res = await fetch('https://galx.ai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GALXAI_KEY || 'galx_live_...'}`,
          'x-galx-session-id': sessionId,
        },
        body: JSON.stringify({
          model: 'openai-gpt-image-2',
          prompt,
          aspect_ratio: '16:9',
          sessionId,
        }),
      });
      const json = await res.json();
      setData(json.data[0]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-medium transition-colors"
      >
        {loading ? 'Synthesizing...' : 'Synthesize Scene'}
      </button>

      {data && (
        <div className="relative aspect-[16/9] w-full max-w-xl rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
          {/* 1. Dynamic SVG LQIP Blur Placeholder */}
          <img
            src={data.lqip}
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 w-full h-full object-cover filter blur-lg scale-105 transition-opacity duration-500 ${
              loaded ? 'opacity-0' : 'opacity-100'
            }`}
          />

          {/* 2. Permanent R2 CDN Master Image */}
          <img
            src={data.url}
            alt={prompt}
            onLoad={() => setLoaded(true)}
            className={`relative w-full h-full object-cover transition-opacity duration-500 z-10 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      )}
    </div>
  );
}
```

### B. Session Media Gallery Query (`GET /v1/images/sessions/:sessionId`)

Fetch all images created in a session alongside the auto-updating `manifest.json`:

```typescript
const res = await fetch(`https://galx.ai/v1/images/sessions/${sessionId}`, {
  headers: { 'Authorization': `Bearer ${process.env.GALXAI_API_KEY}` }
});
const { data, manifest } = await res.json();
console.log(`Total images: ${manifest.totalImages}, Size: ${manifest.totalBytes} bytes`);
// data[0].publicUrl -> "https://assets.galx.ai/users/.../images/...png"
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

---

## ⚡ 8. High-Velocity Multi-Page Document Ingestion & Rolling Memory

Attach multi-hundred-page documents, code diff manifests, or long transcripts with **zero artificial clamping**:

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://galx.ai/v1',
  apiKey: process.env.GALXAI_API_KEY,
  defaultHeaders: {
    'x-galx-rolling-memory': 'true', // Activates 5-Level Memory Pyramid in RAM
    'x-galx-workspace-id': 'ws_acme_core',
  },
});

// Stream conversation with dynamic 1.05M frontier token window
const stream = await client.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [
    { role: 'system', content: 'You are the lead architect reviewing system logs.' },
    { role: 'user', content: `Analyze this 500-page infrastructure log dump:\n${largeLogData}` },
  ],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

---

## ⏱️ 9. Inspecting Live Dual Rolling Seat Quotas

Check live 5-hour and weekly capacity meters with human-readable refresh timers:

```typescript
import { GalxSeatTierEngine } from '@/core/subscription/GalxSeatTierEngine';

const seatEngine = GalxSeatTierEngine.getInstance();
const telemetry = await seatEngine.getRollingSeatTelemetry('user_123');

console.log(`5-Hour Limit Remaining: ${telemetry.fiveHourLimitRemainingPct}%`);
console.log(`5-Hour Refresh Status: ${telemetry.fiveHourRefreshText}`); // "fully refresh in 4 hours, 17 minutes"

console.log(`Weekly Limit Remaining: ${telemetry.weeklyLimitRemainingPct}%`);
console.log(`Weekly Refresh Status: ${telemetry.weeklyRefreshText}`); // "fully refresh in 3 days"
```


