'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users2,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Sliders,
  DollarSign,
  Coins,
  Layers,
  Sparkles,
  Building2,
  Lock,
  Clock,
  Copy,
  Check
} from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { SEAT_TIERS } from '@/lib/data/pricingData';

export function SmallBusinessClient() {
  const [teamSeats, setTeamSeats] = useState(8);
  const [monthlySpend, setMonthlySpend] = useState(1200);

  const smallBusinessPlan = SEAT_TIERS.find(t => t.id === 'small-business')!;
  const includedSeats = smallBusinessPlan.includedSeats; // 5
  const extraSeats = Math.max(0, teamSeats - includedSeats);
  const seatPlanCost = smallBusinessPlan.basePriceUsd + (extraSeats * smallBusinessPlan.perSeatPriceUsd);
  
  // Fragmented cost: OpenAI Team ($25/seat) + Anthropic ($30/seat) + Retail Token spend ($1,200)
  const fragmentedCost = (teamSeats * 55) + monthlySpend;
  // GALXAI net cost: Seat plan cost + (Token spend with 28% wholesale discount minus $100 pooled credits)
  const netTokensCost = Math.max(0, (monthlySpend * 0.72) - 100);
  const galxTotalCost = seatPlanCost + netTokensCost;

  const monthlySavings = Math.max(0, fragmentedCost - galxTotalCost);
  const annualSavings = monthlySavings * 12;
  const savingsPct = fragmentedCost > 0 ? ((monthlySavings / fragmentedCost) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-12">
        <Breadcrumbs
          items={[
            { label: 'Solutions & Fleets', href: '/solutions', icon: Building2 },
            { label: 'Small Business & Squads', icon: Users2, badge: '5 Included', badgeColor: 'bg-amber-400 text-black' }
          ]}
        />

        {/* Hero Section */}
        <section className="glass-panel rounded-3xl p-6 sm:p-12 relative overflow-hidden text-center space-y-6">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <Users2 className="w-3.5 h-3.5 text-amber-400" />
            <span>BUILT FOR AGILITY • 2 TO 25 SEATS • 5 SEATS INCLUDED • $100 POOLED CREDITS</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              One Shared AI Workspace for Your Entire Engineering Squad
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mx-auto font-sans">
              Stop juggling separate company credit cards across OpenAI, Anthropic, and Grok. Consolidate your team seats, shared wallets, and individual developer spend caps under one sovereign roof.
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
              <span>Compare All Plans</span>
            </Link>
          </div>
        </section>

        {/* 3 Core Small Business Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-amber-500/30 bg-amber-500/5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
              <Users2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">5 Seats Included Base</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Start with 5 full engineering seats at $75/mo with <strong>$100/mo pooled compute credits</strong>. Add team members dynamically for only $15/seat.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-cyan-500/30 bg-cyan-500/5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-400/20 text-cyan-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Per-Seat Safety Caps</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Set deterministic monthly budget caps for every developer, preventing runaway agent loops and unexpected cloud billing shocks.
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-emerald-500/30 bg-emerald-500/5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/20 text-emerald-400 flex items-center justify-center font-bold">
              <Coins className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">25%–40% Wholesale Compute</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Eliminate retail API markups. Enjoy 75% prompt caching pass-through and sub-15ms Anycast failover routing.
            </p>
          </div>
        </section>

        {/* Interactive Small Business ROI Calculator */}
        <section className="glass-panel rounded-3xl p-6 sm:p-10 space-y-8 border border-white/10 bg-gradient-to-b from-[#0e111d] to-[#07080d]">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
              <Sliders className="w-3 h-3" />
              <span>SMALL BUSINESS SQUAD ROI SIMULATOR</span>
            </div>
            <h2 className="text-xl font-bold text-white font-sans">Project Your Squad&apos;s Annual Savings</h2>
            <p className="text-xs text-zinc-400 font-sans">
              Compare paying separate seat fees for OpenAI Team + Anthropic + direct tokens vs unified GALXAI Small Business seats.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center font-mono text-xs">
            {/* Left Controls */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Active Squad Seats:</span>
                  <span className="text-white font-bold text-sm">{teamSeats} Developers / Seats</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="25"
                  step="1"
                  value={teamSeats}
                  onChange={(e) => setTeamSeats(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>2 Seats (Early Prototype)</span>
                  <span>10 Seats (Squad)</span>
                  <span>25 Seats (Growing Startup)</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Monthly AI Compute Spend:</span>
                  <span className="text-emerald-400 font-bold text-sm">${monthlySpend.toLocaleString()} / mo</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="5000"
                  step="100"
                  value={monthlySpend}
                  onChange={(e) => setMonthlySpend(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Right Card */}
            <div className="lg:col-span-5 glass-panel rounded-3xl p-6 space-y-6 border border-amber-500/40 bg-amber-500/5 shadow-2xl">
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold">Monthly Spend Comparison</span>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Fragmented Seat &amp; Token Portals:</span>
                  <span className="text-zinc-500 line-through">${fragmentedCost.toLocaleString()} / mo</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-1">
                  <span>GALXAI Small Business Workspace:</span>
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
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all font-mono"
              >
                <span>Provision Squad Seats Now</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
