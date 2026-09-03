'use client';

import React, { useState } from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Copy,
  Check,
  Zap,
  Terminal,
  Code2,
  Sparkles,
  Database,
  ShieldCheck,
  Activity,
  Layers,
  CheckCircle2,
  RefreshCw,
  Image as ImageIcon,
  Flame,
  ArrowRight
} from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

export function TypeScriptSdkClient() {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'touchless' | 'images' | 'models' | 'streaming' | 'broccolidb' | 'shims'>('touchless');

  const snippets = {
    touchless: `import { galx } from 'galxai';

// 1. One-line visual generation with prompt auto-sensing (16:9 + HD) & disk saving
const img = await galx.image('A cinematic landscape of the Himalayas in 4k');
console.log(img.url); // Direct property (no data[0].url digging)
await img.save('./himalayas.png'); // Built-in Node.js file writer

// 2. One-line model resolution (zero hardcoded model strings)
const defaultModel = await galx.model();            // Resolves 'gpt-5.6-sol'
const isAvailable  = await galx.model.has('gpt-5.6-sol');
const allNames     = await galx.model.names();      // ['gpt-5.6-sol', ...]

// 3. One-line text completion with string coercion
const answer = await galx.complete('Explain quantum computing in 1 sentence');
console.log(answer.text); // Direct shortcut
console.log(\`\${answer}\`);  // Directly coercible to string!

// 4. One-line token streaming
for await (const chunk of galx.stream('Write a haiku about clean code')) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`,

    images: `import { galx } from 'galxai';

// 1. Inpainting & Mask Editing
const edited = await galx.images.edit({
  image: './scene.png',
  mask: './mask.png', // Optional mask layer
  prompt: 'A vintage red convertible parked in front'
});
console.log(edited.url);

// 2. Visual Variations
const variations = await galx.images.createVariation({
  image: './original_art.png',
  n: 3
});
console.log(variations.urls);

// 3. Real-Time Progressive Diffusion Streaming
const stream = galx.images.stream('A futuristic cybernetic garden');
for await (const progress of stream) {
  console.log(\`Denoising: step \${progress.step}/\${progress.totalSteps} (\${progress.percentage}%)\`);
}
const finalImage = await stream.result();
console.log(finalImage.url);

// 4. BroccoliDB Asset History Catalog (<0.1ms natural query)
const myImages = galx.images.history.queryNatural('where prompt contains landscape');
console.log(myImages[0].urls);`,

    models: `import { galx } from 'galxai';

// 1. Side-by-Side Pricing & Capability Matrix
const comparison = await galx.models.compare('gpt-5.6-sol', 'gpt-5.6-terra');
console.log(\`Cheaper Input Model: \${comparison.cheaperInputModel}\`);
console.log(\`Input Savings: \${comparison.inputSavingsPercentage}%\`);
console.log(\`Context Window Delta: \${comparison.contextWindowDelta} tokens\`);

// 2. Optimal Model Recommendation Engine backed by BroccoliDB
const candidates = await galx.models.optimal({
  minContextWindow: 128000,
  reasoningRequired: true,
  maxCostPer1kInputTokens: 0.005,
  provider: 'openai'
});
console.log(\`Recommended Flagship: \${candidates[0].id}\`);

// 3. Keyword Search across Identifiers, Names, and Providers
const visionModels = await galx.models.search('vision');`,

    streaming: `import { galx } from 'galxai';

const stream = galx.chat.completions.stream({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Explain thermodynamics' }]
});

// 1. In-Flight Stream Transformer Pipeline
stream.pipeThrough(delta => delta.toUpperCase());

// 2. Event-Driven Token Listener
stream.on('content', delta => process.stdout.write(delta));

await stream;

// 3. Real-Time Latency & Throughput Diagnostics
console.log(\`TTFT (Time-To-First-Token): \${stream.metrics.timeToFirstTokenMs}ms\`);
console.log(\`Throughput: \${stream.metrics.tokensPerSecond} tokens/sec\`);
console.log(\`Total Tokens: \${stream.metrics.totalTokens}\`);
console.log(\`Duration: \${stream.metrics.totalDurationMs}ms\`);`,

    broccolidb: `import { galx } from 'galxai';

// 1. True Semantic Vector Prompt Cache (<0.05ms lookup)
// Queries with similar semantics return from BroccoliPromptCache instantly
const res1 = await galx.complete('How do I reverse a linked list in Python?');
const res2 = await galx.complete('How to reverse a Python linked list?'); // 0.04ms cache hit!

// 2. Route-Isolated Adaptive Circuit Breakers
client.circuitBreaker.recordFailure('/v1/images/generations');
console.log(client.circuitBreaker.getState('/v1/images/generations')); // 'OPEN'
console.log(client.circuitBreaker.getState('/v1/chat/completions'));   // 'CLOSED'

// 3. Financial Spend & Token Budget Governor
const safeClient = galx.withBudget({
  maxSpendUsd: 25.00,
  maxTotalTokens: 500000
});
console.log(safeClient.budget.byModel());

// 4. Timeline Checkpoints Diffing & Cryptographic WAL Audit Log
const cp1 = await galx.checkpoints.create('baseline');
const cp2 = await galx.checkpoints.create('experiment');
const diff = await galx.checkpoints.diff(cp1.checkpointId, cp2.checkpointId);
console.log(\`Modified Tables: \${diff.tablesDelta.modified.length}\`);

// 5. Deterministic Offline Replay Test Harness
galx.replay.startRecording('onboarding_flow');
// run test suite...
galx.replay.stopRecording();
galx.replay.startReplay('onboarding_flow'); // Replays in <0.01ms offline!`,

    shims: `// 1. OpenAI 100% Drop-In Shim
import { OpenAI, zodResponseFormat } from 'galxai';
import { z } from 'zod';

const BugReportSchema = z.object({
  title: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  suggestedPatch: z.string()
});

const openai = new OpenAI();
const completion = await openai.beta.chat.completions.parse({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Analyze this memory leak.' }],
  response_format: zodResponseFormat(BugReportSchema, 'bug_report')
});
console.log(completion.choices[0].message.parsed?.severity);

// 2. Anthropic Drop-In Shim
import { Anthropic } from 'galxai';

const anthropic = new Anthropic();
const message = await anthropic.messages.create({
  model: 'gpt-5.6-sol',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello from Anthropic SDK!' }]
});
console.log(message.content[0].text);`
  };

  const handleCopy = async (code: string, id: string) => {
    await safeCopyToClipboard(code);
    setCopiedTab(id);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const categories = [
    { id: 'touchless', label: '⚡ Touchless 1-Line APIs', icon: Zap, color: 'text-amber-400' },
    { id: 'images', label: '🎨 Visual Synthesis', icon: ImageIcon, color: 'text-cyan-400' },
    { id: 'models', label: '🧠 Models & Intelligence', icon: Sparkles, color: 'text-emerald-400' },
    { id: 'streaming', label: '⏱️ Streaming & TTFT', icon: Activity, color: 'text-indigo-400' },
    { id: 'broccolidb', label: '🥦 BroccoliDB Substrate', icon: Database, color: 'text-emerald-400' },
    { id: 'shims', label: '🔄 Drop-In Shims (OpenAI / Anthropic)', icon: Code2, color: 'text-purple-400' },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'SDKs', href: '/docs/sdks' },
            { label: 'Universal TypeScript SDK' },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                OFFICIAL GALXAI CLIENT SDK V1.0
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
                100% EDGE-NATIVE • 0 RUNTIME DEPS
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Universal TypeScript &amp; Edge SDK
            </h1>
            <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Ultra-ergonomic, zero-dependency client with touchless 1-line APIs, prompt auto-sensing, progressive diffusion streaming, BroccoliDB L1 reactive in-memory tables, semantic vector caching, and deterministic offline replay.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/docs/sdks"
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1.5"
            >
              All SDKs
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <DocsSubNav />

        {/* Feature Pill Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1">
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Touchless 1-Line API
            </div>
            <div className="text-[11px] text-zinc-400">90% less boilerplate code</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1">
            <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Smart Auto-Sensing
            </div>
            <div className="text-[11px] text-zinc-400">Auto 16:9, 9:16 &amp; HD quality</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              BroccoliDB Substrate
            </div>
            <div className="text-[11px] text-zinc-400">&lt;0.05ms semantic vector cache</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1">
            <div className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Stream Diagnostics
            </div>
            <div className="text-[11px] text-zinc-400">Real-time TTFT &amp; TPS tracking</div>
          </div>
        </div>

        {/* Category Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-4 py-2 rounded-xl font-mono text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-white/10 text-white border-white/20 shadow-lg shadow-white/5'
                    : 'bg-zinc-950 text-zinc-400 border-white/5 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Code Viewer Panel */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5 border border-white/10 bg-zinc-950/80">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                {categories.find(c => c.id === activeCategory)?.label}
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                {activeCategory === 'touchless' && 'One-line execution functions with intelligent defaults and string coercion.'}
                {activeCategory === 'images' && 'Inpainting, variations, progressive diffusion streaming, and history catalog.'}
                {activeCategory === 'models' && 'Side-by-side pricing matrix and constraint-based candidate recommendation.'}
                {activeCategory === 'streaming' && 'Real-time Time-To-First-Token, tokens-per-second, and in-flight stream transformers.'}
                {activeCategory === 'broccolidb' && 'In-memory reactive tables, semantic vector caching, circuit breakers, and offline replay.'}
                {activeCategory === 'shims' && '100% drop-in shims for existing OpenAI and Anthropic codebases.'}
              </p>
            </div>

            <button
              onClick={() => handleCopy(snippets[activeCategory], activeCategory)}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
            >
              {copiedTab === activeCategory ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Snippet</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-5 rounded-2xl bg-black/80 font-mono text-xs text-zinc-200 border border-white/5 overflow-x-auto leading-relaxed">
            <code>{snippets[activeCategory]}</code>
          </pre>
        </div>

        {/* Prompt Auto-Sensing Reference Table */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10 bg-zinc-950/40">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Visual Synthesis: Touchless Prompt Auto-Sensing Reference
            </h3>
            <p className="text-xs text-zinc-400">
              The SDK analyzes natural language prompt keywords at runtime to automatically configure optimal aspect ratios and HD quality.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border border-white/5 rounded-xl overflow-hidden">
              <thead className="bg-white/5 text-zinc-300">
                <tr>
                  <th className="p-3">Prompt Keywords Detected</th>
                  <th className="p-3">Inferred Aspect Ratio</th>
                  <th className="p-3">Target Pixel Resolution</th>
                  <th className="p-3">Quality Preset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-400">
                <tr>
                  <td className="p-3 text-white">portrait, vertical, reel, story, phone wallpaper</td>
                  <td className="p-3 text-cyan-400">9:16</td>
                  <td className="p-3">1024x1792</td>
                  <td className="p-3">Standard</td>
                </tr>
                <tr>
                  <td className="p-3 text-white">landscape, wallpaper, desktop, cinematic, widescreen</td>
                  <td className="p-3 text-cyan-400">16:9</td>
                  <td className="p-3">1792x1024</td>
                  <td className="p-3">Standard</td>
                </tr>
                <tr>
                  <td className="p-3 text-white">banner, ultrawide, header</td>
                  <td className="p-3 text-cyan-400">21:9</td>
                  <td className="p-3">1792x768</td>
                  <td className="p-3">Standard</td>
                </tr>
                <tr>
                  <td className="p-3 text-white">avatar, icon, logo, pfp, square, badge</td>
                  <td className="p-3 text-cyan-400">1:1</td>
                  <td className="p-3">1024x1024</td>
                  <td className="p-3">Standard</td>
                </tr>
                <tr className="bg-amber-500/5">
                  <td className="p-3 text-white">4k, 8k, photorealistic, ultra-detailed, high resolution</td>
                  <td className="p-3 text-zinc-500">—</td>
                  <td className="p-3 text-zinc-500">—</td>
                  <td className="p-3 text-amber-400 font-bold">HD Quality Preset</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Runtime Compatibility Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-2">
            <div className="font-mono text-xs font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Node.js &amp; Next.js 15
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Full streaming support in Server Actions, Route Handlers, App Router, and Pages Router with zero fetch polyfills.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-2">
            <div className="font-mono text-xs font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Cloudflare Workers &amp; Edge
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Zero Node.js dependency overhead. Fully compliant with standard Web Fetch, Web Streams, and Crypto API.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-2">
            <div className="font-mono text-xs font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Bun &amp; Deno
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Native TypeScript execution with instant module loading and sub-millisecond warm starts.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
