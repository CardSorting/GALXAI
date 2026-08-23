'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Terminal,
  Zap,
  Play,
  Copy,
  Check,
  Flame,
  ShieldCheck,
  Coins,
  Cpu,
  Laptop,
  Code2,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Clock,
  ArrowRight,
  Activity,
  Bot,
  Database,
  Layers,
  CheckCircle2,
  Sliders,
  Scale
} from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface ModelPreset {
  id: string;
  name: string;
  provider: string;
  retailPrice: number;
  wholesalePrice: number;
  discountPct: number;
  contextK: number;
  specialty: string;
  accentColor: string;
}

const HERO_MODELS: ModelPreset[] = [
  {
    id: 'gpt-5.6-sol',
    name: 'OpenAI GPT-5.6 Sol',
    provider: 'OpenAI Codex',
    retailPrice: 5.00,
    wholesalePrice: 3.00,
    discountPct: 40,
    contextK: 200,
    specialty: 'SOTA Coding & Architecture',
    accentColor: 'from-amber-400 to-orange-500'
  },
  {
    id: 'x-ai/grok-4.6',
    name: 'xAI Grok 4.6',
    provider: 'xAI Reasoning',
    retailPrice: 5.00,
    wholesalePrice: 3.50,
    discountPct: 30,
    contextK: 1000,
    specialty: '1M Frontier Reasoning',
    accentColor: 'from-cyan-400 to-indigo-500'
  },
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    retailPrice: 3.00,
    wholesalePrice: 2.25,
    discountPct: 25,
    contextK: 200,
    specialty: 'Hybrid Thinking & Precision',
    accentColor: 'from-orange-400 to-amber-500'
  },
  {
    id: 'gpt-5.6-luna',
    name: 'OpenAI GPT-5.6 Luna',
    provider: 'OpenAI Flash',
    retailPrice: 0.25,
    wholesalePrice: 0.15,
    discountPct: 40,
    contextK: 128,
    specialty: 'Sub-Second Agent Loops',
    accentColor: 'from-emerald-400 to-teal-500'
  }
];

interface PresetPromptItem {
  label: string;
  prompt: string;
  tag: string;
}

const PRESET_PROMPTS: PresetPromptItem[] = [
  {
    label: 'Prompt #1',
    tag: '⚡ Prompt Caching',
    prompt: 'Explain continuous token caching and wholesale arbitrage.'
  },
  {
    label: 'Prompt #2',
    tag: '🦀 Lock-Free Rust',
    prompt: 'Write a high-concurrency lock-free token bucket in Rust.'
  },
  {
    label: 'Prompt #3',
    tag: '🛡️ 99.99% SLA',
    prompt: 'How does GALXAI guarantee 99.99% uptime with zero rate limits?'
  }
];

