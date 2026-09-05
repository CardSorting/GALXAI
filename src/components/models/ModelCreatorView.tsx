'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Zap,
  TrendingDown,
  Coins,
  ShieldCheck,
  Database,
  Laptop,
  Check,
  Copy,
  Layers,
  Calculator,
  Terminal,
  Activity,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import type { ModelSpecItem } from '@/core/contracts/GalxContracts';

interface ModelCreatorViewProps {
  model: ModelSpecItem;
  triggerCopy: (text: string, identifier: string) => Promise<void>;
  copiedKey: string | null;
}

interface WorkloadPreset {
  id: string;
  name: string;
  spend: number;
  cachePct: number;
  desc: string;
}

const WORKLOAD_PRESETS: WorkloadPreset[] = [
  {
    id: 'solo',
    name: 'Solo Dev / Prototype',
    spend: 150,
    cachePct: 45,
    desc: 'Occasional coding, script refactors, and ad-hoc chat',
  },
  {
    id: 'agent',
    name: 'Cursor / Agent Swarm',
    spend: 1200,
    cachePct: 80,
    desc: 'High-frequency code loops with repeated file tree context',
  },
  {
    id: 'rag',
    name: 'Production RAG & API',
    spend: 4500,
    cachePct: 65,
    desc: 'Continuous enterprise traffic with shared system instructions',
  },
  {
    id: 'scale',
    name: 'Enterprise Fleet',
    spend: 12500,
    cachePct: 85,
    desc: 'Multi-tenant high-throughput agent workflows & batch indexing',
  },
];

