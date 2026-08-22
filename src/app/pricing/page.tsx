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
  Database,
  Sliders,
  Flame,
  Clock,
  Building2,
  Award
} from 'lucide-react';

interface VolumeTier {
  id: string;
  name: string;
  monthlySpendMin: number;
  monthlySpendLabel: string;
  extraDiscountPct: number;
  badge: string;
  description: string;
  features: string[];
}

const VOLUME_TIERS: VolumeTier[] = [
  {
    id: 'starter',
    name: 'Starter Developer',
    monthlySpendMin: 0,
    monthlySpendLabel: '$0 - $250 / mo',
    extraDiscountPct: 0,
    badge: 'Standard',
    description: 'Instant access for individual developers, side projects, and early-stage prototyping.',
    features: [
      '25%–36% pooled arbitrage discounts',
      '75% prompt caching pass-through',
      'Community Slack & Discord support',
      '20 max concurrent pool streams'
    ]
  },
  {
    id: 'scale',
    name: 'Scale & Growth',
    monthlySpendMin: 250,
    monthlySpendLabel: '$250 - $1,500 / mo',
    extraDiscountPct: 5,
    badge: '+5% Extra Rebate',
    description: 'Automated volume discounts for growing AI products, SaaS platforms, and agent fleets.',
    features: [
      '30%–41% cumulative discount',
      '75% prompt caching pass-through',
      '50 max concurrent pool streams',
      'Priority hydraulic headroom leveling'
    ]
  },
  {
    id: 'production',
    name: 'Production Fleet',
    monthlySpendMin: 1500,
    monthlySpendLabel: '$1,500 - $5,000 / mo',
    extraDiscountPct: 10,
    badge: '+10% Extra Rebate',
    description: 'High-velocity production workloads requiring sub-millisecond failover and maximum throughput.',
    features: [
      '35%–46% cumulative discount',
      '80% prompt caching pass-through',
      '150 max concurrent pool streams',
      '15-minute SLA on ticket triage'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise Sovereign',
    monthlySpendMin: 5000,
    monthlySpendLabel: '$5,000+ / mo',
    extraDiscountPct: 15,
    badge: '+15% Extra Rebate',
    description: 'Custom compute pooling, dedicated high-priority shards, and custom invoice terms.',
    features: [
      '40%–51% cumulative discount',
      '85% prompt caching pass-through',
      'Unlimited fair-share concurrency',
      'Dedicated private VPC peering & SLA'
    ]
  }
];

export default function PricingPage() {
  const [inputTokensK, setInputTokensK] = useState(250); // 250k input tokens
  const [outputTokensK, setOutputTokensK] = useState(50); // 50k output tokens
  const [cachedPromptPct, setCachedPromptPct] = useState(60); // 60% of input is cached
  const [isOffPeakMode, setIsOffPeakMode] = useState(false); // 10% off-peak yield discount
  const [selectedTierId, setSelectedTierId] = useState('starter');
  const [selectedModelId, setSelectedModelId] = useState('gpt-5.6-sol');

  const selectedModel = EXCLUSIVE_MODEL_CATALOG.find(m => m.id === selectedModelId) || EXCLUSIVE_MODEL_CATALOG[0];
  const selectedTier = VOLUME_TIERS.find(t => t.id === selectedTierId) || VOLUME_TIERS[0];

  // Standard Retail List Calculation (uncached)
  const listInputRate = selectedModel.listPricePer1MInput || selectedModel.inputPricePer1M;
  const listOutputRate = selectedModel.listPricePer1MOutput || selectedModel.outputPricePer1M;
  const listInputCost = (inputTokensK / 1000) * listInputRate;
  const listOutputCost = (outputTokensK / 1000) * listOutputRate;
  const totalListCost = listInputCost + listOutputCost;

  // GALXAI Tier & Off-Peak Multipliers
  const tierRebateMultiplier = 1 - (selectedTier.extraDiscountPct / 100);
  const offPeakMultiplier = isOffPeakMode ? 0.90 : 1.0;
  const effectiveMultiplier = tierRebateMultiplier * offPeakMultiplier;

  const baseInputRate = selectedModel.inputPricePer1M * effectiveMultiplier;
  const baseOutputRate = selectedModel.outputPricePer1M * effectiveMultiplier;
  const cachedInputRate = (selectedModel.cachedInputPricePer1M || (selectedModel.inputPricePer1M * 0.25)) * effectiveMultiplier;

  // Token calculations
  const cachedInputTokensK = (inputTokensK * cachedPromptPct) / 100;
  const regularInputTokensK = inputTokensK - cachedInputTokensK;

  const galxInputCost = ((regularInputTokensK / 1000) * baseInputRate) + ((cachedInputTokensK / 1000) * cachedInputRate);
  const galxOutputCost = (outputTokensK / 1000) * baseOutputRate;
  const totalGalxCost = galxInputCost + galxOutputCost;

  const totalSaved = Math.max(0, totalListCost - totalGalxCost);
  const compoundSavingsPct = totalListCost > 0 ? Math.round(((totalListCost - totalGalxCost) / totalListCost) * 100) : 35;
  const annualizedSavings = totalSaved * 365;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-12">
        <Breadcrumbs items={[{ label: 'Models & Pricing' }]} />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-12 space-y-4 text-center max-w-4xl mx-auto relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
            <Flame className="w-3.5 h-3.5" />
            <span>ENTERPRISE DISCOUNT ARCHITECTURE • UP TO 70%+ COMPOUND SAVINGS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Predictable, High-Arbitrage AI Gateway Pricing
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            GALXAI unifies distributed Tier-5 compute slots to deliver <strong>25%–40% base discounts</strong>, <strong>75% prompt caching pass-through</strong>, and <strong>progressive volume rebates</strong> with 0 platform fees.
          </p>
        </div>

        {/* 4 Multi-Tier Volume Brackets */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Automatic Progressive Volume Tiers
              </h2>
              <p className="text-xs text-zinc-400">Rebates scale automatically with your monthly usage. No negotiations or sales calls required.</p>
            </div>
            <span className="text-xs text-zinc-400 font-mono">Select tier to preview rates:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VOLUME_TIERS.map((tier) => {
              const isSelected = selectedTierId === tier.id;
              return (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTierId(tier.id)}
                  className={`cursor-pointer rounded-2xl p-5 border transition-all space-y-3 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10'
                      : 'glass-panel border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white font-mono">{tier.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isSelected ? 'bg-amber-400 text-black' : 'bg-white/10 text-zinc-300'
                      }`}>
                        {tier.badge}
                      </span>
                    </div>
                    <div className="text-lg font-black text-amber-300 font-mono">{tier.monthlySpendLabel}</div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{tier.description}</p>
                  </div>

                  <ul className="space-y-1.5 pt-2 border-t border-white/5 text-[11px] text-zinc-300">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="line-clamp-1">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3 Pillars of GALXAI Discount Strategy */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-white/10 hover:border-emerald-500/30 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Coins className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">1. Pooled Volume Arbitrage</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Consolidated query volume unlocks Tier-5 wholesale rates, passing <strong>25%–40% instant savings</strong> directly to your API key.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-white/10 hover:border-cyan-500/30 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">2. 75% Prompt Caching Pass-Through</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Prefixes &gt;1,024 tokens receive an automatic <strong>75% prompt caching rebate</strong>. 100% of this rebate is returned directly to you.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-white/10 hover:border-amber-500/30 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">3. Off-Peak Dynamic Yield Rebate</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Batch jobs and background agents routed during high-headroom off-peak windows receive an extra <strong>10% floating rebate</strong>.
            </p>
          </div>
        </div>

        {/* Full Pricing Table with Discounts */}
        <div className="glass-panel rounded-3xl p-6 overflow-x-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                Live Model Rates & Discount Matrix ({selectedTier.name})
              </h2>
              <p className="text-xs text-zinc-400">Comparing standard retail list vs. active GALXAI discounted rates.</p>
            </div>
            <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 w-max">
              ✓ Lowest Guaranteed Market Rates
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
                <th className="py-3.5 px-4 font-sans">Effective Savings</th>
                <th className="py-3.5 px-4 text-right font-sans">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {EXCLUSIVE_MODEL_CATALOG.map((m) => {
                const isGrok = m.provider === 'xai-grok';
                const isImage = m.category === 'image';

                const effIn = m.inputPricePer1M * effectiveMultiplier;
                const effOut = m.outputPricePer1M * effectiveMultiplier;
                const effCached = m.cachedInputPricePer1M ? m.cachedInputPricePer1M * effectiveMultiplier : null;

                const baseDisc = m.discountPercentage || 25;
                const totalDisc = Math.min(65, Math.round(baseDisc + selectedTier.extraDiscountPct + (isOffPeakMode ? 10 : 0)));

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
                      ${effIn.toFixed(2)} / ${effOut.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-cyan-400 font-semibold">
                      {effCached ? `$${effCached.toFixed(2)}` : '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        -{totalDisc}%
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

        {/* Interactive Spend, Savings & Compound ROI Calculator */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                Workload Spend & Net ROI Calculator
              </h2>
              <p className="text-xs text-zinc-400">Calculate exact workload costs factoring in volume tiers, prompt caching, and off-peak yield.</p>
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
                    {m.id} (${(m.inputPricePer1M * effectiveMultiplier).toFixed(2)} in / ${(m.outputPricePer1M * effectiveMultiplier).toFixed(2)} out • -{m.discountPercentage}%)
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
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20">
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
              <p className="text-[10px] text-zinc-400">Context prefixes (&gt;1K tokens) automatically unlock a 75% prompt cache rebate.</p>
            </div>

            {/* Off-Peak Yield Toggle */}
            <div
              onClick={() => setIsOffPeakMode(!isOffPeakMode)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                isOffPeakMode
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-black/30 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Off-Peak Dynamic Yield Rebate (+10% OFF)
                </div>
                <div className="text-[10px] text-zinc-400">Enable for background batch workers and non-interactive jobs.</div>
              </div>
              <div className={`w-8 h-4 rounded-full transition-colors relative ${isOffPeakMode ? 'bg-amber-400' : 'bg-white/20'}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-black absolute top-0.25 transition-transform ${isOffPeakMode ? 'left-4' : 'left-0.5'}`} />
              </div>
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
                <span className="text-[10px] text-zinc-600">Without pooling or cache rebate</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <span className="text-[10px] text-emerald-400 uppercase font-mono">GALXAI Net Cost</span>
                <div className="text-2xl font-black text-emerald-300 font-mono">
                  ${totalGalxCost.toFixed(4)}
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">-${totalSaved.toFixed(4)} Net Saved / Query</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-300">Annualized Savings (At Daily Cadence):</span>
                <span className="text-emerald-400 font-black text-sm">${annualizedSavings.toLocaleString(undefined, { maximumFractionDigits: 2 })} / yr</span>
              </div>
              <p className="text-[10px] text-zinc-400">Based on executing this query volume 365 days/year.</p>
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
              {selectedTier.extraDiscountPct > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Volume Tier Rebate: +{selectedTier.extraDiscountPct}% off for {selectedTier.name}</span>
                </div>
              )}
              {isOffPeakMode && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Off-Peak Dynamic Yield: +10% floating discount applied</span>
                </div>
              )}
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

        {/* Transparent Market Comparison Table */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              Transparent Market Comparison (Cost for 10M Tokens on SOTA Reasoning)
            </h2>
            <p className="text-xs text-zinc-400">Direct cost benchmark assuming 5M input tokens (50% cached) + 5M output tokens on `gpt-5.6-sol`.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4 font-sans">Provider</th>
                  <th className="py-3 px-4 font-sans">Input Cost (5M)</th>
                  <th className="py-3 px-4 font-sans">Output Cost (5M)</th>
                  <th className="py-3 px-4 font-sans">Total Workload Cost</th>
                  <th className="py-3 px-4 font-sans">Routing Overhead</th>
                  <th className="py-3 px-4 font-sans">Effective Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr className="text-zinc-400">
                  <td className="py-3 px-4 font-bold text-white">Direct Retail (OpenAI)</td>
                  <td className="py-3 px-4">$15.62</td>
                  <td className="py-3 px-4">$100.00</td>
                  <td className="py-3 px-4 text-white font-bold">$115.62</td>
                  <td className="py-3 px-4">0%</td>
                  <td className="py-3 px-4 text-zinc-500">Baseline (0%)</td>
                </tr>
                <tr className="text-zinc-400">
                  <td className="py-3 px-4 font-bold text-white">OpenRouter (Standard)</td>
                  <td className="py-3 px-4">$16.40</td>
                  <td className="py-3 px-4">$105.00</td>
                  <td className="py-3 px-4 text-white font-bold">$121.40</td>
                  <td className="py-3 px-4 text-red-400">+5% Markup</td>
                  <td className="py-3 px-4 text-red-400">-5.0% (More expensive)</td>
                </tr>
                <tr className="text-zinc-400">
                  <td className="py-3 px-4 font-bold text-white">Azure OpenAI</td>
                  <td className="py-3 px-4">$15.62</td>
                  <td className="py-3 px-4">$100.00</td>
                  <td className="py-3 px-4 text-white font-bold">$115.62</td>
                  <td className="py-3 px-4">0%</td>
                  <td className="py-3 px-4 text-zinc-500">Baseline (0%)</td>
                </tr>
                <tr className="bg-emerald-500/10 border-t-2 border-emerald-500/30 text-emerald-300 font-bold">
                  <td className="py-3.5 px-4 text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    GALXAI Pooled Gateway
                  </td>
                  <td className="py-3.5 px-4 text-emerald-300">$11.72</td>
                  <td className="py-3.5 px-4 text-emerald-300">$75.00</td>
                  <td className="py-3.5 px-4 text-white font-black text-sm">$86.72</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-mono">0% Markup</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/40">
                      Save 25.0% Instant
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
