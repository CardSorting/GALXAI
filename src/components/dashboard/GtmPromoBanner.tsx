'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';
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
      className="relative z-50 bg-[#06070c] border-b border-white/10 px-3 sm:px-6 py-1.5 text-zinc-300 text-xs backdrop-blur-md transition-all animate-in fade-in duration-200"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-[11px] sm:text-xs">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="text-zinc-400 hidden sm:inline font-mono uppercase text-[10px] tracking-wider text-amber-300/90 font-bold">
            Cohort Launch
          </span>
          <span className="text-zinc-500 hidden sm:inline">•</span>
          <p className="text-zinc-300 truncate font-sans">
            <strong className="text-white font-medium">50% Instant Deposit Match</strong> + $5 free compute credit.
          </p>
          <Link
            href="/keys/new"
            className="text-amber-400 hover:text-amber-300 font-bold font-mono inline-flex items-center gap-0.5 transition-colors cursor-pointer shrink-0 ml-1"
          >
            <span>Claim Key</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <button
          onClick={handleDismiss}
          aria-label="Dismiss Announcement"
          className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </aside>
  );
}

export const GtmPromoBanner = withErrorBoundary(BaseGtmPromoBanner, {
  name: 'GTM Promo Banner',
  fallback: null
});
