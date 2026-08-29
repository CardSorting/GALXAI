'use client';

import React from 'react';
import {
  ShieldCheck,
  Lock,
  RotateCcw,
  Sparkles,
  Zap,
  CheckCircle2,
  Scale
} from 'lucide-react';

interface TrustSealsProps {
  className?: string;
  variant?: 'grid' | 'strip';
}

export function TrustSeals({ className = '', variant = 'grid' }: TrustSealsProps) {
  if (variant === 'strip') {
    return (
      <div className={`p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-around gap-4 text-xs font-mono text-zinc-300 ${className}`}>
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-emerald-400" />
          <span>30-Day 100% Refund Guarantee</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Zero Overdraft / Zero Surprise Fees</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          <span>Zero Data Retention (ZDR-100)</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 ${className}`}>
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 font-mono">
        <div className="flex items-center gap-2 text-emerald-400">
          <RotateCcw className="w-4 h-4" />
          <span className="font-bold text-xs">1-Click Refund</span>
        </div>
        <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
          100% money-back guarantee. Withdraw unspent balance back to your card anytime.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 font-mono">
        <div className="flex items-center gap-2 text-cyan-400">
          <ShieldCheck className="w-4 h-4" />
          <span className="font-bold text-xs">Zero Overdraft</span>
        </div>
        <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
          Prepaid wallet architecture prevents runaway loop bills and surprise charges.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 font-mono">
        <div className="flex items-center gap-2 text-amber-400">
          <Lock className="w-4 h-4" />
          <span className="font-bold text-xs">Zero Data Retention</span>
        </div>
        <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
          ZDR-100 certified. Prompts and completions are never stored or trained on.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 font-mono">
        <div className="flex items-center gap-2 text-indigo-400">
          <Zap className="w-4 h-4" />
          <span className="font-bold text-xs">Multi-Region Anycast</span>
        </div>
        <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
          Sub-15ms automated failover across redundant global edge nodes.
        </p>
      </div>
    </div>
  );
}
