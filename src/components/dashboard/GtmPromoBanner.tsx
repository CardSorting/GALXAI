'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Flame, ArrowRight, X, Sparkles, Clock, ShieldCheck } from 'lucide-react';
import { SafeStorage } from '@/lib/resilience/SafeStorage';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

function BaseGtmPromoBanner() {
  const [dismissed, setDismissed] = useState(true);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 5,
    minutes: 42,
    seconds: 18,
  });

  useEffect(() => {
    const isDismissed = SafeStorage.getSessionItem('galx_promo_banner_dismissed');
    if (!isDismissed) {
      setDismissed(false);
    }

    // Dynamic ticking countdown timer (Amazon / Shopify flash sale strategy)
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    SafeStorage.setSessionItem('galx_promo_banner_dismissed', 'true');
  };

  if (dismissed) return null;

  const formatDigits = (num: number) => num.toString().padStart(2, '0');

  return (
    <aside
      aria-label="Limited Time Special Offer"
      className="relative z-50 bg-gradient-to-r from-[#0d101a] via-[#151208] to-[#0d101a] border-b border-amber-500/25 px-3 sm:px-6 py-2 text-zinc-200 text-xs backdrop-blur-xl shadow-lg transition-all animate-in fade-in duration-300"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        {/* Left: FOMO Badge + Dynamic Urgency Countdown + Core Value Offer */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap lg:flex-nowrap overflow-hidden">
          {/* Flash Offer Badge */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[10px] font-black uppercase tracking-wider font-mono shadow-sm shrink-0">
            <Flame className="w-3 h-3 fill-black text-black animate-bounce" />
            <span>FLASH OFFER</span>
          </span>

          {/* Value Proposition (Clear, Non-Technical, High-Converting) */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
            <span className="text-white font-bold">50% Deposit Match Bonus</span>
            <span className="text-zinc-400 hidden sm:inline">+</span>
            <span className="text-emerald-300 font-semibold hidden sm:inline">$5 Free Instant Credit</span>
            <span className="text-zinc-500 hidden md:inline">•</span>
            <span className="text-zinc-300 hidden md:inline">
              Save 25%–40% on OpenAI &amp; Grok
            </span>
          </div>

          {/* Amazon-style Scarcity & Countdown Timer */}
          <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-white/10 font-mono text-[11px] text-zinc-400 shrink-0">
            <div className="flex items-center gap-1 text-amber-300">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Ends in</span>
              <span className="bg-black/60 px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-300 font-bold">
                {formatDigits(timeLeft.hours)}:{formatDigits(timeLeft.minutes)}:{formatDigits(timeLeft.seconds)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 pl-2 text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Pool: <strong className="text-zinc-200">84% Claimed</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Direct CTA Button + Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/keys/new"
            className="px-3.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 text-black font-black text-[11px] sm:text-xs tracking-tight shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer"
          >
            <span>Claim $5 Free Credit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss Announcement"
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/10 transition-colors cursor-pointer"
            title="Dismiss"
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
