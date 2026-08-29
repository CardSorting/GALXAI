'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, ArrowRight, ShieldCheck, Zap, Lock, Coins } from 'lucide-react';

interface RateLockRibbonProps {
  claimedSlots?: number;
  totalSlots?: number;
  className?: string;
}

export function RateLockRibbon({
  claimedSlots = 442,
  totalSlots = 500,
  className = ''
}: RateLockRibbonProps) {
  const percentage = Math.round((claimedSlots / totalSlots) * 100);
  const remaining = totalSlots - claimedSlots;

  return (
    <section className={`glass-panel rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-indigo-600/20 border border-amber-500/40 shadow-2xl space-y-5 ${className}`}>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left Information */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase font-mono tracking-wider shadow-sm">
              <Flame className="w-3.5 h-3.5 fill-black text-black" />
              <span>FOUNDING COHORT RATE LOCK</span>
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold border border-rose-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              <span>Only {remaining} Slots Remaining</span>
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Lock In Wholesale Rates Forever
          </h3>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            First 500 accounts lock in <strong className="text-amber-300">0% routing markup</strong>, <strong className="text-cyan-300">75% prompt caching</strong>, and a <strong className="text-emerald-300">50% compute match</strong>. Once quota is reached, pricing shifts to standard tiers.
          </p>
        </div>

        {/* Right Meter & CTA */}
        <div className="w-full lg:w-80 p-5 rounded-2xl bg-black/60 border border-amber-500/30 space-y-4 shrink-0 shadow-inner font-mono">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-zinc-400">Cohort Quota:</span>
              <span className="text-amber-300">{claimedSlots} / {totalSlots} Claimed ({percentage}%)</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden border border-white/10 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300 transition-all duration-1000 shadow-sm"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>0 (Tier 1 Open)</span>
              <span className="text-amber-400 font-bold">{remaining} slots left</span>
              <span>500 (Tier 2 Shift)</span>
            </div>
          </div>

          <Link
            href="/keys/new"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 hover:scale-[1.02] active:scale-98 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-black" />
            <span>Lock In My Rate ($5 Key)</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </Link>
        </div>
      </div>
    </section>
  );
}
