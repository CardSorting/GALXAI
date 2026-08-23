'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Trophy,
  Flame,
  ArrowRight,
  TrendingUp,
  Zap,
  Coins,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Gift,
  RotateCw,
  Award
} from 'lucide-react';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

interface MultiplierTier {
  id: string;
  deposit: number;
  multiplier: number;
  label: string;
  badge: string;
  unlockedPerk: string;
  color: string;
}

const MULTIPLIER_TIERS: MultiplierTier[] = [
  {
    id: 'starter',
    deposit: 25,
    multiplier: 1.5,
    label: 'Starter Boost',
    badge: '1.50x MATCH',
    unlockedPerk: '$37.50 Compute + $5 Free Welcome Token',
    color: 'from-amber-400 to-orange-500'
  },
  {
    id: 'growth',
    deposit: 50,
    multiplier: 1.6,
    label: 'Growth Accelerator',
    badge: '1.60x MATCH',
    unlockedPerk: '$80.00 Compute + Auto-Retry Failover',
    color: 'from-emerald-400 to-cyan-500'
  },
  {
    id: 'scale',
    deposit: 100,
    multiplier: 1.75,
    label: 'Scale Commander',
    badge: '1.75x MATCH',
    unlockedPerk: '$175.00 Usable Balance + 75% Prompt Caching Pass',
    color: 'from-cyan-400 to-indigo-500'
  },
  {
    id: 'enterprise',
    deposit: 250,
    multiplier: 2.0,
    label: 'Mega Sovereign',
    badge: '2.00x DOUBLE',
    unlockedPerk: '$500.00 Usable Balance + Dedicated VPC Lane',
    color: 'from-purple-400 to-pink-500'
  }
];