export function ModelCreatorView({ model, triggerCopy, copiedKey }: ModelCreatorViewProps) {
  const [monthlySpend, setMonthlySpend] = useState<number>(2500);
  const [promptCachePct, setPromptCachePct] = useState<number>(65);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [noCodeTool, setNoCodeTool] = useState<'cursor' | 'claude_code' | 'chat_app' | 'make' | 'bolt'>('cursor');

  const isImage = model.category === 'image';

  // Authentic ROI calculations
  const discountPct = model.discountPercentage && model.discountPercentage > 0 ? model.discountPercentage : 0;
  const baseDiscountRate = discountPct / 100;
  const cacheDiscountRate =
    model.cachedInputPricePer1M !== undefined
      ? 1 - model.cachedInputPricePer1M / model.inputPricePer1M
      : 0.75;
  const effectiveDiscountRate =
    baseDiscountRate + (promptCachePct / 100) * cacheDiscountRate * (1 - baseDiscountRate);
  const monthlySavedDollars = Math.round(monthlySpend * effectiveDiscountRate);
  const annualSavedDollars = monthlySavedDollars * 12;
  const galxDirectSpend = monthlySpend - monthlySavedDollars;

  // Approximate Token Scale Translation
  const avgTokenPrice = (model.inputPricePer1M * 0.7) + (model.outputPricePer1M * 0.3);
  const estimatedTokensMonthly = Math.round((monthlySpend / Math.max(0.1, avgTokenPrice)) * 1_000_000);
  const estimatedScaleFormatted = isImage
    ? `~${Math.round(monthlySpend / Math.max(0.01, model.inputPricePer1M)).toLocaleString()} images / mo`
    : estimatedTokensMonthly >= 1_000_000_000
    ? `~${(estimatedTokensMonthly / 1_000_000_000).toFixed(1)}B tokens / mo`
    : `~${Math.round(estimatedTokensMonthly / 1_000_000)}M tokens / mo`;

  const handleApplyPreset = (preset: WorkloadPreset) => {
    setSelectedPreset(preset.id);
    setMonthlySpend(preset.spend);
    setPromptCachePct(preset.cachePct);
  };

  const noCodeConfigs = {
    cursor: {
      name: 'Cursor / Windsurf',
      desc: 'AI coding editor & agent loops',
      steps: [
        'Open Settings -> Models -> Add Model',
        `Enter Model Name: ${model.id}`,
        'Override Base URL: https://api.galx.ai/v1',
        'Paste your GALXAI API key into the API Key field',
      ],
      code: `// Cursor / Windsurf Settings:
Base URL: https://api.galx.ai/v1
API Key: galx_live_your_key_here
Model Name: ${model.id}`,
    },
    claude_code: {
      name: 'Claude Code / CLI',
      desc: 'Autonomous terminal coding agent',
      steps: [
        'Set environment variable in your ~/.zshrc or ~/.bashrc:',
        'export OPENAI_BASE_URL="https://api.galx.ai/v1"',
        'export OPENAI_API_KEY="galx_live_your_key_here"',
        `Run: claude --model ${model.id}`,
      ],
      code: `export OPENAI_BASE_URL="https://api.galx.ai/v1"
export OPENAI_API_KEY="galx_live_your_key_here"
claude --model ${model.id}`,
    },
    chat_app: {
      name: 'OpenWebUI / LibreChat',
      desc: 'ChatGPT-style personal chat interface',
      steps: [
        'Open App Settings -> Connections / Model Provider -> OpenAI API',
        'Set API Base URL: https://api.galx.ai/v1',
        'Set API Key: galx_live_your_key_here',
        `Select model ${model.id} and start chatting`,
      ],
      code: `Base URL: https://api.galx.ai/v1
API Key: galx_live_your_key_here
Model: ${model.id}`,
    },
    make: {
      name: 'Make.com / Zapier',
      desc: 'No-code business automation workflows',
      steps: [
        'Add an OpenAI "Create a Chat Completion" module',
        'Create New Connection -> Advanced Settings',
        'Base URL: https://api.galx.ai/v1',
        'API Key: galx_live_your_key_here',
      ],
      code: `Connection Type: OpenAI Compatible
Base URL: https://api.galx.ai/v1
API Key: galx_live_your_key_here
Model: ${model.id}`,
    },
    bolt: {
      name: 'Bolt.new / Next.js',
      desc: 'Web app generator & prompt-to-app builders',
      steps: [
        'Set environment variable OPENAI_BASE_URL to https://api.galx.ai/v1',
        'Set OPENAI_API_KEY to your GALXAI key',
        `Specify ${model.id} in your system prompt or client config`,
      ],
      code: `OPENAI_BASE_URL=https://api.galx.ai/v1
OPENAI_API_KEY=galx_live_your_key_here`,
    },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. PLAIN-ENGLISH ARCHITECTURE TRANSLATION BLOCKS                         */}
      {/* ========================================================================= */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          What does {model.name} actually mean for you?
        </h2>
        <p className="text-xs text-zinc-400">
          We translate complex AI engineering specs into tangible real-world capabilities.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
            <div className="text-xs font-bold text-cyan-300 font-mono flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>{Math.round(model.contextWindowTokens / 1000)}k Context Window</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              <strong>Plain English:</strong> Equivalent to roughly <strong>{Math.round(model.contextWindowTokens * 0.75).toLocaleString()} words</strong> or <strong>{Math.round(model.contextWindowTokens / 50000)} entire books</strong> in memory simultaneously.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
            <div className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>Up to 90% Prompt Caching</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              <strong>Plain English:</strong> Like keeping a bookmark open on your codebase. System instructions, repeated files, and tool definitions receive up to 90% pass-through rebate on recurring requests.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
            <div className="text-xs font-bold text-emerald-300 font-mono flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              <span>Sub-15ms Anycast Routing</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              <strong>Plain English:</strong> Global Anycast infrastructure across 330+ locations routes your requests along the fastest encrypted backbone nearest to upstream compute clusters.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
            <div className="text-xs font-bold text-indigo-300 font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero Data Retention</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              <strong>Plain English:</strong> Your private code and prompts are processed strictly in temporary RAM and vanish instantly. Nothing is ever saved to disk or trained on.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE ROI & CACHE SAVINGS ESTIMATOR (Stripe / AWS Pattern)       */}
      {/* ========================================================================= */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-emerald-500/20 bg-gradient-to-b from-[#0e141a] to-[#07080d]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-bold">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>PROMPT CACHING ROI CALCULATOR</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Estimated Savings Switching to GALXAI {model.name}
            </h3>
            <p className="text-xs text-zinc-400">
              Calculate exact budget impact based on your monthly request volume and prompt cache hit ratio.
            </p>
          </div>

          <div className="text-left sm:text-right font-mono">
            <span className="text-[10px] text-zinc-400 uppercase">Annual Retained Budget</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              +${annualSavedDollars.toLocaleString()}{' '}
              <span className="text-xs text-emerald-300 font-normal">/ yr</span>
            </div>
          </div>
        </div>

        {/* Workload Jumpstart Presets */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
            Workload Presets (1-Click Fill):
          </span>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {WORKLOAD_PRESETS.map((p) => {
              const isSelected = selectedPreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-black/40 text-zinc-400 hover:text-white hover:bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{p.name}</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      {p.cachePct}% cache
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 line-clamp-1">{p.desc}</span>
                  <span className="text-[10px] font-mono text-cyan-300/90 pt-1">
                    ${p.spend.toLocaleString()} / mo
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
          {/* Sliders Column */}
          <div className="lg:col-span-7 space-y-5">
            {/* Monthly Spend Slider */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-300 font-bold">Monthly API Spend:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">({estimatedScaleFormatted})</span>
                  <span className="text-amber-300 font-bold text-sm bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                    ${monthlySpend.toLocaleString()} / mo
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="50"
                max="15000"
                step="50"
                value={monthlySpend}
                onChange={(e) => {
                  setMonthlySpend(Number(e.target.value));
                  setSelectedPreset(null);
                }}
                className="w-full accent-amber-400 cursor-pointer h-2 bg-zinc-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>$50 / mo (Solo)</span>
                <span>$2,500 / mo (Team)</span>
                <span>$15,000+ (Scale)</span>
              </div>
            </div>

            {/* Prompt Cache Re-Use Ratio */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  Prompt Cache Re-Use Ratio
                </span>
                <span className="text-cyan-300 font-bold text-sm bg-cyan-500/10 px-2.5 py-0.5 rounded-lg border border-cyan-500/20">
                  {promptCachePct}% Cache Hit
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={promptCachePct}
                onChange={(e) => {
                  setPromptCachePct(Number(e.target.value));
                  setSelectedPreset(null);
                }}
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-zinc-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>0% (Unique Requests)</span>
                <span>50% (Standard RAG)</span>
                <span>90% (Agent Loops / IDE)</span>
              </div>
            </div>

            {/* Visual Comparison Ratio Bar */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 font-mono">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Monthly Billable Comparison:</span>
                <span className="text-emerald-300 font-bold">
                  {Math.round((galxDirectSpend / monthlySpend) * 100)}% of Uncached Baseline
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${Math.max(10, Math.min(100, Math.round((galxDirectSpend / monthlySpend) * 100)))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 pt-1">
                <span className="text-emerald-300 font-bold">● Net Spend: ${galxDirectSpend.toLocaleString()}</span>
                <span className="text-emerald-300 font-bold">✓ Cash Kept: +${monthlySavedDollars.toLocaleString()} / mo</span>
              </div>
            </div>
          </div>

          {/* Right Summary Card (Forensic Line-Item Breakdown) */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
              <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">
                Monthly Breakdown
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                Up to 90% Pass-Through
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Baseline Uncached Spend:</span>
                <span className="text-zinc-300 font-bold">${monthlySpend.toLocaleString()} / mo</span>
              </div>

              <div className="flex justify-between items-center text-zinc-400">
                <span>Uncached Input Tokens (Misses):</span>
                <span className="text-zinc-300">
                  ${Math.round(monthlySpend * (1 - promptCachePct / 100)).toLocaleString()} / mo
                </span>
              </div>

              <div className="flex justify-between items-center text-emerald-300">
                <span>Cached Input Tokens (Hits @ -90%):</span>
                <span className="text-emerald-300 font-bold">
                  ${Math.round(monthlySpend * (promptCachePct / 100) * (1 - cacheDiscountRate)).toLocaleString()} / mo
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-500/20 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">
                  Monthly Budget Retained
                </span>
                <span className="text-xs font-bold text-emerald-300">
                  {Math.round(effectiveDiscountRate * 100)}% Effective Rebate
                </span>
              </div>
              <div className="text-3xl font-black text-emerald-300">
                +${monthlySavedDollars.toLocaleString()}{' '}
                <span className="text-xs text-emerald-300/80">/ mo</span>
              </div>
              <span className="text-[10px] text-zinc-400 block font-sans pt-1">
                Zero commitments, zero minimums. Rebates apply automatically on identical token prefixes.
              </span>
            </div>

            <Link
              href="/keys/new"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 font-mono cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Generate Developer Key ($5 Credit)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. 1-CLICK NO-CODE & AGENT CONNECTORS                                    */}
      {/* ========================================================================= */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <Laptop className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-black text-white">
            Use {model.name} in Your Favorite Tools (0 Code Needed)
          </h3>
        </div>
        <p className="text-xs text-zinc-400">
          Connect GALXAI into your existing IDEs, terminal agents, and workflow automations in 30 seconds.
        </p>

        {/* Tool Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
          {(['cursor', 'claude_code', 'chat_app', 'make', 'bolt'] as const).map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => setNoCodeTool(tool)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                noCodeTool === tool
                  ? 'bg-indigo-600/30 text-white border-indigo-400 shadow-md shadow-indigo-500/20'
                  : 'bg-black/40 text-zinc-400 hover:text-white hover:bg-white/5 border-white/10'
              }`}
            >
              <span className="font-bold text-xs">{noCodeConfigs[tool].name}</span>
              <span className="text-[10px] text-zinc-400 line-clamp-1">
                {noCodeConfigs[tool].desc}
              </span>
            </button>
          ))}
        </div>

        {/* Tool Setup Drawer */}
        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-white block">Step-by-Step Setup:</span>
            <div className="flex items-center gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => triggerCopy('https://api.galx.ai/v1', 'nocode-base-url')}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer text-[10px]"
              >
                {copiedKey === 'nocode-base-url' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy URL</span>
              </button>

              <button
                type="button"
                onClick={() => triggerCopy(model.id, 'nocode-model-id')}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-amber-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer text-[10px]"
              >
                {copiedKey === 'nocode-model-id' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy Model ID</span>
              </button>
            </div>
          </div>

          <ol className="list-decimal list-inside text-xs text-zinc-300 space-y-1 font-sans">
            {noCodeConfigs[noCodeTool].steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          <div className="relative p-3 rounded-xl bg-black/80 border border-white/10 font-mono text-xs text-cyan-300">
            <pre className="overflow-x-auto whitespace-pre-wrap pr-16">
              {noCodeConfigs[noCodeTool].code}
            </pre>
            <button
              type="button"
              onClick={() => triggerCopy(noCodeConfigs[noCodeTool].code, `nocode-${noCodeTool}`)}
              className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs flex items-center gap-1 transition-all cursor-pointer"
            >
              {copiedKey === `nocode-${noCodeTool}` ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span>{copiedKey === `nocode-${noCodeTool}` ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
