'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Flame,
  ShieldCheck,
  Cpu,
  Bot,
  Laptop,
  MessageSquare,
  Layers,
  ArrowRight,
  Check,
  Coins
} from 'lucide-react';

interface OpenAIModelQuota {
  id: string;
  name: string;
  category: string;
  baseReqs: number;
  contextWindow: string;
  cacheSavings: string;
  latency: string;
  badge?: string;
  color: string;
}

const OPENAI_LUMI_MODELS: OpenAIModelQuota[] = [
  {
    id: 'gpt-5.6-luna',
    name: 'GPT-5.6 Luna',
    category: 'Ultra-Fast Agentic Code Synthesis',
    baseReqs: 2050,
    contextWindow: '200k tokens',
    cacheSavings: '75% Active',
    latency: '< 15ms Anycast',
    badge: 'STELLAR CHOICE 🌟',
    color: 'from-amber-400 to-orange-500'
  },
  {
    id: 'gpt-5.6-sol',
    name: 'GPT-5.6 Sol',
    category: 'Apex Architectural Reasoning',
    baseReqs: 1250,
    contextWindow: '200k tokens',
    cacheSavings: '75% Active',
    latency: '< 25ms',
    badge: 'APEX REASONING',
    color: 'from-cyan-400 to-blue-500'
  },
  {
    id: 'gpt-5.6-terra',
    name: 'GPT-5.6 Terra',
    category: 'Deep Systems & Full-Stack Refactoring',
    baseReqs: 850,
    contextWindow: '200k tokens',
    cacheSavings: '75% Active',
    latency: '< 30ms',
    color: 'from-emerald-400 to-teal-500'
  },
  {
    id: 'o3-mini',
    name: 'o3-mini',
    category: 'Rapid Step-by-Step Problem Solving',
    baseReqs: 5400,
    contextWindow: '200k tokens',
    cacheSavings: '75% Active',
    latency: '< 20ms',
    badge: 'HIGH EFFICIENCY',
    color: 'from-purple-400 to-indigo-500'
  },
  {
    id: 'o3',
    name: 'o3 (Frontier Reasoning)',
    category: 'Maximum Complexity Frontier Reasoning',
    baseReqs: 920,
    contextWindow: '200k tokens',
    cacheSavings: '75% Active',
    latency: '< 35ms',
    color: 'from-rose-400 to-pink-500'
  },
  {
    id: 'gpt-4.5-preview',
    name: 'GPT-4.5 Preview',
    category: 'Frontier World Knowledge & Synthesis',
    baseReqs: 640,
    contextWindow: '128k tokens',
    cacheSavings: '75% Active',
    latency: '< 28ms',
    color: 'from-fuchsia-400 to-purple-500'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Omni)',
    category: 'Multimodal Vision & Real-Time Code',
    baseReqs: 4300,
    contextWindow: '128k tokens',
    cacheSavings: '75% Active',
    latency: '< 18ms',
    color: 'from-sky-400 to-cyan-500'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    category: 'Hyper-Velocity Autonomous Swarms',
    baseReqs: 30100,
    contextWindow: '128k tokens',
    cacheSavings: '75% Active',
    latency: '< 10ms',
    badge: 'HYPER-SWARM 🚀',
    color: 'from-emerald-300 to-green-500'
  },
  {
    id: 'text-embedding-3-large',
    name: 'Text-Embedding-3-Large',
    category: 'Dense Galactic Vector Search & RAG',
    baseReqs: 45000,
    contextWindow: '8,192 dims',
    cacheSavings: 'Pass-Through',
    latency: '< 8ms',
    color: 'from-teal-300 to-emerald-400'
  }
];

const MULTIPLIERS = [1, 10, 25, 50, 100, 250];

export function LumiWorkloadVisualizer() {
  const [multiplier, setMultiplier] = useState<number>(1);
  const [filterCategory, setFilterCategory] = useState<'all' | 'reasoning' | 'fast' | 'multimodal'>('all');

  const filteredModels = OPENAI_LUMI_MODELS.filter(m => {
    if (filterCategory === 'reasoning') return m.id.includes('o3') || m.id.includes('sol') || m.id.includes('4.5');
    if (filterCategory === 'fast') return m.id.includes('luna') || m.id.includes('mini') || m.id.includes('embedding');
    if (filterCategory === 'multimodal') return m.id.includes('4o') || m.id.includes('terra');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Multiplier Warp Selector Toolbar */}
      <div className="p-4 sm:p-6 rounded-3xl bg-black/60 border border-amber-500/30 backdrop-blur-2xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
              Cosmic Warp Multiplier:
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-sans">
            Scale your rolling 5-hour burst capacity across autonomous swarms and enterprise pipelines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-black/80 border border-white/10 text-xs font-mono">
          {MULTIPLIERS.map((m) => {
            const isSelected = multiplier === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMultiplier(m)}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-lg shadow-amber-500/25 scale-105'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {m}x
              </button>
            );
          })}
        </div>
      </div>

      {/* Model Category Filters */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="uppercase font-bold text-white">OpenAI Model Lineup:</span>
        </div>

        <div className="flex gap-1">
          {(['all', 'reasoning', 'fast', 'multimodal'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-mono capitalize transition-all cursor-pointer ${
                filterCategory === cat
                  ? 'bg-white/15 text-white font-bold border border-white/20'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map((model) => {
          const scaledReqs = model.baseReqs * multiplier;
          return (
            <div
              key={model.id}
              className="p-5 rounded-3xl bg-gradient-to-b from-zinc-950/80 via-black/90 to-[#07080d] border border-white/10 hover:border-amber-500/40 transition-all duration-200 group flex flex-col justify-between space-y-4 shadow-xl hover:shadow-amber-500/10 hover:scale-[1.01]"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                      {model.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-sans leading-tight mt-0.5">
                      {model.category}
                    </p>
                  </div>
                  {model.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-amber-400/15 text-amber-300 border border-amber-400/30 shrink-0">
                      {model.badge}
                    </span>
                  )}
                </div>

                {/* Live Output Highlight */}
                <div className="p-3.5 rounded-2xl bg-black/60 border border-white/5 space-y-1 font-mono">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl sm:text-2xl font-black text-white">
                      {scaledReqs.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-zinc-400 uppercase font-sans">
                      Reqs / 5 Hours
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${model.color} rounded-full`}
                      style={{ width: `${Math.min(100, Math.max(15, (scaledReqs / (45000 * multiplier)) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Technical Specs Strip */}
              <div className="pt-2 border-t border-white/5 grid grid-cols-3 gap-1 text-center font-mono text-[10px] text-zinc-400">
                <div className="p-1.5 rounded-lg bg-white/5">
                  <span className="text-zinc-500 block">Context</span>
                  <span className="text-zinc-200 font-bold">{model.contextWindow}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-white/5">
                  <span className="text-zinc-500 block">Cache</span>
                  <span className="text-emerald-400 font-bold">{model.cacheSavings}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-white/5">
                  <span className="text-zinc-500 block">Latency</span>
                  <span className="text-cyan-300 font-bold">{model.latency}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
