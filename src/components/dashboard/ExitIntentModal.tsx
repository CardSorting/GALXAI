'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Flame,
  Zap,
  Key,
  ShieldCheck,
  ArrowRight,
  X,
  Lock,
  Coins,
  Clock,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

function BaseExitIntentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(899); // 14:59

  useEffect(() => {
    const hasTriggered = sessionStorage.getItem('galx_exit_intent_triggered');
    if (hasTriggered) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Trigger when mouse moves past the top boundary
      if (e.clientY <= 10 && !sessionStorage.getItem('galx_exit_intent_triggered')) {
        sessionStorage.setItem('galx_exit_intent_triggered', 'true');
        setIsOpen(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-amber-500/50 p-6 sm:p-8 space-y-6 shadow-2xl bg-[#090c17]/95 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close offer modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Urgency Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase font-mono tracking-wider shadow-sm">
              <Flame className="w-3.5 h-3.5 fill-black text-black" />
              <span>FOUNDER EXIT OFFER</span>
            </span>

            {/* Live Countdown Timer */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-mono font-bold border border-rose-500/40">
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>Reservation Expires in: <strong>{formattedTime}</strong></span>
            </div>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight pt-1">
            Wait! Lock In Your <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">$5 Free Key</span> + 50% Match Grant
          </h2>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Before you leave, reserve your spot in the Founding Builder Cohort. Cut your OpenAI &amp; xAI Grok inference costs by <strong className="text-emerald-300 font-bold">25%–40%</strong> with zero code rewrites.
          </p>
        </div>

        {/* 3 Unlocked Perks Checklist */}
        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2.5 font-mono text-xs">
          <div className="flex items-center gap-2 text-zinc-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong>$5.00 Instant Compute Credit</strong> (Zero card required)</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-200">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span><strong>50% Matching Grant</strong> on your first deposit</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-200">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span><strong>Grandfathered Lifetime 0% Markup</strong> wholesale rates</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-200">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span><strong>Sub-15ms Redundant Failover</strong> with 99.99% uptime SLA</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <Link
            href="/keys/new"
            onClick={() => setIsOpen(false)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-500/30 hover:scale-[1.02] active:scale-98 font-mono cursor-pointer"
          >
            <Key className="w-4 h-4 text-black fill-black" />
            <span>Claim $5 Key &amp; Lock In 50% Match Now</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full py-2.5 rounded-xl text-zinc-400 hover:text-white text-xs transition-colors cursor-pointer"
          >
            No thanks, I prefer paying full retail prices
          </button>
        </div>
      </div>
    </div>
  );
}

export const ExitIntentModal = withErrorBoundary(BaseExitIntentModal, {
  name: 'Exit Intent Modal',
  fallback: null
});