function BaseSavingsJackpotReel() {
  const [selectedTierId, setSelectedTierId] = useState<string>('growth');
  const [monthlyAISpend, setMonthlyAISpend] = useState<number>(600);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinCount, setSpinCount] = useState<number>(0);

  const currentTier = MULTIPLIER_TIERS.find(t => t.id === selectedTierId) || MULTIPLIER_TIERS[1];
  
  // Financial ROI Calculations
  const rawTotalCredits = currentTier.deposit * currentTier.multiplier + 5.0;
  const freeBonusDollars = rawTotalCredits - currentTier.deposit;
  const annualCashKeptInBank = (monthlyAISpend * 0.35) * 12;
  const monthlyCashKept = monthlyAISpend * 0.35;
  const freeCustomerChats = Math.round((monthlyCashKept / 0.00375) * 10);

  const handleSpinToCalculate = () => {
    setIsSpinning(true);
    setSpinCount(prev => prev + 1);
    setTimeout(() => {
      setIsSpinning(false);
    }, 800);
  };

  return (
    <section className="glass-panel rounded-3xl p-6 sm:p-10 border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-black/70 to-indigo-950/40 shadow-2xl relative overflow-hidden space-y-8">
      {/* Background Animated Atmosphere */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header with Casino-Grade Winnings Badge */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/50 text-amber-300 text-xs font-mono font-black tracking-wide shadow-lg shadow-amber-500/15">
            <Trophy className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span>ANNUAL SAVINGS JACKPOT &amp; INSTANT MATCH REEL</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            Calculate Your Compute Winnings &amp; Unlock 2.0x Boosters
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed font-sans">
            Every dollar redirected from retail markups into wholesale capacity is money won back for your bottom line. Pick a deposit tier to lock in instant multiplier credits.
          </p>
        </div>

        <button
          onClick={handleSpinToCalculate}
          className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-mono font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 self-start lg:self-auto hover:scale-105 active:scale-95 shadow-lg"
        >
          <RotateCw className={`w-4 h-4 text-amber-400 ${isSpinning ? 'animate-spin' : ''}`} />
          <span>{isSpinning ? 'Rolling Winnings Reel...' : 'Re-Spin Savings Reel'}</span>
        </button>
      </div>

      {/* Central Jackpot Value Display (Casino Gold Billboard) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-black/80 border-2 border-amber-400/60 shadow-2xl relative overflow-hidden space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center font-mono">
          {/* Card 1: Annual Cash Retained */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/30 space-y-1 relative group">
            <span className="text-[10px] text-amber-400 font-sans uppercase font-bold tracking-wider block">
              12-Mo Cash Winnings Kept
            </span>
            <div className={`text-2xl sm:text-3xl lg:text-4xl font-black text-amber-300 tracking-tight transition-all duration-300 ${isSpinning ? 'blur-sm scale-95' : 'blur-0 scale-100'}`}>
              +${annualCashKeptInBank.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <span className="text-[10px] text-zinc-400 font-sans block">Direct margin captured</span>
          </div>

          {/* Card 2: Instant Multiplier Balance */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-500/15 to-transparent border border-emerald-500/40 space-y-1 relative">
            <span className="text-[10px] text-emerald-400 font-sans uppercase font-bold tracking-wider block">
              Usable Compute Unlocked
            </span>
            <div className={`text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-300 tracking-tight transition-all duration-300 ${isSpinning ? 'blur-sm scale-95' : 'blur-0 scale-100'}`}>
              ${rawTotalCredits.toFixed(2)}
            </div>
            <span className="text-[10px] text-emerald-400 font-sans font-bold block">
              +${freeBonusDollars.toFixed(2)} Free Compute Bonus
            </span>
          </div>

          {/* Card 3: Free Token Multiplier */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-cyan-500/10 to-transparent border border-cyan-500/30 space-y-1 relative">
            <span className="text-[10px] text-cyan-400 font-sans uppercase font-bold tracking-wider block">
              Instant Match Multiplier
            </span>
            <div className={`text-2xl sm:text-3xl lg:text-4xl font-black text-cyan-300 tracking-tight transition-all duration-300 ${isSpinning ? 'blur-sm scale-95' : 'blur-0 scale-100'}`}>
              {currentTier.multiplier.toFixed(2)}x
            </div>
            <span className="text-[10px] text-zinc-400 font-sans block">On your first deposit</span>
          </div>

          {/* Card 4: Free Equivalent Tasks */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-500/10 to-transparent border border-purple-500/30 space-y-1 relative">
            <span className="text-[10px] text-purple-400 font-sans uppercase font-bold tracking-wider block">
              Free Task Output Mileage
            </span>
            <div className={`text-2xl sm:text-3xl lg:text-4xl font-black text-purple-300 tracking-tight transition-all duration-300 ${isSpinning ? 'blur-sm scale-95' : 'blur-0 scale-100'}`}>
              ~{freeCustomerChats.toLocaleString()}
            </div>
            <span className="text-[10px] text-zinc-400 font-sans block">Free customer chats/mo</span>
          </div>
        </div>

        {/* Live Spending Slider (Adjust Your Winnings) */}
        <div className="pt-4 border-t border-white/10 space-y-3 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <label className="text-zinc-300 font-bold uppercase flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Current Monthly AI Spend Benchmark:</span>
            </label>
            <span className="text-amber-300 font-black text-sm">
              ${monthlyAISpend.toLocaleString()} USD / month
            </span>
          </div>

          <input
            type="range"
            min={100}
            max={10000}
            step={50}
            value={monthlyAISpend}
            onChange={(e) => setMonthlyAISpend(parseFloat(e.target.value))}
            className="w-full h-2.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>
      </div>

      {/* 4 Multiplier Boost Tier Cards (Click to Lock In Multiplier) */}
      <div className="space-y-3">
        <label className="block text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
          Select Your Compute Multiplier Tier:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MULTIPLIER_TIERS.map((tier) => {
            const isSelected = tier.id === selectedTierId;
            const totalCredit = tier.deposit * tier.multiplier + 5.0;

            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedTierId(tier.id)}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative space-y-3 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-black border-amber-400 shadow-2xl shadow-amber-500/20 scale-[1.03] ring-1 ring-amber-400'
                    : 'bg-black/60 border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono font-black text-[10px]">
                      {tier.badge}
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white font-mono">{tier.label}</h3>
                    <div className="text-2xl font-black text-white font-mono mt-1">
                      ${tier.deposit}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 space-y-1">
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    → ${totalCredit.toFixed(2)} USD Credit
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans leading-tight">
                    {tier.unlockedPerk}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Conversion Action Bar */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 font-mono text-xs">
        <div className="flex items-center gap-2 text-zinc-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>100% Unconditional Refund on Unspent Balances • 0% Router Markup</span>
        </div>

        <Link
          href="/keys/new"
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-500/30 font-mono cursor-pointer hover:scale-105 active:scale-95"
        >
          <Zap className="w-4 h-4 text-black fill-black" />
          <span>Lock In {currentTier.multiplier}x Multiplier &amp; Claim Key</span>
          <ArrowRight className="w-4 h-4 text-black" />
        </Link>
      </div>
    </section>
  );
}

export const SavingsJackpotReel = withErrorBoundary(BaseSavingsJackpotReel, {
  name: 'Savings Jackpot Reel'
});
