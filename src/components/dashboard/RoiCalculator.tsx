'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Coins,
  TrendingDown,
  Zap,
  ArrowRight,
  Flame,
  CheckCircle2,
  Sliders,
  Copy,
  Check,
  Building2,
  Clock,
  Database,
  Key,
  ShieldCheck,
  Layers,
  Cpu
} from 'lucide-react';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';

interface RoiCalculatorProps {
  initialMonthlySpend?: number;
  className?: string;
  showTitle?: boolean;
}

export function RoiCalculator({
  initialMonthlySpend = 2500,
  className = '',
  showTitle = true
}: RoiCalculatorProps) {
  const [monthlySpend, setMonthlySpend] = useState(initialMonthlySpend);
  const [selectedModelId, setSelectedModelId] = useState('gpt-5.6-sol');
  const [cachedPromptPct, setCachedPromptPct] = useState(60);
  const [isOffPeakMode, setIsOffPeakMode] = useState(true);
  const [copiedAudit, setCopiedAudit] = useState(false);

  const selectedModel = EXCLUSIVE_MODEL_CATALOG.find(m => m.id === selectedModelId) || EXCLUSIVE_MODEL_CATALOG[0];

  // Base list rates per 1M tokens
  const listIn = selectedModel.listPricePer1MInput || selectedModel.inputPricePer1M;
  const listOut = selectedModel.listPricePer1MOutput || selectedModel.outputPricePer1M;
  const galxIn = selectedModel.inputPricePer1M;
  const galxOut = selectedModel.outputPricePer1M;
  const galxCachedIn = selectedModel.cachedInputPricePer1M || (galxIn * 0.25);

  // Volume tier determination
  const tierExtraPct = monthlySpend >= 5000 ? 15 : monthlySpend >= 1500 ? 10 : monthlySpend >= 250 ? 5 : 0;
  const tierName = monthlySpend >= 5000 ? 'Custom Enterprise' : monthlySpend >= 1500 ? 'Production Fleet' : monthlySpend >= 250 ? 'Scale & Growth' : 'Starter Developer';

  const tierMultiplier = 1 - (tierExtraPct / 100);
  const offPeakMultiplier = isOffPeakMode ? 0.90 : 1.00;

  // Blended discount calculations
  const baseWholesaleDiscountPct = Math.round((1 - (galxIn + galxOut) / (listIn + listOut)) * 100);
  const promptCacheSavingsMultiplier = (cachedPromptPct / 100) * 0.75 * 0.5; // ~50% of input is cached
  const effectiveTotalDiscountPct = Math.min(68, Math.round(baseWholesaleDiscountPct + (promptCacheSavingsMultiplier * 100) + (isOffPeakMode ? 5 : 0) + tierExtraPct));

  // Dollar savings
  const monthlySavingsDollars = Math.round(monthlySpend * (effectiveTotalDiscountPct / 100));
  const galxDirectCost = monthlySpend - monthlySavingsDollars;
  const openRouterSurchargeCost = Math.round(monthlySpend * 1.05); // Standard 5% aggregator markup
  const annualSavingsDollars = monthlySavingsDollars * 12;

  // Matching grant calculation
  const matchGrantBonus = monthlySpend >= 1000 ? 500 : monthlySpend >= 500 ? 250 : monthlySpend >= 100 ? 50 : 25;

  const handleCopyAudit = () => {
    const auditText = `GALXAI Executive AI Spend Audit & Cost Optimization Summary
-------------------------------------------------------------
Target Model: ${selectedModel.id} (${selectedModel.name})
Current Monthly AI Spend: $${monthlySpend.toLocaleString()} USD / month
Estimated Retail / Direct Upstream Cost: $${monthlySpend.toLocaleString()} / mo
Surcharged Aggregator Cost (OpenRouter): $${openRouterSurchargeCost.toLocaleString()} / mo (+5% fee)
GALXAI Direct Wholesale Cost: $${galxDirectCost.toLocaleString()} / mo
-------------------------------------------------------------
Net Monthly Cost Reduction: $${monthlySavingsDollars.toLocaleString()} / month (-${effectiveTotalDiscountPct}%)
Net Annualized Savings: $${annualSavingsDollars.toLocaleString()} USD / year
Founding Builder Deposit Match Grant: +$${matchGrantBonus} USD in Free Inference Credits
Active Volume Tier: ${tierName} (+${tierExtraPct}% Volume Rebate)
Prompt Caching Pass-Through: ${cachedPromptPct}% Context (75% Rebate)
Latency SLA: Sub-15ms Anycast Failover with 99.99% Uptime SLA
Switch in 30 Seconds: https://galx.ai/keys/new`;

    navigator.clipboard.writeText(auditText);
    setCopiedAudit(true);
    setTimeout(() => setCopiedAudit(false), 2500);
  };

  return (
    <div className={`glass-panel rounded-3xl p-6 sm:p-10 space-y-8 border border-amber-500/25 bg-gradient-to-b from-[#0e111d] to-[#07080d] shadow-2xl ${className}`}>
      {showTitle && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-bold">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>EXECUTIVE AI COST AUDIT &amp; ARBITRAGE SIMULATOR</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Project Your Team&apos;s Bottom-Line Savings
            </h2>
            <p className="text-xs text-zinc-400 max-w-xl">
              Calculate exact wholesale price reductions across OpenAI Codex and xAI Grok 4.5 with compound prompt caching rebates.
            </p>
          </div>

          <div className="text-left sm:text-right font-mono">
            <span className="text-[10px] text-zinc-500 uppercase">Annualized Net Cash Kept</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              +${annualSavingsDollars.toLocaleString()} <span className="text-xs text-emerald-300 font-normal">/ yr</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Inputs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Model Selection Dropdown */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-zinc-300 uppercase font-mono">
              <span>1. Target AI Inference Engine</span>
              <span className="text-emerald-400">-{selectedModel.discountPercentage}% Wholesale Base</span>
            </div>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full p-3 rounded-2xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-400 cursor-pointer shadow-inner"
            >
              {EXCLUSIVE_MODEL_CATALOG.filter(m => m.category === 'llm').map(m => (
                <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                  {m.id} ({m.name}) • ${m.inputPricePer1M.toFixed(2)} in / ${m.outputPricePer1M.toFixed(2)} out ({m.provider})
                </option>
              ))}
            </select>
          </div>

          {/* Current Monthly Spend Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-300 font-bold">2. Your Current Monthly LLM / API Spend:</span>
              <span className="text-amber-300 font-bold text-sm bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                ${monthlySpend.toLocaleString()} / month
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="25000"
              step="100"
              value={monthlySpend}
              onChange={(e) => setMonthlySpend(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-2 bg-zinc-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>$100 / mo (Starter)</span>
              <span>$2,500 / mo (Growth)</span>
              <span>$10,000 / mo (Scale)</span>
              <span>$25,000+ (Enterprise)</span>
            </div>
          </div>

          {/* Prompt Caching & Off-Peak Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  Prompt Cache Ratio
                </span>
                <span className="text-cyan-300 font-bold">{cachedPromptPct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="10"
                value={cachedPromptPct}
                onChange={(e) => setCachedPromptPct(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
              <p className="text-[10px] text-zinc-500 font-mono">75% automatic discount on repeated context</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-zinc-300 font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Off-Peak Yield Rebate
                </span>
                <p className="text-[10px] text-zinc-500 font-mono">Additional 10% floating discount</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOffPeakMode(!isOffPeakMode)}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative shrink-0 ${
                  isOffPeakMode ? 'bg-emerald-600' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    isOffPeakMode ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Right Output: Executive Value Capture Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 space-y-5 shadow-xl">
            {/* Top Cost Comparison */}
            <div className="space-y-3 pb-4 border-b border-emerald-500/20 font-mono text-xs">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Standard Upstream Retail:</span>
                <span className="line-through text-zinc-400">${monthlySpend.toLocaleString()} / mo</span>
              </div>
              <div className="flex justify-between items-center text-rose-400 text-[11px]">
                <span>Aggregator (with 5% surcharge):</span>
                <span className="line-through">${openRouterSurchargeCost.toLocaleString()} / mo</span>
              </div>
              <div className="flex justify-between items-center text-white font-bold text-sm">
                <span className="text-emerald-400">GALXAI Wholesale Cost:</span>
                <span className="text-emerald-300 text-lg font-black">${galxDirectCost.toLocaleString()} / mo</span>
              </div>
            </div>

            {/* Net Savings Display */}
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold tracking-wider">
                Immediate Net Cash Saved
              </span>
              <div className="text-3xl font-black text-emerald-300 font-mono">
                ${monthlySavingsDollars.toLocaleString()} <span className="text-sm font-bold text-emerald-400">/ month</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/40">
                  {effectiveTotalDiscountPct}% Blended Margin Kept
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">{tierName}</span>
              </div>
            </div>

            {/* Grant Incentive Banner */}
            <div className="p-3.5 rounded-2xl bg-black/50 border border-amber-500/30 font-mono text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-sm shrink-0">
                  <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <span className="text-zinc-400 block text-[9px] uppercase">50% Matching Grant</span>
                  <span className="text-amber-300 font-bold">+${matchGrantBonus}.00 Free Compute Added</span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                Active
              </span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <Link
                href="/keys/new"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 font-mono cursor-pointer"
              >
                <Key className="w-4 h-4 text-black" />
                <span>Claim $5 Key + Lock In 50% Match</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </Link>

              <button
                type="button"
                onClick={handleCopyAudit}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedAudit ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{copiedAudit ? 'Executive Audit Copied to Clipboard!' : 'Copy Executive Spend Report'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
