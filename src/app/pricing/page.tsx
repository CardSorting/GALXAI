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
  Award,
  DollarSign
} from 'lucide-react';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';
import { WorkloadEstimator } from '@/components/dashboard/WorkloadEstimator';
import { TrustSeals } from '@/components/common/TrustSeals';
import { SavingsJackpotReel } from '@/components/dashboard/SavingsJackpotReel';
import { SpendAuditTool } from '@/components/dashboard/SpendAuditTool';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

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
      '25%–36% wholesale discounts',
      '75% prompt caching pass-through',
      'Community Slack & Discord support',
      '20 max concurrent streams'
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
      '50 max concurrent streams',
      'Priority low-latency routing'
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
      '150 max concurrent streams',
      '15-minute SLA on ticket triage'
    ]
  },
  {
    id: 'enterprise',
    name: 'Custom Enterprise',
    monthlySpendMin: 5000,
    monthlySpendLabel: '$5,000+ / mo',
    extraDiscountPct: 15,
    badge: '+15% Extra Rebate',
    description: 'Custom enterprise volume agreements, dedicated routing tiers, and flexible invoice terms.',
    features: [
      '40%–51% maximum discount',
      '85% prompt caching pass-through',
      'Unlimited concurrent streams',
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
  const totalRetailCost = listInputCost + listOutputCost;

  // GALXAI Discounted Rates with Prompt Caching & Tier Rebate
  const tierMultiplier = 1 - (selectedTier.extraDiscountPct / 100);
  const offPeakMultiplier = isOffPeakMode ? 0.90 : 1.00;

  // Cached input is discounted by 75% relative to input base
  const cachedInputRate = selectedModel.cachedInputPricePer1M || (selectedModel.inputPricePer1M * 0.25);
  const effectiveBaseInputRate = selectedModel.inputPricePer1M * tierMultiplier * offPeakMultiplier;
  const effectiveCachedInputRate = cachedInputRate * tierMultiplier * offPeakMultiplier;
  const effectiveOutputRate = selectedModel.outputPricePer1M * tierMultiplier * offPeakMultiplier;

  const cachedInputTokensK = (inputTokensK * (cachedPromptPct / 100));
  const uncachedInputTokensK = inputTokensK - cachedInputTokensK;

  const galxInputCost = ((uncachedInputTokensK / 1000) * effectiveBaseInputRate) + ((cachedInputTokensK / 1000) * effectiveCachedInputRate);
  const galxOutputCost = (outputTokensK / 1000) * effectiveOutputRate;
  const totalGalxCost = galxInputCost + galxOutputCost;

  const totalSavedDollars = Math.max(0, totalRetailCost - totalGalxCost);
  const totalSavedPct = totalRetailCost > 0 ? ((totalSavedDollars / totalRetailCost) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-12">
        <Breadcrumbs items={[{ label: 'Transparent Pricing & Discounts' }]} />

        {/* Page Hero */}
        <div className="glass-panel rounded-3xl p-6 sm:p-12 relative overflow-hidden text-center space-y-6">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
            <Coins className="w-3.5 h-3.5" />
            <span>WHOLESALE VOLUME DISCOUNTS • 75% PROMPT CACHING • ZERO MARKUP</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Direct Wholesale AI Rates with 0% Markup &amp; 429 Protection
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mx-auto">
              Save <strong className="text-emerald-300 font-semibold">25% to 40%</strong> off direct retail prices across OpenAI GPT-5.6 Sol, Terra, Luna, and Grok 4.6. Up to <strong className="text-amber-300 font-semibold">70%+ total net savings</strong> with compound 75% prompt caching.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/keys/new"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Get Started with $5 Free Compute</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/docs/quickstart"
              className="px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>View API Quickstart</span>
            </Link>
          </div>
        </div>

        {/* 3 Value Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-white/10 hover:border-emerald-500/30 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Coins className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">1. Wholesale Volume Pricing</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Consolidated query volume unlocks wholesale rates, passing <strong>25%–40% instant savings</strong> directly to your API key.
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

        {/* 4 Automatic Volume Tiers */}
        <div className="space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-white">Automatic Volume Tiers & Progressive Rebates</h2>
            <p className="text-xs text-zinc-400">No annual lock-in or sales calls. Your tier automatically updates based on 30-day trailing spend.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VOLUME_TIERS.map((tier) => {
              const isSelected = selectedTierId === tier.id;
              return (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTierId(tier.id)}
                  className={`cursor-pointer rounded-3xl p-6 border transition-all space-y-4 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-xl shadow-amber-500/10 scale-[1.02]'
                      : 'bg-black/30 border-white/10 hover:border-white/20'
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

        {/* Founding Cohort Rate Lock & Capacity Ribbon */}
        <RateLockRibbon />

        {/* Casino-Grade Savings Winnings Jackpot & Multiplier Reel */}
        <ErrorBoundary name="Savings Jackpot Reel" autoRetry={true}>
          <SavingsJackpotReel />
        </ErrorBoundary>

        {/* Instant Monthly Invoice Spend Audit Tool */}
        <ErrorBoundary name="Spend Audit Tool" autoRetry={true}>
          <SpendAuditTool />
        </ErrorBoundary>

        {/* Non-Technical Real-World Business Workload Spend Translator */}
        <ErrorBoundary name="Workload Estimator" autoRetry={true}>
          <WorkloadEstimator />
        </ErrorBoundary>

        {/* Interactive Compound Savings Simulator */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-8 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                <Sliders className="w-3 h-3" />
                <span>INTERACTIVE REBATE SIMULATOR</span>
              </div>
              <h2 className="text-xl font-bold text-white">Simulate Your Workload's Net Savings</h2>
              <p className="text-xs text-zinc-400">Configure prompt caching ratios, volume tiers, and off-peak execution to project bottom-line costs.</p>
            </div>

            {/* Model Selector */}
            <div className="w-full sm:w-64">
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Target AI Engine</label>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-amber-300 font-mono font-bold focus:outline-none"
              >
                {EXCLUSIVE_MODEL_CATALOG.filter(m => m.category === 'llm').map(m => (
                  <option key={m.id} value={m.id} className="bg-zinc-900 text-white font-mono">
                    {m.id} ({m.provider})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 1-Click Mental Model Stack Presets */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick Workload Presets (Meet Your Stack):</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">Instant 1-Click Projection</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <button
                onClick={() => {
                  setInputTokensK(60);
                  setOutputTokensK(15);
                  setCachedPromptPct(70);
                  setSelectedModelId('gpt-5.6-sol');
                  setSelectedTierId('starter');
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all cursor-pointer"
              >
                <span>🧑‍💻 Solo Dev / Cursor ($50/mo)</span>
              </button>

              <button
                onClick={() => {
                  setInputTokensK(300);
                  setOutputTokensK(60);
                  setCachedPromptPct(65);
                  setSelectedModelId('gpt-5.6-sol');
                  setSelectedTierId('scale');
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
              >
                <span>🚀 SaaS App / Support Bot ($500/mo)</span>
              </button>

              <button
                onClick={() => {
                  setInputTokensK(750);
                  setOutputTokensK(120);
                  setCachedPromptPct(80);
                  setSelectedModelId('gpt-5.6-terra');
                  setSelectedTierId('production');
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
              >
                <span>⚡ Agent Fleet / Code Swarm ($2,500/mo)</span>
              </button>

              <button
                onClick={() => {
                  setInputTokensK(950);
                  setOutputTokensK(180);
                  setCachedPromptPct(90);
                  setSelectedModelId('gpt-5.6-luna');
                  setSelectedTierId('enterprise');
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer"
              >
                <span>🏢 High-Volume Ingestion ($10,000+/mo)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Controls */}
            <div className="lg:col-span-7 space-y-6">
              {/* Input Tokens */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400">Input Tokens per Request / Job:</span>
                  <span className="text-white font-bold">{inputTokensK.toLocaleString()}K tokens</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={inputTokensK}
                  onChange={(e) => setInputTokensK(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Output Tokens */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400">Output Tokens per Request / Job:</span>
                  <span className="text-white font-bold">{outputTokensK.toLocaleString()}K tokens</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={outputTokensK}
                  onChange={(e) => setOutputTokensK(Number(e.target.value))}
                  className="w-full accent-indigo-400 cursor-pointer"
                />
              </div>

              {/* Prompt Cache Ratio */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400">Prompt Caching Prefix Match:</span>
                  <span className="text-cyan-300 font-bold">{cachedPromptPct}% Cached (75% Rebate)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={cachedPromptPct}
                  onChange={(e) => setCachedPromptPct(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Off-Peak Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Off-Peak Dynamic Yield (+10% Floating Rebate)
                  </span>
                  <p className="text-[11px] text-zinc-400">Apply non-rush hour scheduling for asynchronous agent queues</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOffPeakMode(!isOffPeakMode)}
                  className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative ${
                    isOffPeakMode ? 'bg-amber-500' : 'bg-zinc-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-black transition-transform absolute top-1 ${
                    isOffPeakMode ? 'left-6' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Right Summary Card */}
            <div className="lg:col-span-5 glass-panel rounded-3xl p-6 space-y-6 border border-emerald-500/30 bg-emerald-500/5 shadow-2xl">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold">Estimated Cost Comparison</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-zinc-400 font-mono">Retail List Price:</span>
                  <span className="text-sm font-bold text-zinc-500 line-through font-mono">${totalRetailCost.toFixed(3)}</span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs font-bold text-white font-mono">GALXAI Net Cost:</span>
                  <span className="text-2xl font-black text-emerald-300 font-mono">${totalGalxCost.toFixed(3)}</span>
                </div>
              </div>

              {/* Savings Ribbon */}
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-center space-y-1">
                <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold">Total Net Savings</span>
                <div className="text-3xl font-black text-emerald-300 font-mono">
                  {totalSavedPct.toFixed(1)}% OFF
                </div>
                <p className="text-[11px] text-emerald-400/80 font-mono">
                  You save <strong>${totalSavedDollars.toFixed(3)}</strong> on this workload
                </p>
              </div>

              <Link
                href="/keys/new"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all font-mono"
              >
                <span>Deploy with $5 Free Credit</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
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
            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Tier Discount: -{selectedTier.extraDiscountPct}%
            </span>
          </div>

          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4 font-sans">Model Engine</th>
                <th className="py-3 px-4 font-sans">Provider</th>
                <th className="py-3 px-4 font-sans">Context</th>
                <th className="py-3 px-4 font-sans">Retail List In</th>
                <th className="py-3 px-4 font-sans">GALXAI Input / 1M</th>
                <th className="py-3 px-4 font-sans">Cached In / 1M</th>
                <th className="py-3 px-4 font-sans">GALXAI Output / 1M</th>
                <th className="py-3 px-4 font-sans">Base Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {EXCLUSIVE_MODEL_CATALOG.map((m) => {
                const effIn = m.inputPricePer1M * tierMultiplier;
                const effOut = m.outputPricePer1M * tierMultiplier;
                const effCached = (m.cachedInputPricePer1M || m.inputPricePer1M * 0.25) * tierMultiplier;

                return (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <Link href={`/models/${m.id.replace('/', '-')}`} className="hover:text-cyan-300">
                        {m.id}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 uppercase text-[10px]">{m.provider}</td>
                    <td className="py-3.5 px-4 text-zinc-300">
                      {m.category === 'image' ? '1024x1024' : `${(m.contextWindowTokens / 1000).toLocaleString()}K`}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 line-through">
                      ${m.listPricePer1MInput?.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-300 font-bold">
                      ${effIn.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-cyan-300">
                      ${effCached.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-300 font-bold">
                      ${effOut.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                        -{m.discountPercentage}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Competitor Benchmark Matrix */}
        <div className="glass-panel rounded-3xl p-6 overflow-x-auto space-y-4 border border-white/10">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              Market Competitor Benchmark (Cost per 10M Tokens on GPT-5.6 Sol)
            </h2>
            <p className="text-xs text-zinc-400">Assumes standard 5M Input (50% cached) + 5M Output workload.</p>
          </div>

          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4 font-sans">Provider</th>
                <th className="py-3 px-4 font-sans">Input Cost</th>
                <th className="py-3 px-4 font-sans">Output Cost</th>
                <th className="py-3 px-4 font-sans">Routing Fees</th>
                <th className="py-3 px-4 font-sans">Total Net Cost</th>
                <th className="py-3 px-4 font-sans">Savings vs Direct</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3.5 px-4 text-zinc-400">Direct OpenAI API</td>
                <td className="py-3.5 px-4 text-zinc-300">$21.88</td>
                <td className="py-3.5 px-4 text-zinc-300">$93.74</td>
                <td className="py-3.5 px-4 text-zinc-400">$0.00</td>
                <td className="py-3.5 px-4 text-zinc-300 font-bold">$115.62</td>
                <td className="py-3.5 px-4 text-zinc-500">Baseline (0%)</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-3.5 px-4 text-zinc-400">OpenRouter</td>
                <td className="py-3.5 px-4 text-zinc-300">$22.97</td>
                <td className="py-3.5 px-4 text-zinc-300">$98.43</td>
                <td className="py-3.5 px-4 text-red-400">+$5.78 (+5%)</td>
                <td className="py-3.5 px-4 text-red-300 font-bold">$121.40</td>
                <td className="py-3.5 px-4 text-red-400">+5.0% Surcharge</td>
              </tr>
              <tr className="bg-emerald-500/10 font-bold">
                <td className="py-3.5 px-4 text-emerald-300">GALXAI Wholesale Clearinghouse</td>
                <td className="py-3.5 px-4 text-emerald-300">$16.41</td>
                <td className="py-3.5 px-4 text-emerald-300">$70.31</td>
                <td className="py-3.5 px-4 text-emerald-400">$0.00 (Zero Fee)</td>
                <td className="py-3.5 px-4 text-emerald-300 text-sm">$86.72</td>
                <td className="py-3.5 px-4 text-emerald-400">Save $28.90 (25.0% Net)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Consumer-Grade Trust Seals & Confidence Badges */}
        <TrustSeals />
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
      <ErrorBoundary name="Floating Conversion Dock">
        <FloatingConversionDock />
      </ErrorBoundary>
      <ErrorBoundary name="Live Activity Toast">
        <LiveActivityToast />
      </ErrorBoundary>
      <ErrorBoundary name="Exit Intent Modal">
        <ExitIntentModal />
      </ErrorBoundary>
    </div>
  );
}
