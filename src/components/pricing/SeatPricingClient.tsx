'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users2,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  Sliders,
  DollarSign,
  Coins,
  Lock,
  Layers,
  HelpCircle,
  Sparkles,
  Building2,
  Check,
  Flame
} from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  SEAT_TIERS,
  SEAT_BENCHMARKS,
  PLAN_COMPARISONS,
  type SeatTier
} from '@/lib/data/pricingData';

export function SeatPricingClient() {
  const [selectedSeats, setSelectedSeats] = useState(8);
  const [monthlyTokensSpend, setMonthlyTokensSpend] = useState(1500);

  // Benchmarks comparison calculation
  const openAiTeamCost = selectedSeats * 25;
  const anthropicTeamCost = selectedSeats * 30;
  const fragmentedTotal = openAiTeamCost + anthropicTeamCost + monthlyTokensSpend;

  // GALXAI Small Business pricing
  const smallBizTier = SEAT_TIERS.find(t => t.id === 'small-business')!;
  const extraSeats = Math.max(0, selectedSeats - smallBizTier.includedSeats);
  const galxSeatCost = smallBizTier.basePriceUsd + (extraSeats * smallBizTier.perSeatPriceUsd);
  const galxTokensCost = Math.max(0, (monthlyTokensSpend * 0.70) - 100); // 30% wholesale discount minus $100 credit
  const galxTotalCost = galxSeatCost + galxTokensCost;

  const monthlySavings = Math.max(0, fragmentedTotal - galxTotalCost);
  const annualSavings = monthlySavings * 12;
  const savingsPct = fragmentedTotal > 0 ? (monthlySavings / fragmentedTotal) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-12">
        <Breadcrumbs
          items={[
            { label: 'Pricing & Wholesale Rates', href: '/pricing', icon: Coins },
            { label: 'Seats & Team Plans', icon: Users2, badge: '5 Included', badgeColor: 'bg-amber-400 text-black' }
          ]}
        />

        {/* Hero Section */}
        <section className="glass-panel rounded-3xl p-6 sm:p-12 relative overflow-hidden text-center space-y-6">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <Users2 className="w-3.5 h-3.5 text-amber-400" />
            <span>UNIFIED TEAM SEATS • POOLED COMPUTE CREDITS • 25%–40% WHOLESALE SAVINGS</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Small Business &amp; Enterprise Seat Plans
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mx-auto">
              Replace fragmented per-provider team seat subscriptions with one sovereign gateway workspace. Enjoy included monthly compute credits, shared wallets, and individual developer spend caps.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 font-mono">
            <Link
              href="/teams/seats"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Users2 className="w-4 h-4 text-black" />
              <span>Provision Small Business Workspace ($100 Credit)</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>

            <Link
              href="/pricing"
              className="px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Coins className="w-4 h-4 text-cyan-400" />
              <span>View Wholesale Token Rates</span>
            </Link>
          </div>
        </section>

        {/* 3 Seat Plan Cards */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {SEAT_TIERS.map((tier) => {
            const isSmallBiz = tier.id === 'small-business';
            const isEnterprise = tier.id === 'enterprise';

            return (
              <div
                key={tier.id}
                className={`glass-panel rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 relative transition-all ${
                  isSmallBiz
                    ? 'border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-black/40 to-black/60 shadow-2xl shadow-amber-500/10 scale-[1.02]'
                    : isEnterprise
                    ? 'border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 via-black/40 to-black/60'
                    : 'border-white/10 bg-black/40'
                }`}
              >
                {isSmallBiz && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-black text-[10px] font-mono font-black uppercase tracking-wider shadow-md">
                    MOST POPULAR FOR STARTUPS
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-white/20 bg-white/10 text-white">
                      {tier.badge}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className="text-3xl sm:text-4xl font-black text-white">
                        {tier.basePriceUsd === 0 ? '$0' : `$${tier.basePriceUsd}/mo`}
                      </span>
                    </div>
                    <div className="text-xs text-amber-300 font-mono font-bold">
                      {tier.perSeatPriceUsd === 0
                        ? '1 Seat Included'
                        : `${tier.includedSeats} Seats Included (+$${tier.perSeatPriceUsd}/seat)`}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1 pt-1">
                      <Coins className="w-3.5 h-3.5" />
                      <span>+${tier.includedMonthlyComputeCredits}/mo Pooled Compute Included</span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{tier.tagline}</p>

                  <div className="space-y-2 pt-4 border-t border-white/10 font-mono text-xs">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Included Capabilities:</span>
                    <ul className="space-y-2 text-[11px]">
                      {tier.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2 text-zinc-200">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-white">{feat.title}: </strong>
                            <span className="text-zinc-400">{feat.description}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 font-mono">
                  <Link
                    href={isEnterprise ? '/solutions/enterprise' : `/teams/seats?tier=${tier.id}`}
                    className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                      isSmallBiz
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black shadow-lg shadow-amber-500/20'
                        : isEnterprise
                        ? 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black shadow-lg shadow-cyan-500/20'
                        : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                    }`}
                  >
                    <span>{tier.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </section>

        {/* Interactive Dual Seat + Token Savings ROI Simulator */}
        <section id="dual-savings-calculator" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-8 border border-white/10 bg-gradient-to-b from-[#0e111d] to-[#07080d]">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
              <Sliders className="w-3 h-3" />
              <span>DUAL SEAT + WHOLESALE TOKEN SAVINGS SIMULATOR</span>
            </div>
            <h2 className="text-xl font-bold text-white">Interactive Net Margin &amp; Cash Retained Simulator</h2>
            <p className="text-xs text-zinc-400">
              Drag both sliders to project your squad&apos;s annual savings vs paying separate OpenAI/Anthropic team licenses.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center font-mono text-xs">
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Active Engineering Seats:</span>
                  <span className="text-white font-bold text-sm">{selectedSeats} Developers / Seats</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="50"
                  step="1"
                  value={selectedSeats}
                  onChange={(e) => setSelectedSeats(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Monthly AI Compute Token Spend:</span>
                  <span className="text-emerald-400 font-bold text-sm">${monthlyTokensSpend.toLocaleString()} / mo</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="10000"
                  step="100"
                  value={monthlyTokensSpend}
                  onChange={(e) => setMonthlyTokensSpend(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="lg:col-span-5 glass-panel rounded-3xl p-6 space-y-6 border border-amber-500/40 bg-amber-500/5 shadow-2xl">
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold">Monthly Spend Comparison</span>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Fragmented OpenAi/Anthropic Seats:</span>
                  <span className="text-zinc-500 line-through">${fragmentedTotal.toLocaleString()} / mo</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-1">
                  <span>GALXAI Unified Workspace:</span>
                  <span className="text-2xl font-black text-amber-300">${Math.round(galxTotalCost).toLocaleString()} / mo</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/40 text-center space-y-1">
                <span className="text-[10px] text-amber-300 uppercase font-bold">Net Annual Cash Retained</span>
                <div className="text-3xl font-black text-emerald-300">
                  ${Math.round(annualSavings).toLocaleString()} USD
                </div>
                <p className="text-[11px] text-emerald-400 font-semibold">
                  You save ${Math.round(monthlySavings).toLocaleString()} / mo (-{savingsPct.toFixed(0)}%)
                </p>
              </div>

              <Link
                href="/teams/seats"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
              >
                <span>Provision Squad Seats</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
