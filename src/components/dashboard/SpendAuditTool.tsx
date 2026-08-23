'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingDown,
  Calculator,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Flame,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';

export function SpendAuditTool() {
  const [monthlySpend, setMonthlySpend] = useState<number>(500);
  const [isCopied, setIsCopied] = useState(false);

  // Calculations based on 33.3% average direct wholesale margin
  const wholesaleCost = monthlySpend * 0.667;
  const monthlySaved = monthlySpend - wholesaleCost;
  const annualSaved = monthlySaved * 12;
  const matchBonus = Math.min(2500, Math.round(wholesaleCost * 0.5));
  const freeTokensEquivalent = Math.round((monthlySaved / 3.75) * 1000000);

  const handleCopyAudit = () => {
    const text = `GALXAI Spend Audit Summary:\nCurrent Monthly Retail AI Spend: $${monthlySpend.toLocaleString()} USD/mo\nGALXAI Direct Wholesale Cost: $${wholesaleCost.toFixed(2)} USD/mo\nMonthly Net Savings: $${monthlySaved.toFixed(2)} USD/mo (33.3% reduction)\nAnnualized Cashflow Kept: $${annualSaved.toFixed(2)} USD/yr\n50% Compute Match Bonus: +$${matchBonus.toLocaleString()} USD in free compute\nFree Token Mileage: ~${(freeTokensEquivalent / 1000000).toFixed(1)}M free tokens/mo`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <section className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-black/50 to-indigo-600/10 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            <span>INSTANT INVOICE SPEND AUDIT</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            How Much Are You Overpaying on OpenAI / Anthropic Every Month?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300">
            Type or adjust your current monthly AI bill below to see your immediate cost reduction.
          </p>
        </div>

        <button
          onClick={handleCopyAudit}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 self-start md:self-auto"
        >
          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
          <span>{isCopied ? 'Audit Copied!' : 'Copy Spend Audit'}</span>
        </button>
      </div>

      {/* Interactive Input + Value Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-2">
        {/* Left: Input & Slider */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-black/60 border border-white/10 space-y-5 font-mono">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-300 uppercase">
              Current Monthly AI Bill (USD):
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-zinc-400">$</span>
              <input
                type="number"
                min={50}
                max={50000}
                step={50}
                value={monthlySpend}
                onChange={(e) => setMonthlySpend(Math.max(10, parseFloat(e.target.value) || 0))}
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-black/80 border border-emerald-500/40 text-2xl font-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-zinc-500 font-sans">Quick Presets:</span>
            {[100, 250, 500, 1000, 2500, 5000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setMonthlySpend(preset)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  monthlySpend === preset
                    ? 'bg-emerald-400 text-black shadow-sm'
                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                ${preset}
              </button>
            ))}
          </div>

          <input
            type="range"
            min={50}
            max={10000}
            step={50}
            value={monthlySpend}
            onChange={(e) => setMonthlySpend(parseFloat(e.target.value))}
            className="w-full h-2.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

        {/* Right: Net Financial Output Cards */}
        <div className="lg:col-span-6 grid grid-cols-2 gap-3 font-mono">
          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase font-sans font-semibold">Monthly Savings</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-300">+${monthlySaved.toFixed(2)}</div>
            <span className="text-[10px] text-emerald-400/90 font-sans">Kept in your account every month</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/60 border border-emerald-500/30 space-y-1">
            <span className="text-[10px] text-emerald-400 uppercase font-sans font-bold">Annualized Profit</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">+${annualSaved.toFixed(2)}</div>
            <span className="text-[10px] text-emerald-300 font-sans font-bold">12-Month cashflow retained</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
            <span className="text-[10px] text-amber-300 uppercase font-sans font-bold">50% Match Bonus</span>
            <div className="text-xl sm:text-2xl font-black text-amber-300">+${matchBonus} USD</div>
            <span className="text-[10px] text-amber-400/80 font-sans">Free compute match on deposit</span>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-1">
            <span className="text-[10px] text-indigo-300 uppercase font-sans font-bold">Free Token Mileage</span>
            <div className="text-xl sm:text-2xl font-black text-indigo-300">~{(freeTokensEquivalent / 1000000).toFixed(1)}M</div>
            <span className="text-[10px] text-indigo-400/80 font-sans">Tokens routed free via savings</span>
          </div>
        </div>
      </div>

      {/* Bottom Conversion CTA Strip */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 font-mono text-xs">
        <div className="flex items-center gap-2 text-zinc-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>100% Risk-Free: 30-Day Money-Back Guarantee + 0% Router Markup</span>
        </div>

        <Link
          href="/keys/new"
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer"
        >
          <span>Claim My ${monthlySaved.toFixed(0)} Monthly Savings ($5 Free Key)</span>
          <ArrowRight className="w-4 h-4 text-black" />
        </Link>
      </div>
    </section>
  );
}
