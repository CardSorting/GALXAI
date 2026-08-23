'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Flame, Sparkles, ArrowRight, X, ShieldCheck, Zap, Coins } from 'lucide-react';
import { SafeStorage } from '@/lib/resilience/SafeStorage';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

function BaseGtmPromoBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const isDismissed = SafeStorage.getSessionItem('galx_promo_banner_dismissed');
    if (!isDismissed) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    SafeStorage.setSessionItem('galx_promo_banner_dismissed', 'true');
  };

  if (dismissed) return null;

  return (
    <aside
      aria-label="Promotional Announcement"
      className="relative z-50 bg-gradient-to-r from-amber-500/25 via-indigo-600/30 to-emerald-500/25 border-b border-amber-500/40 px-3 sm:px-6 py-2 text-white text-xs backdrop-blur-md transition-all animate-in fade-in duration-300 shadow-md"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider shrink-0 shadow-sm font-mono">
            <Flame className="w-3 h-3 fill-black text-black" />
            <span>BUILDER PROMO</span>
          </span>

          <p className="text-zinc-200 text-[11px] sm:text-xs leading-tight">
            <strong className="text-amber-300 font-bold">50% Instant Compute Match</strong> on all deposits + <strong className="text-white font-bold">$5 Free Instant Credit</strong> (No Card Required). Save <strong className="text-emerald-300 font-bold">25%–40%</strong> below retail list.
          </p>

          <span className="hidden xl:inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-black/40 px-2 py-0.5 rounded-md border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Bonus Pool: $84.2K / $100K Claimed</span>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/keys/new"
            className="px-3.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-[11px] uppercase tracking-wider transition-all flex items-center gap-1 shadow-md shadow-amber-500/25 whitespace-nowrap cursor-pointer font-mono"
          >
            <span>Claim $5 Free Key</span>
            <ArrowRight className="w-3 h-3 text-black" />
          </Link>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss Announcement"
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export const GtmPromoBanner = withErrorBoundary(BaseGtmPromoBanner, {
  name: 'GTM Promo Banner',
  fallback: null
});
