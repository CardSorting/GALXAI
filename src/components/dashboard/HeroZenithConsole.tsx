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
  Scale,
  Square
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
    id: 'galx-nova',
    name: 'GALX Nova',
    provider: 'Engine',
    retailPrice: 1.20,
    wholesalePrice: 1.20,
    discountPct: 0,
    contextK: 1050,
    specialty: 'Sustainable Intelligence',
    accentColor: 'from-amber-400 to-orange-500'
  },
  {
    id: 'galx-nova-image',
    name: 'GALX Nova-image',
    provider: 'Visual',
    retailPrice: 0.08,
    wholesalePrice: 0.06,
    discountPct: 25,
    contextK: 128,
    specialty: 'Visual Synthesis',
    accentColor: 'from-purple-400 to-indigo-500'
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
    tag: '⚡ Caching',
    prompt: 'Explain continuous token caching and wholesale arbitrage.'
  },
  {
    label: 'Prompt #2',
    tag: '🦀 Rust Limiter',
    prompt: 'Write a high-concurrency lock-free token bucket in Rust.'
  },
  {
    label: 'Prompt #3',
    tag: '🛡️ 429 Shield',
    prompt: 'How does GALXAI protect against rate limits and upstream errors?'
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
  const streamContainerRef = useRef<HTMLDivElement>(null);
  const clashContainerARef = useRef<HTMLDivElement>(null);
  const clashContainerBRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ONLY inside the inner output containers without moving the window/main page
  useEffect(() => {
    if (isStreaming && streamContainerRef.current) {
      streamContainerRef.current.scrollTop = streamContainerRef.current.scrollHeight;
    }
  }, [streamOutput, isStreaming]);

  useEffect(() => {
    if (isClashStreaming) {
      if (clashContainerARef.current) {
        clashContainerARef.current.scrollTop = clashContainerARef.current.scrollHeight;
      }
      if (clashContainerBRef.current) {
        clashContainerBRef.current.scrollTop = clashContainerBRef.current.scrollHeight;
      }
    }
  }, [clashOutputA, clashOutputB, isClashStreaming]);

  const generateRealisticResponse = (prompt: string, model: ModelPreset): string => {
    const lower = prompt.toLowerCase();

    if (lower.includes('caching') || lower.includes('arbitrage') || lower.includes('explain')) {
      return `### ⚡ Continuous Token Caching & Pricing Arbitrage

1. **Warm Prefix Matching (<1ms):** Prompts with matching system instructions and context prefixes are instantly recognized in ephemeral edge memory.
2. **75% Cache Rebate:** Cached prefix tokens provide maximum pass-through savings.
3. **Sustainable Routing:** Zero platform markup delivers predictable, low-overhead generation.

\`\`\`typescript
const stats = {
  engine: "${model.id}",
  cached_prefix_tokens: 3800, // 75% rebate applied
  effective_savings: "${model.discountPct}% wholesale + 75% cache discount",
  ttft_ms: 12,
  zero_retention: true // Strictly processed in ephemeral RAM
};
\`\`\``;
    }

    if (lower.includes('rust') || lower.includes('lock-free') || lower.includes('queue') || lower.includes('bucket')) {
      return `### 🦀 High-Concurrency Lock-Free Token Bucket in Rust

Production-grade rate limiter with atomic compare-and-swap (CAS) and zero mutex contention:

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
                return false;
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

**Result:** Zero mutex contention • Sub-microsecond latency • 10M+ ops/sec.`;
    }

    if (lower.includes('429') || lower.includes('uptime') || lower.includes('sla') || lower.includes('stall') || lower.includes('resilience') || lower.includes('rate limit')) {
      return `### 🛡️ Enterprise Resilience & Zero 429 Stalls

When autonomous agent loops (Cursor, Windsurf, Claude Code) run high-volume concurrency, direct provider rate limits cause sudden halts.

- **High-Availability Edge Failover:** Traffic is seamlessly shifted across redundant edge channels.
- **Zero Code Rewrites:** Applications avoid 429 backoff stalls and dropped streams.
- **High Concurrency:** Consistent high-speed generation for mission-critical agent swarms.

\`\`\`typescript
export const resilience = {
  rate_limit_stalls: 0,
  failover_latency_ms: "< 1ms",
  status: "OPTIMAL"
};
\`\`\`

**Result:** Continuous execution with zero rate-limit stalls.`;
    }

    // Default response for any custom user prompt
    return `### ⚡ GALXAI Live Response • ${model.name}

> *"${prompt}"*

1. **Edge Routing:** Handled nearest to your origin for minimal wire latency.
2. **Predictable Rate Applied:** **$${model.wholesalePrice.toFixed(2)} / 1M tokens**.
3. **Prompt Cache:** Warm prefix buffers matched in non-persisted RAM.

\`\`\`typescript
export const response = {
  model: "${model.id}",
  provider: "${model.provider}",
  status: "COMPLETED",
  ttft_ms: 12,
  tokens_per_sec: 148,
  guarantee: "Zero Data Retention (ZDR-100)"
};
\`\`\``;
  };

  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const clashIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      if (clashIntervalRef.current) clearInterval(clashIntervalRef.current);
    };
  }, []);

  const handleStopStream = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    if (clashIntervalRef.current) {
      clearInterval(clashIntervalRef.current);
      clashIntervalRef.current = null;
    }
    setIsStreaming(false);
    setIsClashStreaming(false);
  };

  const handleRunStream = (customPrompt?: string) => {
    const promptToRun = customPrompt || promptInput;
    if (!promptToRun.trim()) return;

    if (isStreaming) {
      handleStopStream();
      return;
    }

    setIsStreaming(true);
    setStreamOutput('');
    setCopiedResponse(false);

    const fullResponse = generateRealisticResponse(promptToRun, selectedModel);
    const chunks = fullResponse.split(' ');
    let currentIdx = 0;
    let accumulated = '';
    const startTime = performance.now();

    // Initial live stats
    setStreamStats({
      latencyMs: 12,
      tokensCount: 0,
      tokensPerSec: 145,
      retailCost: 0,
      wholesaleCost: 0,
      savingsUsd: 0
    });

    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);

    // Fast, smooth streaming interval simulating ~140-160 tok/s
    streamIntervalRef.current = setInterval(() => {
      if (currentIdx >= chunks.length) {
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
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

      // Update real-time live telemetry as tokens stream
      const elapsedSec = Math.max(0.05, (performance.now() - startTime) / 1000);
      const currentTokens = Math.round(accumulated.length / 3.8);
      const currentWholesale = (currentTokens / 1_000_000) * selectedModel.wholesalePrice;
      const currentRetail = (currentTokens / 1_000_000) * selectedModel.retailPrice;

      setStreamStats({
        latencyMs: 12,
        tokensCount: currentTokens,
        tokensPerSec: Math.round(currentTokens / elapsedSec),
        retailCost: currentRetail,
        wholesaleCost: currentWholesale,
        savingsUsd: currentRetail - currentWholesale
      });
    }, 16);
  };

  const handleRunClash = () => {
    if (isClashStreaming) {
      handleStopStream();
      return;
    }

    setIsClashStreaming(true);
    setClashOutputA('');
    setClashOutputB('');

    const fullA = generateRealisticResponse(promptInput, selectedModel);
    const fullB = generateRealisticResponse(promptInput, modelB);

    const chunksA = fullA.split(' ');
    const chunksB = fullB.split(' ');

    let idxA = 0;
    let idxB = 0;
    let accA = '';
    let accB = '';
    const startTime = performance.now();

    setClashStatsA({ ttft: 12, speed: 154, cost: 0 });
    setClashStatsB({ ttft: 14, speed: 138, cost: 0 });

    if (clashIntervalRef.current) clearInterval(clashIntervalRef.current);

    clashIntervalRef.current = setInterval(() => {
      if (idxA >= chunksA.length && idxB >= chunksB.length) {
        if (clashIntervalRef.current) clearInterval(clashIntervalRef.current);
        clashIntervalRef.current = null;
        setIsClashStreaming(false);
        const totalSec = Math.max(0.4, (performance.now() - startTime) / 1000);
        setClashStatsA({ 
          ttft: 12, 
          speed: Math.round((fullA.length / 3.8) / totalSec), 
          cost: Number(((fullA.length / 3.8 / 1_000_000) * selectedModel.wholesalePrice).toFixed(6)) 
        });
        setClashStatsB({ 
          ttft: 14, 
          speed: Math.round((fullB.length / 3.8) / totalSec), 
          cost: Number(((fullB.length / 3.8 / 1_000_000) * modelB.wholesalePrice).toFixed(6)) 
        });
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

      const elapsed = Math.max(0.05, (performance.now() - startTime) / 1000);
      setClashStatsA({ 
        ttft: 12, 
        speed: Math.round((accA.length / 3.8) / elapsed), 
        cost: Number(((accA.length / 3.8 / 1_000_000) * selectedModel.wholesalePrice).toFixed(6)) 
      });
      setClashStatsB({ 
        ttft: 14, 
        speed: Math.round((accB.length / 3.8) / elapsed), 
        cost: Number(((accB.length / 3.8 / 1_000_000) * modelB.wholesalePrice).toFixed(6)) 
      });
    }, 16);
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
        return `# Run streaming prompt in terminal:
npx galxai "${promptInput}"

# Or start interactive chat:
npx galxai chat --model ${selectedModel.id}`;
      case 'cursor':
        return `// Cursor / Windsurf -> Settings -> Models:
Override Base URL: https://galx.ai/v1
API Key:           galx_live_your_key_here
Models:            ${selectedModel.id}, galx-nova, galx-nova-image`;
      case 'claude_code':
        return `# Point Claude Code to GALXAI Gateway:
export ANTHROPIC_BASE_URL="https://galx.ai/v1"
export ANTHROPIC_API_KEY="galx_live_your_key_here"

claude "${promptInput}"`;
      case 'python':
        return `from openai import OpenAI

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
              <span className="text-white font-bold tracking-wider uppercase">Global Edge Router</span>
              <span className="text-zinc-500">•</span>
              <span className="text-emerald-400 font-semibold">&lt;15ms Edge Route</span>
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
              <span>Stream</span>
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
              <span>Compare</span>
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
              <span>Code</span>
            </button>
          </div>
        </div>

        {/* 1. Interactive Model Arbitrage Selector Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-zinc-400 font-bold uppercase flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>1. Select Model:</span>
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                -{selectedModel.discountPct}% Wholesale Base
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-bold hidden sm:inline">
                75% Prompt Caching
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
                <span>2. Live Test:</span>
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 overflow-x-auto">
                <span className="hidden sm:inline">Presets:</span>
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
                  placeholder='Prompt (e.g. "Explain prompt caching")...'
                  className="w-full py-3 pl-4 pr-10 rounded-2xl bg-black/70 border border-white/15 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 font-mono transition-colors text-xs"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px] font-mono hidden sm:inline">
                  ⏎ Enter
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleRunStream()}
                disabled={!promptInput.trim()}
                className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 font-mono shrink-0 ${
                  isStreaming
                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20 ring-1 ring-rose-400/50 animate-pulse'
                    : 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black shadow-amber-500/20'
                }`}
              >
                {isStreaming ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop Stream</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Run (0ms)</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Output & Real-Time Performance Telemetry Card */}
            {(streamOutput || isStreaming) && (
              <div className={`p-4 sm:p-5 rounded-2xl bg-black/85 border space-y-3 font-mono text-xs animate-in fade-in duration-150 shadow-2xl transition-all ${
                isStreaming ? 'border-cyan-400/60 ring-1 ring-cyan-400/40 shadow-cyan-500/10' : 'border-cyan-500/30'
              }`}>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-cyan-300 font-bold">Stream: {selectedModel.name}</span>
                    {isStreaming && (
                      <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] animate-pulse">
                        LIVE
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold hidden sm:inline">
                      {isStreaming && streamStats ? `${streamStats.tokensCount} tok • ${streamStats.tokensPerSec} tok/s` : '● Instant Stream'}
                    </span>
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
                <div
                  ref={streamContainerRef}
                  className="text-zinc-200 leading-relaxed max-h-64 sm:max-h-80 overflow-y-auto overscroll-contain whitespace-pre-wrap pr-2 text-xs font-mono"
                >
                  {streamOutput}
                  {isStreaming && <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse" />}
                </div>

                {/* Live Real-Time Telemetry Counters */}
                {streamStats && (
                  <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-white/5 space-y-0.5 border border-white/5 transition-all">
                      <span className="text-zinc-500 uppercase text-[10px]">TTFT</span>
                      <div className="text-white font-bold">{streamStats.latencyMs}ms</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 space-y-0.5 border border-white/5 transition-all">
                      <span className="text-zinc-500 uppercase text-[10px]">Throughput</span>
                      <div className="text-cyan-300 font-bold">{streamStats.tokensPerSec} tok/s</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 space-y-0.5 border border-white/5 transition-all">
                      <span className="text-zinc-500 uppercase text-[10px]">Wholesale Cost</span>
                      <div className="text-emerald-300 font-bold">${streamStats.wholesaleCost.toFixed(6)}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 space-y-0.5 border border-white/5 transition-all">
                      <span className="text-zinc-500 uppercase text-[10px]">Instant Savings</span>
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-400 font-bold uppercase flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Compare:</span>
                </span>
                <span className="text-amber-300 font-bold">{selectedModel.name}</span>
                <span className="text-zinc-500">vs</span>
                <select
                  value={modelB.id}
                  onChange={(e) => {
                    const found = HERO_MODELS.find(m => m.id === e.target.value);
                    if (found) setModelB(found);
                  }}
                  className="px-2 py-1 rounded-lg bg-black/80 border border-white/20 text-cyan-300 text-xs font-mono font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  {HERO_MODELS.map(m => (
                    <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                      {m.name} (-{m.discountPct}%)
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleRunClash}
                className={`px-5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-1.5 self-end sm:self-auto shrink-0 font-bold ${
                  isClashStreaming
                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20 ring-1 ring-rose-400/50 animate-pulse'
                    : 'bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black font-black'
                }`}
              >
                {isClashStreaming ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-black" />
                    <span>Run Comparison</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={`p-4 rounded-2xl bg-black/80 border space-y-2 transition-all ${
                isClashStreaming ? 'border-amber-400/60 ring-1 ring-amber-400/30' : 'border-amber-500/30'
              }`}>
                <div className="flex justify-between items-center border-b border-white/10 pb-1.5 text-[11px]">
                  <span className="text-amber-300 font-bold">{selectedModel.name}</span>
                  <span className="text-emerald-400 font-bold">-${selectedModel.discountPct}% Wholesale</span>
                </div>
                <div
                  ref={clashContainerARef}
                  className="text-zinc-300 text-xs min-h-[140px] max-h-[220px] overflow-y-auto overscroll-contain whitespace-pre-wrap"
                >
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

              <div className={`p-4 rounded-2xl bg-black/80 border space-y-2 transition-all ${
                isClashStreaming ? 'border-cyan-400/60 ring-1 ring-cyan-400/30' : 'border-cyan-500/30'
              }`}>
                <div className="flex justify-between items-center border-b border-white/10 pb-1.5 text-[11px]">
                  <span className="text-cyan-300 font-bold">{modelB.name}</span>
                  <span className="text-emerald-400 font-bold">-${modelB.discountPct}% Wholesale</span>
                </div>
                <div
                  ref={clashContainerBRef}
                  className="text-zinc-300 text-xs min-h-[140px] max-h-[220px] overflow-y-auto overscroll-contain whitespace-pre-wrap"
                >
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
              <span>3. Code Snippet:</span>
            </span>

            {/* Snippet Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] overflow-x-auto">
              {[
                { id: 'cli', label: 'CLI' },
                { id: 'cursor', label: 'Cursor' },
                { id: 'claude_code', label: 'Claude Code' },
                { id: 'python', label: 'Python' },
                { id: 'ts', label: 'TypeScript' },
                { id: 'browser', label: 'Browser' }
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
              <span>{copiedSnippet ? 'Copied!' : 'Copy'}</span>
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

        {/* Bottom Conversion Guarantee Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-white/10 font-mono text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>No lock-in • $5 free credit • 100% refund on unspent balance</span>
          </div>

          <Link
            href="/keys"
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hover:underline shrink-0"
          >
            <span>Claim Free $5 Key &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
