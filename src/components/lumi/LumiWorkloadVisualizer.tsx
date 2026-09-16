'use client';

import React, { useState } from 'react';
import { Cpu, Zap, Sparkles, Layers, ShieldCheck, Database, Check } from 'lucide-react';

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
    id: 'gpt-6-astra',
    name: 'GPT-6 Astra (Default Flagship)',
    category: 'Our most capable model for complex, demanding work',
    baseReqs: 800,
    contextWindow: '2M tokens',
    cacheSavings: '90% Active',
    latency: '< 20ms',
    badge: 'DEFAULT APEX 👑',
    color: 'from-indigo-400 to-sky-500'
  },
  {
    id: 'gpt-5.6-sol',
    name: 'GPT-5.6 Sol',
    category: 'Reliable agentic workhorse for everyday tasks',
    baseReqs: 1250,
    contextWindow: '1M tokens',
    cacheSavings: '90% Active',
    latency: '< 25ms',
    badge: 'WORKHORSE ⚡',
    color: 'from-cyan-400 to-blue-500'
  },
  {
    id: 'gpt-5.6-terra',
    name: 'GPT-5.6 Terra',
    category: 'Balanced agentic coding model for everyday work',
    baseReqs: 2500,
    contextWindow: '1M tokens',
    cacheSavings: '90% Active',
    latency: '< 20ms',
    badge: 'BALANCED',
    color: 'from-emerald-400 to-teal-500'
  },
  {
    id: 'gpt-5.6-luna',
    name: 'GPT-5.6 Luna',
    category: 'Fast and affordable agentic coding model',
    baseReqs: 15000,
    contextWindow: '1M tokens',
    cacheSavings: '90% Active',
    latency: '< 15ms Anycast',
    badge: 'FAST & AFFORDABLE 🌟',
    color: 'from-amber-400 to-orange-500'
  },
  {
    id: 'gpt-5.5',
    name: 'GPT-5.5',
    category: 'Proven previous-generation model for coding and general work',
    baseReqs: 5000,
    contextWindow: '500k tokens',
    cacheSavings: '90% Active',
    latency: '< 18ms',
    badge: 'PROVEN',
    color: 'from-purple-400 to-indigo-500'
  }
];

const MULTIPLIERS = [1, 10, 25, 50, 100, 250];

export function LumiWorkloadVisualizer() {
  const [multiplier, setMultiplier] = useState<number>(1);
  const [filterCategory, setFilterCategory] = useState<'all' | 'flagship' | 'agentic'>('all');

  const filteredModels = OPENAI_LUMI_MODELS.filter(m => {
    if (filterCategory === 'flagship') return m.id === 'gpt-6-astra' || m.id === 'gpt-5.6-sol';
    if (filterCategory === 'agentic') return m.id === 'gpt-5.6-terra' || m.id === 'gpt-5.6-luna' || m.id === 'gpt-5.5';
    return true;
  });

  return (
    <div className="rounded-3xl border border-indigo-500/20 bg-[#07090e]/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-3">
            <Cpu className="w-3.5 h-3.5" />
            Curated OpenAI Compute Capacity Matrix
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Select Your Monthly Deposit Level
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
            See how many wholesale API requests you unlock with each compute match level across OpenAI flagship models.
          </p>
        </div>

        {/* Tier Buttons */}
        <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 shrink-0">
          {MULTIPLIERS.map((m) => {
            const isSelected = multiplier === m;
            return (
              <button
                key={m}
                onClick={() => setMultiplier(m)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/25 scale-105'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                ${m} USD
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 pt-6 pb-4 overflow-x-auto">
        {(['all', 'flagship', 'agentic'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
              filterCategory === cat
                ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-300'
                : 'bg-white/5 border border-white/5 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {cat === 'all' ? 'All Models' : cat === 'flagship' ? 'Flagship Frontier (GPT-6 Astra & Sol)' : 'Agentic & Fast (Terra, Luna, 5.5)'}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        {filteredModels.map((model) => {
          const totalRequests = Math.round(model.baseReqs * multiplier);
          return (
            <div
              key={model.id}
              className="relative p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all hover:border-indigo-500/40 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs font-mono text-zinc-500">{model.id}</span>
                    <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {model.name}
                    </h4>
                  </div>
                  {model.badge && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {model.badge}
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400 mb-4 min-h-[32px]">
                  {model.category}
                </p>

                <div className="space-y-2 py-3 border-y border-white/5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Monthly Capacity:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      ~{totalRequests.toLocaleString()} requests
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Context Window:</span>
                    <span className="font-mono text-zinc-300">{model.contextWindow}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Prompt Caching:</span>
                    <span className="font-mono text-indigo-300">{model.cacheSavings}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Edge Gateway TTFT:</span>
                    <span className="font-mono text-sky-300">{model.latency}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2">
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${model.color} rounded-full`}
                    style={{ width: `${Math.min(100, (multiplier / 250) * 100 + 10)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
