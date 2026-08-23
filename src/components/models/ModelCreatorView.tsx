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
  Layers
} from 'lucide-react';
import type { ModelSpecItem } from '@/core/contracts/GalxContracts';

interface ModelCreatorViewProps {
  model: ModelSpecItem;
  triggerCopy: (text: string, identifier: string) => Promise<void>;
  copiedKey: string | null;
}

export function ModelCreatorView({ model, triggerCopy, copiedKey }: ModelCreatorViewProps) {
  const [monthlySpend, setMonthlySpend] = useState<number>(2500);
  const [promptCachePct, setPromptCachePct] = useState<number>(65);
  const [noCodeTool, setNoCodeTool] = useState<'cursor' | 'chat_app' | 'make' | 'bolt'>('cursor');

  // ROI calculations
  const discountPct = model.discountPercentage ?? 25;
  const baseDiscountRate = discountPct / 100;
  const cacheDiscountRate = 0.75;
  const effectiveDiscountRate = baseDiscountRate + (promptCachePct / 100) * cacheDiscountRate * (1 - baseDiscountRate);
  const monthlySavedDollars = Math.round(monthlySpend * effectiveDiscountRate);
  const annualSavedDollars = monthlySavedDollars * 12;
  const galxDirectSpend = monthlySpend - monthlySavedDollars;

  const noCodeConfigs = {
    cursor: {
      name: 'Cursor / Windsurf',
      desc: 'AI coding editor & agent loops',
      steps: [
        'Open Settings -> Models -> Add Model',
        `Enter Model Name: ${model.id}`,
        'Override Base URL: https://galx.ai/v1',
        'Paste your GALXAI API key into the API Key field'
      ],
      code: `// Cursor / Windsurf Settings:
Base URL: https://galx.ai/v1
API Key: galx_live_your_key_here
Model Name: ${model.id}`
    },
    chat_app: {
      name: 'OpenWebUI / Chatbox',
      desc: 'ChatGPT-style personal chat interface',
      steps: [
        'Open App Settings -> Connections / Model Provider -> OpenAI API',
        'Set API Base URL: https://galx.ai/v1',
        'Set API Key: galx_live_your_key_here',
        `Select model ${model.id} and start chatting`
      ],
      code: `Base URL: https://galx.ai/v1
API Key: galx_live_your_key_here
Model: ${model.id}`
    },
    make: {
      name: 'Make.com / Zapier',
      desc: 'No-code business automation workflows',
      steps: [
        'Add an OpenAI "Create a Chat Completion" module',
        'Create New Connection -> Advanced Settings',
        'Base URL: https://galx.ai/v1',
        'API Key: galx_live_your_key_here'
      ],
      code: `Connection Type: OpenAI Compatible
Base URL: https://galx.ai/v1
API Key: galx_live_your_key_here
Model: ${model.id}`
    },
    bolt: {
      name: 'Bolt.new / v0 Clone',
      desc: 'Web app generator & prompt-to-app builders',
      steps: [
        'Set environment variable OPENAI_BASE_URL to https://galx.ai/v1',
        'Set OPENAI_API_KEY to your GALXAI key',
        `Specify ${model.id} in your system prompt or config`
      ],
      code: `OPENAI_BASE_URL=https://galx.ai/v1
OPENAI_API_KEY=galx_live_your_key_here`
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 4 Translation Blocks for Non-Technical Users */}
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
            <p className="text-xs text-zinc-300">
              <strong>Plain English:</strong> Equivalent to roughly <strong>{Math.round(model.contextWindowTokens * 0.75).toLocaleString()} words</strong> or <strong>{Math.round(model.contextWindowTokens / 50000)} entire books</strong> in memory simultaneously.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
            <div className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>75% Prompt Caching</span>
            </div>
            <p className="text-xs text-zinc-300">
              <strong>Plain English:</strong> Like keeping a bookmark open on your textbook. You only pay 25% of the rate when asking repeat questions on large files.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
            <div className="text-xs font-bold text-emerald-300 font-mono flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              <span>Wholesale Arbitrage</span>
            </div>
            <p className="text-xs text-zinc-300">
              <strong>Plain English:</strong> Like a wholesale club for AI. GALXAI buys computing power in enterprise volume, cutting retail prices for you.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
            <div className="text-xs font-bold text-indigo-300 font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero Data Retention</span>
            </div>
            <p className="text-xs text-zinc-300">
              <strong>Plain English:</strong> Your private code and prompts are processed strictly in temporary RAM and vanish instantly. Nothing is ever saved to disk or trained on.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive ROI & Monthly Savings Slider */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-emerald-500/20 bg-gradient-to-b from-[#0e141a] to-[#07080d]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-bold">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>INSTANT SAVINGS ESTIMATOR</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              How much will your team save switching to GALXAI {model.name}?
            </h3>
          </div>

          <div className="text-left sm:text-right font-mono">
            <span className="text-[10px] text-zinc-500 uppercase">Annual Net Savings</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              +${annualSavedDollars.toLocaleString()} <span className="text-xs text-emerald-300 font-normal">/ yr</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-300 font-bold">Your Current Monthly AI / LLM Spend:</span>
                <span className="text-amber-300 font-bold text-sm bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                  ${monthlySpend.toLocaleString()} / month
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="15000"
                step="50"
                value={monthlySpend}
                onChange={(e) => setMonthlySpend(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-2 bg-zinc-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>$50 / mo (Solo Creator)</span>
                <span>$2,500 / mo (Team)</span>
                <span>$15,000+ (Scale)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  Prompt Cache Re-Use Ratio
                </span>
                <span className="text-cyan-300 font-bold">{promptCachePct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={promptCachePct}
                onChange={(e) => setPromptCachePct(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>
          </div>

          <div className="lg:col-span-5 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4">
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Direct Retail Cost:</span>
                <span className="line-through text-zinc-400">${monthlySpend.toLocaleString()} / mo</span>
              </div>
              <div className="flex justify-between items-center text-white font-bold">
                <span className="text-emerald-400">GALXAI Wholesale Cost:</span>
                <span className="text-emerald-300 text-base font-black">${galxDirectSpend.toLocaleString()} / mo</span>
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-500/20">
              <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold tracking-wider">
                Monthly Cash Kept
              </span>
              <div className="text-2xl font-black text-emerald-300 font-mono">
                ${monthlySavedDollars.toLocaleString()} <span className="text-xs text-emerald-400">/ mo</span>
              </div>
            </div>

            <Link
              href="/keys/new"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 font-mono cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Claim $5 Free API Key</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 1-Click No-Code Connectors */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <Laptop className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-black text-white">Use {model.name} in Your Favorite Tools (0 Code Needed)</h3>
        </div>
        <p className="text-xs text-zinc-400">
          Connect GALXAI into your existing IDEs, ChatGPT-style web interfaces, and workflow automations in 30 seconds.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {(['cursor', 'chat_app', 'make', 'bolt'] as const).map((tool) => (
            <button
              key={tool}
              onClick={() => setNoCodeTool(tool)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                noCodeTool === tool
                  ? 'bg-indigo-600/30 text-white border-indigo-400 shadow-md shadow-indigo-500/20'
                  : 'bg-black/40 text-zinc-400 hover:text-white border-white/5'
              }`}
            >
              <span className="font-bold text-xs">{noCodeConfigs[tool].name}</span>
              <span className="text-[10px] text-zinc-500 line-clamp-1">{noCodeConfigs[tool].desc}</span>
            </button>
          ))}
        </div>

        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-white block">Step-by-Step Setup:</span>
            <ol className="list-decimal list-inside text-xs text-zinc-300 space-y-1">
              {noCodeConfigs[noCodeTool].steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="relative p-3 rounded-xl bg-black/80 border border-white/10 font-mono text-xs text-cyan-300">
            <pre className="overflow-x-auto whitespace-pre-wrap pr-16">{noCodeConfigs[noCodeTool].code}</pre>
            <button
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