export function HeroZenithConsole() {
  const [consoleMode, setConsoleMode] = useState<'stream' | 'clash' | 'snippets'>('stream');
  const [selectedModel, setSelectedModel] = useState<ModelPreset>(HERO_MODELS[0]);
  const [modelB, setModelB] = useState<ModelPreset>(HERO_MODELS[1]);
  const [promptInput, setPromptInput] = useState(PRESET_PROMPTS[0].prompt);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'cli' | 'cursor' | 'claude_code' | 'python' | 'ts' | 'browser'>('cli');
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamOutput, setStreamOutput] = useState<string>('');
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [streamStats, setStreamStats] = useState<{
    latencyMs: number;
    tokensCount: number;
    tokensPerSec: number;
    retailCost: number;
    wholesaleCost: number;
    savingsUsd: number;
  } | null>(null);

  // Clash Stream State
  const [isClashStreaming, setIsClashStreaming] = useState(false);
  const [clashOutputA, setClashOutputA] = useState<string>('');
  const [clashOutputB, setClashOutputB] = useState<string>('');
  const [clashStatsA, setClashStatsA] = useState<{ ttft: number; speed: number; cost: number } | null>(null);
  const [clashStatsB, setClashStatsB] = useState<{ ttft: number; speed: number; cost: number } | null>(null);

  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const outputEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll inside output preview when streaming
  useEffect(() => {
    if (outputEndRef.current && (isStreaming || isClashStreaming)) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamOutput, clashOutputA, clashOutputB, isStreaming, isClashStreaming]);

  const generateRealisticResponse = (prompt: string, model: ModelPreset): string => {
    const lower = prompt.toLowerCase();

    if (lower.includes('caching') || lower.includes('arbitrage') || lower.includes('explain')) {
      return `### ⚡ Continuous Token Caching & Wholesale Arbitrage

**1-Sentence Summary:**
> *"Shared prompt prefixes stay warm in Anycast RAM, cutting repeat token costs by 75%."*

#### 1. How the Architecture Works:
1. **Warm Prefix Matching (<1ms):**
   When your agent sends system instructions, schemas, or large file contexts, GALXAI matches the cryptographic SHA-256 hash of the prompt prefix in memory before dispatching.
2. **75% Cache Pass-Through:**
   Cached prefix tokens cost **$0.75 / 1M** instead of standard retail **$5.00 / 1M** (a direct 75% savings pass-through).
3. **Wholesale Volume Clearing:**
   GALXAI aggregates millions of developers into massive enterprise tier-1 contracts, delivering **${model.discountPct}% instant discount** on all remaining generation tokens.

\`\`\`typescript
// Resulting Cost Ledger
const stats = {
  engine: "${model.id}",
  raw_tokens: 4280,
  cached_prefix_tokens: 3800, // 75% rebate applied
  effective_savings: "${model.discountPct}% wholesale + 75% cache discount",
  ttft_ms: 12,
  zero_retention: true // Processed strictly in non-persisted RAM
};
\`\`\``;
    }

    if (lower.includes('rust') || lower.includes('lock-free') || lower.includes('queue') || lower.includes('bucket')) {
      return `### 🦀 High-Concurrency Lock-Free Token Bucket in Rust

Here is a production-grade, thread-safe rate limiter utilizing atomic compare-and-swap (CAS) operations with zero mutex contention:

\`\`\`rust
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};

pub struct AtomicTokenBucket {
    capacity: u64,
    tokens: AtomicU64,
    refill_rate_per_sec: u64,
    last_refill_nanos: AtomicU64,
    start_time: Instant,
}

impl AtomicTokenBucket {
    pub fn new(capacity: u64, refill_rate_per_sec: u64) -> Self {
        Self {
            capacity,
            tokens: AtomicU64::new(capacity),
            refill_rate_per_sec,
            last_refill_nanos: AtomicU64::new(0),
            start_time: Instant::now(),
        }
    }

    pub fn try_acquire(&self, requested: u64) -> bool {
        self.refill();
        let mut current = self.tokens.load(Ordering::Relaxed);
        loop {
            if current < requested {
                return false; // Insufficient tokens
            }
            match self.tokens.compare_exchange_weak(
                current,
                current - requested,
                Ordering::SeqCst,
                Ordering::Relaxed,
            ) {
                Ok(_) => return true,
                Err(actual) => current = actual,
            }
        }
    }

    fn refill(&self) {
        let now_nanos = self.start_time.elapsed().as_nanos() as u64;
        let last = self.last_refill_nanos.load(Ordering::Relaxed);
        let elapsed_secs = (now_nanos.saturating_sub(last) as f64) / 1_000_000_000.0;

        if elapsed_secs >= 0.01 {
            let refill_amount = (elapsed_secs * self.refill_rate_per_sec as f64) as u64;
            if refill_amount > 0 && self.last_refill_nanos.compare_exchange(last, now_nanos, Ordering::SeqCst, Ordering::Relaxed).is_ok() {
                self.tokens.fetch_update(Ordering::SeqCst, Ordering::Relaxed, |curr| {
                    Some((curr + refill_amount).min(self.capacity))
                }).ok();
            }
        }
    }
}
\`\`\`

**Key Features:**
- **Zero Mutex Locks:** Lock-free atomic loop eliminates thread blocking.
- **Sub-Microsecond Latency:** Handles 10M+ operations/sec per core.`;
    }

    if (lower.includes('429') || lower.includes('uptime') || lower.includes('sla') || lower.includes('stall') || lower.includes('resilience') || lower.includes('rate limit')) {
      return `### 🛡️ 99.99% Enterprise Uptime & Zero Rate-Limit Stalls

When autonomous coding agents (like Cursor, Windsurf, or custom agent swarms) run continuous execution loops, standard API keys frequently hit provider rate limits (**HTTP 429 Too Many Requests**).

#### How GALXAI Guarantees High Availability:
- **Sub-1ms Automatic Failover:**
  Traffic is automatically routed across redundant high-capacity Anycast pathways with zero client-side delay.
- **Zero Configuration Overhauls:**
  Your applications never experience 429 backoff stalls or dropped streams.
- **Consistent High Throughput:**
  Guaranteed high-speed generation for mission-critical production pipelines.

\`\`\`typescript
// High Availability Guarantee
export const sla = {
  uptime: "99.99%",
  rate_limit_stalls: 0,
  failover_latency_ms: "< 1ms",
  status: "OPTIMAL"
};
\`\`\`

**Result:** Uninterrupted execution and 99.99% SLA uptime for all agent loops and backend services.`;
    }

    // Default rich response for any custom user prompt
    return `### 🌌 GALXAI Wholesale Response • ${model.name}

**Prompt Evaluated:**
> *"${prompt}"*

#### Performance & Optimization Telemetry:
1. **Anycast Routing:** Handled nearest to your location in **12ms TTFT**.
2. **Wholesale Rate Applied:** **$${model.wholesalePrice.toFixed(2)} / 1M tokens** (saved **${model.discountPct}%** vs standard retail $${model.retailPrice.toFixed(2)}).
3. **Continuous Prompt Cache:** Warm prefix buffers matched in non-persisted RAM.

\`\`\`typescript
// Execution Confirmation
export const response = {
  model: "${model.id}",
  provider: "${model.provider}",
  status: "COMPLETED",
  ttft_ms: 12,
  tokens_per_sec: 148,
  memory_guarantee: "AES-256-GCM Zero Retention in RAM"
};
\`\`\`

Ready to deploy in your stack with **1-line drop-in** replacement.`;
  };

  const handleRunStream = (customPrompt?: string) => {
    const promptToRun = customPrompt || promptInput;
    if (!promptToRun.trim() || isStreaming) return;

    setIsStreaming(true);
    setStreamOutput('');
    setStreamStats(null);
    setCopiedResponse(false);

    const fullResponse = generateRealisticResponse(promptToRun, selectedModel);
    const chunks = fullResponse.split(' ');
    let currentIdx = 0;
    let accumulated = '';
    const startTime = performance.now();

    // Fast, smooth streaming interval simulating ~140 tok/s
    const interval = setInterval(() => {
      if (currentIdx >= chunks.length) {
        clearInterval(interval);
        setIsStreaming(false);

        const totalTimeSec = Math.max(0.4, (performance.now() - startTime) / 1000);
        const estTokens = Math.round(fullResponse.length / 3.8);
        const retailCost = (estTokens / 1_000_000) * selectedModel.retailPrice;
        const wholesaleCost = (estTokens / 1_000_000) * selectedModel.wholesalePrice;

        setStreamStats({
          latencyMs: 12,
          tokensCount: estTokens,
          tokensPerSec: Math.round(estTokens / totalTimeSec),
          retailCost,
          wholesaleCost,
          savingsUsd: retailCost - wholesaleCost
        });
        return;
      }

      // Append 2-3 words per tick for high-throughput visual flow
      const nextChunk = chunks.slice(currentIdx, currentIdx + 2).join(' ');
      accumulated += (currentIdx === 0 ? '' : ' ') + nextChunk;
      setStreamOutput(accumulated);
      currentIdx += 2;
    }, 18);
  };

  const handleRunClash = () => {
    if (isClashStreaming) return;
    setIsClashStreaming(true);
    setClashOutputA('');
    setClashOutputB('');
    setClashStatsA(null);
    setClashStatsB(null);

    const fullA = generateRealisticResponse(promptInput, selectedModel);
    const fullB = generateRealisticResponse(promptInput, modelB);

    const chunksA = fullA.split(' ');
    const chunksB = fullB.split(' ');

    let idxA = 0;
    let idxB = 0;
    let accA = '';
    let accB = '';

    const interval = setInterval(() => {
      if (idxA >= chunksA.length && idxB >= chunksB.length) {
        clearInterval(interval);
        setIsClashStreaming(false);
        setClashStatsA({ ttft: 12, speed: 154, cost: Number(((fullA.length / 3.8 / 1_000_000) * selectedModel.wholesalePrice).toFixed(6)) });
        setClashStatsB({ ttft: 14, speed: 138, cost: Number(((fullB.length / 3.8 / 1_000_000) * modelB.wholesalePrice).toFixed(6)) });
        return;
      }

      if (idxA < chunksA.length) {
        accA += (idxA === 0 ? '' : ' ') + chunksA.slice(idxA, idxA + 2).join(' ');
        setClashOutputA(accA);
        idxA += 2;
      }

      if (idxB < chunksB.length) {
        accB += (idxB === 0 ? '' : ' ') + chunksB.slice(idxB, idxB + 2).join(' ');
        setClashOutputB(accB);
        idxB += 2;
      }
    }, 18);
  };

  const handleCopyResponse = async () => {
    if (!streamOutput) return;
    const success = await safeCopyToClipboard(streamOutput);
    if (success) {
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  const getIntegrationSnippet = () => {
    switch (activeSnippetTab) {
      case 'cli':
        return `# 1. Run zero-install streaming prompt in terminal:
npx galxai "${promptInput}"

# 2. Or start interactive REPL:
npx galxai chat --model ${selectedModel.id}`;
      case 'cursor':
        return `// In Cursor / Windsurf Settings -> Models:
Override Base URL: https://galx.ai/v1
API Key:           galx_live_your_key_here
Models:            ${selectedModel.id}, gpt-5.6-sol, x-ai/grok-4.6`;
      case 'claude_code':
        return `# Point Claude Code CLI directly to GALXAI Wholesale Clearinghouse:
export ANTHROPIC_BASE_URL="https://galx.ai/v1"
export ANTHROPIC_API_KEY="galx_live_your_key_here"

claude "${promptInput}"`;
      case 'python':
        return `from openai import OpenAI

# 1-Line Drop-in wholesale replacement:
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_key_here"
)

response = client.chat.completions.create(
    model="${selectedModel.id}",
    messages=[{"role": "user", "content": "${promptInput}"}],
    stream=True
)

for chunk in response:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)`;
      case 'ts':
        return `import OpenAI from 'openai';

// Drop-in compatible with OpenAI SDK & Vercel AI SDK
const client = new OpenAI({
  baseURL: 'https://galx.ai/v1',
  apiKey: process.env.GALX_API_KEY || 'galx_live_your_key'
});

const res = await client.chat.completions.create({
  model: '${selectedModel.id}',
  messages: [{ role: 'user', content: '${promptInput}' }],
  stream: true
});`;
      case 'browser':
        return `https://galx.ai/v1/chat/completions?prompt=${encodeURIComponent(promptInput)}&model=${selectedModel.id}`;
    }
  };

  const handleCopySnippet = async () => {
    const text = getIntegrationSnippet();
    const success = await safeCopyToClipboard(text);
    if (success) {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl p-1 bg-gradient-to-b from-amber-500/35 via-cyan-500/25 to-indigo-500/35 shadow-2xl shadow-amber-500/10">
      <div className="rounded-[22px] bg-[#07090f]/95 backdrop-blur-2xl border border-white/10 p-5 sm:p-7 space-y-6">
        {/* Top Header Bar: Telemetry Status & Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/50" />
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-white font-bold tracking-wider uppercase">Apex Compute Clearinghouse</span>
              <span className="text-zinc-500">•</span>
              <span className="text-emerald-400 font-semibold">99.99% Enterprise SLA</span>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setConsoleMode('stream')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                consoleMode === 'stream'
                  ? 'bg-amber-400 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Live Stream</span>
            </button>

            <button
              type="button"
              onClick={() => setConsoleMode('clash')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                consoleMode === 'clash'
                  ? 'bg-cyan-400 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Scale className="w-3 h-3" />
              <span>Dual Clash</span>
            </button>

            <button
              type="button"
              onClick={() => setConsoleMode('snippets')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                consoleMode === 'snippets'
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3 h-3" />
              <span>1-Line Stack</span>
            </button>
          </div>
        </div>

        {/* 1. Interactive Model Arbitrage Selector Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-zinc-400 font-bold uppercase flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>1. Select Frontier Model:</span>
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                -{selectedModel.discountPct}% Wholesale Off Retail
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-bold hidden sm:inline">
                75% Cache Pass-Through
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-xs">
            {HERO_MODELS.map((m) => {
              const isSelected = selectedModel.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedModel(m)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? 'bg-amber-400/15 border-amber-400/80 shadow-lg shadow-amber-500/15 ring-1 ring-amber-400/40 text-white scale-[1.02]'
                      : 'bg-black/50 border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 truncate">{m.provider}</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                      -{m.discountPct}%
                    </span>
                  </div>

                  <div className="font-bold text-white text-xs truncate">{m.name}</div>

                  <div className="flex items-baseline justify-between pt-1 border-t border-white/5 text-[11px]">
                    <span className="text-zinc-500 line-through">${m.retailPrice.toFixed(2)}</span>
                    <span className="text-emerald-300 font-bold">${m.wholesalePrice.toFixed(2)}/1M</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* MODE 1: Single Stream Console */}
        {consoleMode === 'stream' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-zinc-400 font-bold uppercase flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>2. Interactive Test Execution:</span>
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 overflow-x-auto">
                <span className="hidden sm:inline">Try quick prompts:</span>
                {PRESET_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPromptInput(p.prompt);
                      handleRunStream(p.prompt);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1 border border-white/5"
                  >
                    <span>{p.tag}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full font-mono text-xs">
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRunStream()}
                  placeholder="Type any prompt to test live throughput & wholesale pricing..."
                  className="w-full py-3 pl-4 pr-10 rounded-2xl bg-black/70 border border-white/15 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 font-mono transition-colors text-xs"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px] font-mono hidden sm:inline">
                  ⏎ Enter
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleRunStream()}
                disabled={isStreaming || !promptInput.trim()}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 font-mono shrink-0"
              >
                {isStreaming ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Streaming Output...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Execute Stream (0ms)</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Output & Real-Time Performance Telemetry Card */}
            {(streamOutput || isStreaming) && (
              <div className="p-4 sm:p-5 rounded-2xl bg-black/85 border border-cyan-500/30 space-y-3 font-mono text-xs animate-in fade-in duration-150 shadow-2xl">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-cyan-300 font-bold">Stream: {selectedModel.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold hidden sm:inline">● In-Browser Simulation (Zero Auth)</span>
                    {streamOutput && !isStreaming && (
                      <button
                        type="button"
                        onClick={handleCopyResponse}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center gap-1 transition-all text-[10px] cursor-pointer"
                      >
                        {copiedResponse ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedResponse ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Formatted Stream Text Output Container */}
                <div className="text-zinc-200 leading-relaxed max-h-64 sm:max-h-80 overflow-y-auto whitespace-pre-wrap pr-2 text-xs font-mono">
                  {streamOutput}
                  {isStreaming && <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse" />}
                  <div ref={outputEndRef} />
                </div>

                {/* Live Real-Time Telemetry Counters */}
                {streamStats && (
                  <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-white/5 space-y-0.5 border border-white/5">
                      <span className="text-zinc-500 uppercase text-[9px]">Time to First Token</span>
                      <div className="text-white font-bold">{streamStats.latencyMs}ms</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 space-y-0.5 border border-white/5">
                      <span className="text-zinc-500 uppercase text-[9px]">Throughput Velocity</span>
                      <div className="text-cyan-300 font-bold">{streamStats.tokensPerSec} tok/s</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 space-y-0.5 border border-white/5">
                      <span className="text-zinc-500 uppercase text-[9px]">Wholesale Cost</span>
                      <div className="text-emerald-300 font-bold">${streamStats.wholesaleCost.toFixed(6)}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 space-y-0.5 border border-white/5">
                      <span className="text-zinc-500 uppercase text-[9px]">Instant Net Savings</span>
                      <div className="text-amber-300 font-bold">-{selectedModel.discountPct}% OFF</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MODE 2: Dual Model Clash Arena */}
        {consoleMode === 'clash' && (
          <div className="space-y-4 font-mono text-xs">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-white/10 pb-2">
              <span className="text-zinc-400 font-bold uppercase flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-cyan-400" />
                <span>Dual Model Concurrency Clash: {selectedModel.name} vs {modelB.name}</span>
              </span>
              <button
                type="button"
                onClick={handleRunClash}
                disabled={isClashStreaming}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>{isClashStreaming ? 'Clashing Streams...' : 'Run Concurrently'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-black/80 border border-amber-500/30 space-y-2">
                <div className="flex justify-between items-center border-b border-white/10 pb-1.5 text-[11px]">
                  <span className="text-amber-300 font-bold">{selectedModel.name}</span>
                  <span className="text-emerald-400 font-bold">-${selectedModel.discountPct}% Wholesale</span>
                </div>
                <div className="text-zinc-300 text-xs min-h-[140px] max-h-[220px] overflow-y-auto whitespace-pre-wrap">
                  {clashOutputA || <span className="text-zinc-600 italic">Ready to stream concurrent prompt...</span>}
                </div>
                {clashStatsA && (
                  <div className="pt-2 border-t border-white/5 flex justify-between text-[10px] text-zinc-400">
                    <span>TTFT: {clashStatsA.ttft}ms</span>
                    <span>Speed: {clashStatsA.speed} tok/s</span>
                    <span className="text-emerald-400 font-bold">Cost: ${clashStatsA.cost}</span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-black/80 border border-cyan-500/30 space-y-2">
                <div className="flex justify-between items-center border-b border-white/10 pb-1.5 text-[11px]">
                  <span className="text-cyan-300 font-bold">{modelB.name}</span>
                  <span className="text-emerald-400 font-bold">-${modelB.discountPct}% Wholesale</span>
                </div>
                <div className="text-zinc-300 text-xs min-h-[140px] max-h-[220px] overflow-y-auto whitespace-pre-wrap">
                  {clashOutputB || <span className="text-zinc-600 italic">Ready to stream concurrent prompt...</span>}
                </div>
                {clashStatsB && (
                  <div className="pt-2 border-t border-white/5 flex justify-between text-[10px] text-zinc-400">
                    <span>TTFT: {clashStatsB.ttft}ms</span>
                    <span>Speed: {clashStatsB.speed} tok/s</span>
                    <span className="text-emerald-400 font-bold">Cost: ${clashStatsB.cost}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: 1-Line Stack Integration Snippets */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-zinc-400 font-bold uppercase font-mono text-xs flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>3. 1-Line Drop-In for Your Stack:</span>
            </span>

            {/* Snippet Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] overflow-x-auto">
              {[
                { id: 'cli', label: 'Terminal CLI' },
                { id: 'cursor', label: 'Cursor / Windsurf' },
                { id: 'claude_code', label: 'Claude Code' },
                { id: 'python', label: 'Python' },
                { id: 'ts', label: 'TypeScript' },
                { id: 'browser', label: 'Browser URL' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSnippetTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap font-bold ${
                    activeSnippetTab === tab.id
                      ? 'bg-amber-400 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative rounded-2xl bg-black/80 border border-white/10 p-4 font-mono text-xs overflow-hidden">
            <button
              type="button"
              onClick={handleCopySnippet}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all text-[11px] cursor-pointer"
            >
              {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSnippet ? 'Copied Snippet!' : 'Copy Code'}</span>
            </button>

            {activeSnippetTab === 'browser' ? (
              <div className="space-y-2 pr-24">
                <p className="text-zinc-400 text-[11px]">Test in your address bar with 0 auth or setup:</p>
                <a
                  href={`/v1/chat/completions?prompt=${encodeURIComponent(promptInput)}&model=${selectedModel.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-300 hover:underline flex items-center gap-1.5 break-all text-xs font-bold"
                >
                  <span>GET /v1/chat/completions?prompt={promptInput}&amp;model={selectedModel.id}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            ) : (
              <pre className="text-zinc-300 overflow-x-auto pr-24 leading-relaxed font-mono">
                {getIntegrationSnippet()}
              </pre>
            )}
          </div>
        </div>

        {/* Bottom Zenith Conversion Guarantee Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-white/10 font-mono text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Zero Lock-in • $5 Free Instant Credit • 100% Unspent Refund Guarantee</span>
          </div>

          <Link
            href="/keys/new"
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hover:underline shrink-0"
          >
            <span>Mint Live Access Key &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
