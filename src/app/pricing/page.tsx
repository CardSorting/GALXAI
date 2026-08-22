'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';
import {
  CreditCard,
  Zap,
  Rocket,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  Terminal,
  Key,
  TrendingDown,
  Percent,
  ShieldCheck,
  Coins,
  Gauge,
  Database
} from 'lucide-react';

export default function PricingPage() {
  const [inputTokensK, setInputTokensK] = useState(100); // 100k input tokens
  const [outputTokensK, setOutputTokensK] = useState(25); // 25k output tokens
  const [cachedPromptPct, setCachedPromptPct] = useState(50); // 50% of input is cached
  const [selectedModelId, setSelectedModelId] = useState('gpt-5.6-sol');

  const selectedModel = EXCLUSIVE_MODEL_CATALOG.find(m => m.id === selectedModelId) || EXCLUSIVE_MODEL_CATALOG[0];

  // Standard List Calculation (uncached)
  const listInputCost = (inputTokensK / 1000) * (selectedModel.listPricePer1MInput || selectedModel.inputPricePer1M);
  const listOutputCost = (outputTokensK / 1000) * (selectedModel.listPricePer1MOutput || selectedModel.outputPricePer1M);
  const totalListCost = listInputCost + listOutputCost;

  // GALXAI Compound Calculation (with prompt caching rebate)
  const cachedInputTokensK = (inputTokensK * cachedPromptPct) / 100;
  const regularInputTokensK = inputTokensK - cachedInputTokensK;

  const cachedInputRate = selectedModel.cachedInputPricePer1M || (selectedModel.inputPricePer1M * 0.25);
  const galxInputCost = ((regularInputTokensK / 1000) * selectedModel.inputPricePer1M) + ((cachedInputTokensK / 1000) * cachedInputRate);
  const galxOutputCost = (outputTokensK / 1000) * selectedModel.outputPricePer1M;
  const totalGalxCost = galxInputCost + galxOutputCost;

  const totalSaved = Math.max(0, totalListCost - totalGalxCost);
  const compoundSavingsPct = totalListCost > 0 ? Math.round(((totalListCost - totalGalxCost) / totalListCost) * 100) : selectedModel.discountPercentage || 25;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs items={[{ label: 'Models & Pricing' }]} />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-12 space-y-4 text-center max-w-3xl mx-auto relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>INTELLIGENT DISCOUNT STRATEGY • 25% TO 40% BELOW DIRECT RETAIL</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">Transparent Frontier Model Pricing</h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            GALXAI combines <strong>pooled compute infrastructure arbitrage</strong>, <strong>75% prompt caching pass-through</strong>, and <strong>zero platform markups</strong> to deliver maximum cost efficiency across 12 flagship models.
          </p>
        </div>

        {/* 3 Pillars of GALXAI Discount Strategy */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-white/10 hover:border-emerald-500/30 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Coins className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white">1. Pooled Volume Arbitrage</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              By pooling distributed enterprise compute slots, GALXAI secures high-tier upstream volume brackets and passes <strong>25%–40% direct discounts</strong> to every developer key.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-white/10 hover:border-cyan-500/30 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white">2. 75% Prompt Caching Pass-Through</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Repeated context prefixes, system instructions, and RAG contexts (&gt;1,024 tokens) are automatically cached and billed at a <strong>75% rebate</strong> on input tokens.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-white/10 hover:border-amber-500/30 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Gauge className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white">3. Zero Platform Surcharges</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              No subscription gates, seat taxes, or artificial streaming surcharges. You pay strictly for net tokens consumed at discounted rates.
            </p>
          </div>
        </div>

        {/* Full Pricing Table with Discounts */}
        <div className="glass-panel rounded-3xl p-6 overflow-x-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                Live Model Rates & Discount Matrix
              </h2>
              <p className="text-xs text-zinc-400">Comparing standard retail list vs. GALXAI discounted rates per 1M tokens.</p>
            </div>
            <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 w-max">
              ✓ Guaranteed Lowest Rates
            </span>
          </div>

          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                <th className="py-3.5 px-4 font-sans">Model</th>
                <th className="py-3.5 px-4 font-sans">Provider</th>
                <th className="py-3.5 px-4 font-sans">Context</th>
                <th className="py-3.5 px-4 font-sans">Retail List Rate</th>
                <th className="py-3.5 px-4 font-sans">GALXAI Rate (In / Out)</th>
                <th className="py-3.5 px-4 font-sans">Cached Input</th>
                <th className="py-3.5 px-4 font-sans">Savings</th>
                <th className="py-3.5 px-4 text-right font-sans">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {EXCLUSIVE_MODEL_CATALOG.map((m) => {
                const isGrok = m.provider === 'xai-grok';
                const isImage = m.category === 'image';
                return (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isGrok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {isGrok ? <Rocket className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 fill-amber-400" />}
                        </div>
                        <div>
                          <Link href={`/models/${m.id.replace('/', '-')}`} className="font-bold text-white hover:text-cyan-300 font-mono transition-colors">
                            {m.id}
                          </Link>
                          <div className="text-[10px] text-zinc-500 font-sans line-clamp-1">{m.name}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 uppercase text-zinc-400">
                      {m.provider}
                    </td>

                    <td className="py-3.5 px-4 text-cyan-300 font-bold">
                      {isImage ? 'Visual' : `${(m.contextWindowTokens / 1000).toLocaleString()}K`}
                    </td>

                    <td className="py-3.5 px-4 text-zinc-500 line-through">
                      ${m.listPricePer1MInput?.toFixed(2)} / ${m.listPricePer1MOutput?.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-emerald-300 font-bold">
                      ${m.inputPricePer1M.toFixed(2)} / ${m.outputPricePer1M.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-cyan-400 font-semibold">
                      {m.cachedInputPricePer1M ? `$${m.cachedInputPricePer1M.toFixed(2)}` : '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        -{m.discountPercentage}%
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/playground?model=${m.id}`}
                        className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-sans text-xs transition-colors inline-block"
                      >
                        Test
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Interactive Spend & Savings Calculator */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                Workload Spend & Savings Calculator
              </h2>
              <p className="text-xs text-zinc-400">Estimate how much you save on GALXAI with compound prompt caching rebates.</p>
            </div>

            {/* Model Selector */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5 font-mono">Select Target Model</label>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono focus:outline-none"
              >
                {EXCLUSIVE_MODEL_CATALOG.map(m => (
                  <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                    {m.id} (${m.inputPricePer1M.toFixed(2)} in / ${m.outputPricePer1M.toFixed(2)} out • -{m.discountPercentage}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Input Tokens Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400 uppercase">Input Token Volume</span>
                <span className="text-white font-bold">{inputTokensK.toLocaleString()}K Tokens</span>
              </div>
              <input
                type="range"
                min="10"
                max="5000"
                step="10"
                value={inputTokensK}
                onChange={(e) => setInputTokensK(parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Output Tokens Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400 uppercase">Output Token Volume</span>
                <span className="text-white font-bold">{outputTokensK.toLocaleString()}K Tokens</span>
              </div>
              <input
                type="range"
                min="5"
                max="1000"
                step="5"
                value={outputTokensK}
                onChange={(e) => setOutputTokensK(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Prompt Caching Slider */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/20">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-cyan-300 uppercase font-bold flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  Cached Prompt Proportion
                </span>
                <span className="text-cyan-300 font-bold">{cachedPromptPct}% Cached</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={cachedPromptPct}
                onChange={(e) => setCachedPromptPct(parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[10px] text-zinc-400">Repeated system instructions and RAG documents benefit from 75% cache discount.</p>
            </div>
          </div>

          {/* Results Summary */}
          <div className="lg:col-span-6 glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-emerald-500/30 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white font-mono">Cost Breakdown & Net Savings</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40">
                Total Net Savings: {compoundSavingsPct}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase font-mono">Standard List Retail</span>
                <div className="text-xl font-bold text-zinc-400 line-through font-mono">
                  ${totalListCost.toFixed(4)}
                </div>
                <span className="text-[10px] text-zinc-600">Without volume discount</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <span className="text-[10px] text-emerald-400 uppercase font-mono">GALXAI Net Cost</span>
                <div className="text-2xl font-black text-emerald-300 font-mono">
                  ${totalGalxCost.toFixed(4)}
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">-${totalSaved.toFixed(4)} Net Saved</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Base volume discount: -{selectedModel.discountPercentage}% on all tokens</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Prompt caching rebate applied to {cachedPromptPct}% of input volume</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Sub-15ms automated failover across pooled upstream shards</span>
              </div>
            </div>

            <Link
              href="/keys/new"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Key className="w-4 h-4 text-black" />
              <span>Get API Key & Lock In Rates</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
