'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/ModelCatalog';
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  Cpu,
  TrendingDown,
  Coins,
  Database,
  Sliders,
  Clock,
  Users2,
  Building2,
  ShieldCheck,
  Lock,
  CreditCard,
  Layers,
  Sparkles,
  Check,
  X,
  HelpCircle,
  BarChart3
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
import {
  VOLUME_TIERS,
  SEAT_TIERS,
  ROLE_PERMISSIONS,
  SEAT_BENCHMARKS,
  PLAN_COMPARISONS,
  type VolumeTier,
  type SeatTier
} from '@/lib/data/pricingData';

export function PricingClient() {
  // Navigation tab: 'seats' vs 'tokens'
  const [pricingMode, setPricingMode] = useState<'seats' | 'tokens'>('seats');

  // Token simulator state
  const [inputTokensK, setInputTokensK] = useState(250);
  const [outputTokensK, setOutputTokensK] = useState(50);
  const [cachedPromptPct, setCachedPromptPct] = useState(60);
  const [isOffPeakMode, setIsOffPeakMode] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState('starter');
  const [selectedModelId, setSelectedModelId] = useState('gpt-5.6-sol');

  // Seat calculator state
  const [simulatedSeats, setSimulatedSeats] = useState(10);
  const [simulatedMonthlySpend, setSimulatedMonthlySpend] = useState(1500);

  const selectedModel = FRONTEND_VISIBLE_MODELS.find(m => m.id === selectedModelId) || FRONTEND_VISIBLE_MODELS[0];
  const selectedTier = VOLUME_TIERS.find(t => t.id === selectedTierId) || VOLUME_TIERS[0];

  // Token calculations
  const listInputRate = selectedModel.listPricePer1MInput || selectedModel.inputPricePer1M;
  const listOutputRate = selectedModel.listPricePer1MOutput || selectedModel.outputPricePer1M;
  const listInputCost = (inputTokensK / 1000) * listInputRate;
  const listOutputCost = (outputTokensK / 1000) * listOutputRate;
  const totalRetailCost = listInputCost + listOutputCost;

  const tierMultiplier = 1 - (selectedTier.extraDiscountPct / 100);
  const offPeakMultiplier = isOffPeakMode ? 0.90 : 1.00;

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

  // Dual Seat + Token Savings Calculations
  // Competitor setup: OpenAI Team ($25/seat) + Anthropic Team ($30/seat) + retail token costs with 0% wholesale discount
  const competitorSeatCosts = simulatedSeats * (25 + 30); // $55/seat for separate portals
  const competitorTotalMonthly = competitorSeatCosts + simulatedMonthlySpend;

  // GALXAI setup:
  // Base plan ($75 includes 5 seats, extra $15/seat) + wholesale token savings (approx 28% net savings on compute)
  const galxBasePlanCost = simulatedSeats <= 1
    ? 0
    : simulatedSeats <= 25
      ? 75 + Math.max(0, simulatedSeats - 5) * 15
      : 499 + Math.max(0, simulatedSeats - 25) * 10;

  const galxIncludedCredits = simulatedSeats <= 1 ? 30 : simulatedSeats <= 25 ? 100 : 600;
  const netPayableCompute = Math.max(0, (simulatedMonthlySpend * 0.72) - galxIncludedCredits);
  const galxTotalMonthly = galxBasePlanCost + netPayableCompute;

  const seatNetMonthlySavings = Math.max(0, competitorTotalMonthly - galxTotalMonthly);
  const seatNetAnnualSavings = seatNetMonthlySavings * 12;
  const seatSavingsPct = competitorTotalMonthly > 0 ? ((seatNetMonthlySavings / competitorTotalMonthly) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-12">
        <Breadcrumbs items={[{ label: 'Transparent Pricing & Plans' }]} />

        {/* Page Hero */}
        <section id="pricing-hero" className="glass-panel rounded-3xl p-6 sm:p-12 relative overflow-hidden text-center space-y-6">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
            <Coins className="w-3.5 h-3.5" />
            <span>WHOLESALE VOLUME DISCOUNTS • TEAM &amp; ENTERPRISE SEATS • 75% PROMPT CACHING</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Predictable AI Infrastructure for Teams &amp; Scale
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mx-auto">
              Choose between <strong className="text-amber-300 font-semibold">Small Business &amp; Enterprise Team Seats</strong> with unified governance, or <strong className="text-emerald-300 font-semibold">Pay-As-You-Go wholesale tokens</strong> with 0% markups and sub-15ms Anycast routing.
            </p>
          </div>

          {/* Primary View Switcher: Team & Enterprise Seats vs Token Rates */}
          <div className="flex items-center justify-center pt-2">
            <div className="p-1.5 rounded-2xl bg-black/60 border border-white/15 flex items-center gap-2 font-mono text-xs">
              <button
                onClick={() => setPricingMode('seats')}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  pricingMode === 'seats'
                    ? 'bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Users2 className="w-4 h-4" />
                <span>Small Business &amp; Enterprise Seats</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${pricingMode === 'seats' ? 'bg-black/20 text-black' : 'bg-amber-500/20 text-amber-300'}`}>
                  POPULAR
                </span>
              </button>

              <button
                onClick={() => setPricingMode('tokens')}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  pricingMode === 'tokens'
                    ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>Wholesale Token Rates (Pay-As-You-Go)</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* VIEW 1: TEAM & ENTERPRISE SEAT PLANS                                      */}
        {/* ========================================================================= */}
        {pricingMode === 'seats' && (
          <div className="space-y-12 animate-in fade-in duration-200">
            {/* 3 Main Seat Tier Cards */}
            <section id="seat-plans" className="space-y-6">
              <div className="text-center space-y-2 max-w-2xl mx-auto">
                <h2 className="text-2xl font-black text-white">Team Workspace Plans &amp; Seat Governance</h2>
                <p className="text-xs text-zinc-400">
                  Shared Shard Vaults, individual employee spend caps, pooled compute credits, and enterprise SAML SSO.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {SEAT_TIERS.map((tier) => (
                  <div
                    key={tier.id}
                    className={`glass-panel rounded-3xl p-6 sm:p-8 border transition-all flex flex-col justify-between space-y-6 relative ${
                      tier.isPopular ? 'border-amber-500/50 bg-amber-500/5 shadow-2xl shadow-amber-500/10 scale-[1.02]' : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {tier.badge && (
                      <div className="absolute -top-3 left-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider shadow-md ${
                          tier.isPopular ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black' : 'bg-white/10 text-zinc-300 border border-white/20'
                        }`}>
                          {tier.badge}
                        </span>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-1 pt-1">
                        <h3 className="text-lg font-bold text-white font-sans">{tier.name}</h3>
                        <p className="text-xs text-zinc-400 font-sans">{tier.audience}</p>
                      </div>

                      <div className="space-y-1 font-mono">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl sm:text-4xl font-black text-white">${tier.basePriceUsd}</span>
                          <span className="text-xs text-zinc-400">/ month</span>
                        </div>
                        <div className="text-xs text-amber-300 font-semibold">
                          {tier.includedSeats} Seats Included {tier.perSeatPriceUsd > 0 && `(+$${tier.perSeatPriceUsd}/extra seat)`}
                        </div>
                        <div className="text-[11px] text-emerald-400">
                          +${tier.includedMonthlyComputeCredits}/mo free pooled compute credits
                        </div>
                      </div>

                      <p className="text-xs text-zinc-300 font-sans leading-relaxed pt-2 border-t border-white/5">
                        {tier.tagline}
                      </p>

                      <ul className="space-y-2.5 pt-2 text-xs font-sans text-zinc-300">
                        {tier.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2">
                            {f.included ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <X className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <strong className={f.included ? 'text-white' : 'text-zinc-500 line-through'}>{f.title}</strong>
                              <p className="text-[11px] text-zinc-400">{f.description}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link
                      href={tier.ctaHref}
                      className={`w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                        tier.isPopular
                          ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black shadow-amber-500/20'
                          : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                      }`}
                    >
                      <span>{tier.ctaText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </section>

            {/* Interactive Dual Seat + Token Savings Simulator */}
            <section id="dual-savings-calculator" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-8 border border-amber-500/30 bg-gradient-to-b from-[#0e111d] to-[#07080d] shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                    <Sliders className="w-3 h-3" />
                    <span>TEAM &amp; SEAT ROI SIMULATOR</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">Compare Team Seat Costs vs Fragmented Portals</h2>
                  <p className="text-xs text-zinc-400">
                    See how consolidating your engineering seats and token compute into GALXAI saves thousands every month.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Controls */}
                <div className="lg:col-span-7 space-y-6 font-mono text-xs">
                  {/* Number of Seats Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Active Engineering / AI Team Seats:</span>
                      <span className="text-white font-bold text-sm">{simulatedSeats} Seats</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="100"
                      step="1"
                      value={simulatedSeats}
                      onChange={(e) => setSimulatedSeats(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>2 Seats (Startup)</span>
                      <span>25 Seats (Scale-Up)</span>
                      <span>100 Seats (Fleet)</span>
                    </div>
                  </div>

                  {/* Monthly AI Token Spend */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Projected Monthly AI Inference Token Spend:</span>
                      <span className="text-emerald-400 font-bold text-sm">${simulatedMonthlySpend.toLocaleString()} / mo</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="10000"
                      step="100"
                      value={simulatedMonthlySpend}
                      onChange={(e) => setSimulatedMonthlySpend(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>$100 / mo</span>
                      <span>$2,500 / mo</span>
                      <span>$10,000+ / mo</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                    <span className="text-[11px] font-bold text-zinc-300 font-sans flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      What replaces fragmented subscriptions?
                    </span>
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                      Instead of paying <strong>$25/mo per dev for OpenAI Team</strong> + <strong>$30/mo per dev for Anthropic Team</strong> + retail token costs, GALXAI provides unified multi-model routing under one shared seat workspace with wholesale liquidity rates.
                    </p>
                  </div>
                </div>

                {/* Right KPI Card */}
                <div className="lg:col-span-5 glass-panel rounded-3xl p-6 space-y-6 border border-amber-500/40 bg-amber-500/5 shadow-2xl">
                  <div className="space-y-2 font-mono">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Consolidated Spend Comparison</span>
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Fragmented Portals (OpenAI + Anthropic):</span>
                      <span className="text-zinc-500 line-through">${competitorTotalMonthly.toLocaleString()} / mo</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-white pt-1">
                      <span>GALXAI Unified Workspace:</span>
                      <span className="text-2xl font-black text-amber-300">${Math.round(galxTotalMonthly).toLocaleString()} / mo</span>
                    </div>
                  </div>

                  {/* Savings Ribbon */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/40 text-center space-y-1 font-mono">
                    <span className="text-[10px] text-amber-300 uppercase font-bold">Net Margin Saved</span>
                    <div className="text-3xl font-black text-emerald-300">
                      ${Math.round(seatNetMonthlySavings).toLocaleString()} / mo
                    </div>
                    <p className="text-[11px] text-emerald-400 font-semibold">
                      ${Math.round(seatNetAnnualSavings).toLocaleString()} USD Annual Net Savings (-{seatSavingsPct.toFixed(0)}%)
                    </p>
                  </div>

                  <Link
                    href="/teams/seats?tier=small-business"
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all font-mono"
                  >
                    <span>Provision Team Seats ($100 Credit)</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </section>

            {/* Competitor Seat Benchmark Comparison */}
            <section id="competitor-benchmarks" className="glass-panel rounded-3xl p-6 overflow-x-auto space-y-4 border border-white/10">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  Competitor Seat License &amp; Compute Benchmark (10 Seats + $1,000 Inference Spend)
                </h2>
                <p className="text-xs text-zinc-400">Comparing total monthly cost of ownership across popular dev tools.</p>
              </div>

              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4 font-sans">Provider Solution</th>
                    <th className="py-3 px-4 font-sans">Seat Fee / mo</th>
                    <th className="py-3 px-4 font-sans">Total Monthly Cost</th>
                    <th className="py-3 px-4 font-sans">GALXAI Net Cost</th>
                    <th className="py-3 px-4 font-sans">Annual Cash Savings</th>
                    <th className="py-3 px-4 font-sans">Key Limitation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {SEAT_BENCHMARKS.map((b, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{b.competitor}</td>
                      <td className="py-3.5 px-4 text-zinc-300">${b.perSeatCostMonthly.toFixed(2)}/seat</td>
                      <td className="py-3.5 px-4 text-zinc-400">${b.monthlyCostFor10SeatsAnd1kSpend.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-emerald-300 font-bold">${b.galxaiMonthlyCostForSame.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-emerald-400 font-bold">
                        Save ${b.annualSavings.toLocaleString()} / yr
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-zinc-400 font-sans max-w-xs">{b.keyLimitation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Detailed Feature Comparison Matrix */}
            <section id="feature-matrix" className="glass-panel rounded-3xl p-6 overflow-x-auto space-y-6 border border-white/10">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  Full Feature Matrix: Solo vs Small Business vs Enterprise
                </h2>
                <p className="text-xs text-zinc-400">Complete architectural breakdown of security, governance, and infrastructure features.</p>
              </div>

              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px] font-mono">
                    <th className="py-3 px-4 w-1/3">Feature</th>
                    <th className="py-3 px-4 text-center">Solo Developer</th>
                    <th className="py-3 px-4 text-center text-amber-400">Small Business ($75)</th>
                    <th className="py-3 px-4 text-center text-cyan-400">Enterprise Fleet ($499)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {PLAN_COMPARISONS.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 space-y-0.5">
                        <div className="font-bold text-white">{row.feature}</div>
                        <div className="text-[11px] text-zinc-400">{row.description}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {typeof row.developer === 'boolean' ? (
                          row.developer ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-zinc-600 mx-auto" />
                        ) : (
                          <span className="text-zinc-300">{row.developer}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono bg-amber-500/5 font-bold">
                        {typeof row.smallBusiness === 'boolean' ? (
                          row.smallBusiness ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-zinc-600 mx-auto" />
                        ) : (
                          <span className="text-amber-300">{row.smallBusiness}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono bg-cyan-500/5 font-bold">
                        {typeof row.enterprise === 'boolean' ? (
                          row.enterprise ? <Check className="w-4 h-4 text-cyan-400 mx-auto" /> : <X className="w-4 h-4 text-zinc-600 mx-auto" />
                        ) : (
                          <span className="text-cyan-300">{row.enterprise}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: WHOLESALE TOKEN RATES (PAY-AS-YOU-GO)                              */}
        {/* ========================================================================= */}
        {pricingMode === 'tokens' && (
          <div className="space-y-12 animate-in fade-in duration-200">
            {/* 3 Value Pillars */}
            <section id="value-pillars" className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </section>

            {/* 4 Automatic Volume Tiers */}
            <section id="volume-tiers" className="space-y-6">
              <div className="text-center space-y-2 max-w-2xl mx-auto">
                <h2 className="text-2xl font-black text-white">Automatic Volume Tiers &amp; Progressive Rebates</h2>
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
                            isSelected ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'
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
            </section>

            {/* Founding Cohort Rate Lock */}
            <RateLockRibbon />

            {/* Savings Jackpot Reel */}
            <section id="savings-jackpot">
              <ErrorBoundary name="Savings Jackpot Reel" autoRetry={true}>
                <SavingsJackpotReel />
              </ErrorBoundary>
            </section>

            {/* Spend Audit Tool */}
            <section id="spend-audit">
              <ErrorBoundary name="Spend Audit Tool" autoRetry={true}>
                <SpendAuditTool />
              </ErrorBoundary>
            </section>

            {/* Non-Technical Real-World Business Workload Estimator */}
            <section id="workload-estimator">
              <ErrorBoundary name="Workload Estimator" autoRetry={true}>
                <WorkloadEstimator />
              </ErrorBoundary>
            </section>

            {/* Interactive Token Savings Simulator */}
            <section id="savings-simulator" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-8 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                    <Sliders className="w-3 h-3" />
                    <span>INTERACTIVE REBATE SIMULATOR</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">Simulate Your Workload&apos;s Net Savings</h2>
                  <p className="text-xs text-zinc-400">Configure prompt caching ratios, volume tiers, and off-peak execution to project bottom-line costs.</p>
                </div>

                {/* Model Selector */}
                <div className="w-full sm:w-64">
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Target AI Engine</label>
                  <select
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    aria-label="Target AI Engine"
                    className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-amber-300 font-mono font-bold focus:outline-none"
                  >
                    {FRONTEND_VISIBLE_MODELS.filter(m => m.category === 'llm').map(m => (
                      <option key={m.id} value={m.id} className="bg-zinc-900 text-white font-mono">
                        {m.id} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 1-Click Stack Presets */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quick Workload Presets:</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">Instant 1-Click Projection</span>
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
                      aria-label="Input Tokens per Request"
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
                      aria-label="Output Tokens per Request"
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
                      aria-label="Prompt Caching Prefix Percentage"
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
                      aria-label="Toggle Off-Peak Dynamic Yield"
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
                      <span className="text-sm font-bold text-zinc-400 line-through font-mono">${totalRetailCost.toFixed(3)}</span>
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
                    <p className="text-[11px] text-emerald-300 font-mono">
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
            </section>

            {/* Full Pricing Table with Discounts */}
            <section id="catalog-pricing" className="glass-panel rounded-3xl p-6 overflow-x-auto space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    Live Model Rates &amp; Discount Matrix ({selectedTier.name})
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
                  {FRONTEND_VISIBLE_MODELS.map((m) => {
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
                        <td className="py-3.5 px-4 text-zinc-400 line-through">
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
            </section>
          </div>
        )}

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
