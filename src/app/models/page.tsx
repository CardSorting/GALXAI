'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';
import {
  Cpu,
  Zap,
  Rocket,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Copy,
  Check,
  Database,
  Flame,
  Award
} from 'lucide-react';

export default function ModelsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'llm' | 'image'>('all');
  const [selectedTierMultiplier, setSelectedTierMultiplier] = useState(1.0); // 1.0 (Standard), 0.95 (Scale), 0.90 (Production), 0.85 (Enterprise)
  const [tierLabel, setTierLabel] = useState('Standard Rates');
  const [copiedModelId, setCopiedModelId] = useState<string | null>(null);

  const filteredModels = EXCLUSIVE_MODEL_CATALOG.filter(m => {
    const matchesSearch =
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.provider.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeCategory === 'all') return true;
    return m.category === activeCategory;
  });

  const handleCopyModel = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedModelId(id);
    setTimeout(() => setCopiedModelId(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'Supported Models & Pricing' }]} />

        {/* Page Hero */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <Flame className="w-3.5 h-3.5" />
              <span>WHOLESALE RATES • 25%–40% BELOW DIRECT LIST</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Supported Frontier Models & Architecture Specs
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              GALXAI exclusively routes to the latest generation OpenAI Codex coding models, xAI Grok 4.5 500K multimodal reasoning, and high-fidelity visual synthesis engines with 75% prompt caching pass-through.
            </p>
          </div>
        </div>

        {/* Search, Category Filter & Live Volume Tier Selector */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 12 models, providers, context..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold self-stretch lg:self-auto justify-center">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({EXCLUSIVE_MODEL_CATALOG.length})
            </button>
            <button
              onClick={() => setActiveCategory('llm')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeCategory === 'llm'
                  ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              LLM & Reasoning (4)
            </button>
            <button
              onClick={() => setActiveCategory('image')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeCategory === 'image'
                  ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Visual Synthesis (8)
            </button>
          </div>

          {/* Live Volume Tier Selector */}
          <div className="flex items-center gap-2 self-stretch lg:self-auto justify-end">
            <span className="text-[11px] text-zinc-400 font-mono uppercase hidden sm:inline">Volume Tier:</span>
            <select
              value={selectedTierMultiplier}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSelectedTierMultiplier(val);
                setTierLabel(val === 0.85 ? 'Enterprise (+15% Rebate)' : val === 0.90 ? 'Production (+10% Rebate)' : val === 0.95 ? 'Scale (+5% Rebate)' : 'Standard Rates');
              }}
              className="py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-amber-300 font-mono font-bold focus:outline-none"
            >
              <option value={1.0} className="bg-zinc-900 text-white">Starter (Base Discount)</option>
              <option value={0.95} className="bg-zinc-900 text-white">Scale Tier (+5% Extra Rebate)</option>
              <option value={0.90} className="bg-zinc-900 text-white">Production (+10% Extra Rebate)</option>
              <option value={0.85} className="bg-zinc-900 text-white">Enterprise (+15% Extra Rebate)</option>
            </select>
          </div>
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModels.map((model) => {
            const isGrok = model.provider === 'xai-grok';
            const isImage = model.category === 'image';
            const detailHref = `/models/${model.id.replace('/', '-')}`;

            const effIn = model.inputPricePer1M * selectedTierMultiplier;
            const effOut = model.outputPricePer1M * selectedTierMultiplier;
            const effCached = model.cachedInputPricePer1M ? model.cachedInputPricePer1M * selectedTierMultiplier : null;

            return (
              <div
                key={model.id}
                className="glass-card rounded-3xl p-6 border border-white/5 space-y-4 flex flex-col justify-between group hover:border-indigo-500/30 transition-all shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isGrok
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                      }`}>
                        {isGrok ? <Rocket className="w-4 h-4" /> : <Zap className="w-4 h-4 fill-amber-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Link href={detailHref} className="font-bold text-white text-base group-hover:text-cyan-300 font-mono transition-colors">
                            {model.id}
                          </Link>
                          <button
                            onClick={() => handleCopyModel(model.id)}
                            title="Copy Model ID"
                            className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all cursor-pointer"
                          >
                            {copiedModelId === model.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-mono uppercase">{model.provider}</p>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                      -{model.discountPercentage}% OFF
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-zinc-200 line-clamp-1">{model.name}</h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {model.description}
                  </p>

                  {model.supportsReasoning && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                      <Database className="w-3 h-3" />
                      <span>75% Prompt Caching Pass-Through</span>
                    </div>
                  )}
                </div>

                {/* Specs & Pricing Strip */}
                <div className="pt-3 border-t border-white/5 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                      <span className="text-zinc-500 block text-[9px] uppercase">Input / 1M</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-zinc-500 line-through text-[10px]">${model.listPricePer1MInput?.toFixed(2)}</span>
                        <span className="text-emerald-300 font-bold">${effIn.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                      <span className="text-zinc-500 block text-[9px] uppercase">Output / 1M</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-zinc-500 line-through text-[10px]">${model.listPricePer1MOutput?.toFixed(2)}</span>
                        <span className="text-emerald-300 font-bold">${effOut.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {isImage ? 'Resolution: 1024x1024' : `Context: ${(model.contextWindowTokens / 1000).toLocaleString()}K`}
                    </span>

                    <Link
                      href={`/playground?model=${model.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer font-sans"
                    >
                      <span>Test in Sandbox</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
