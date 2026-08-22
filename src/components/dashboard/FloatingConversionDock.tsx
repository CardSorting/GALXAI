'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Key, ArrowRight, Flame, Coins, Zap, X } from 'lucide-react';

export function FloatingConversionDock() {
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 450 && !dismissed) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [dismissed]);

  if (!isVisible || dismissed) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-auto max-w-[92vw] animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
      <div className="glass-panel rounded-full p-2 pl-4 pr-3 border border-amber-500/40 bg-[#090b14]/90 backdrop-blur-2xl shadow-2xl flex items-center gap-3 sm:gap-4 font-mono text-xs text-white">
        {/* Value Hook & Badge */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="font-bold text-amber-300 text-[11px] sm:text-xs whitespace-nowrap">
            50% Compute Match
          </span>
          <span className="hidden sm:inline-block text-zinc-400 text-[11px]">
            • 25%–40% Wholesale Margin
          </span>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <Link
            href="/keys/new"
            className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/30 whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95"
          >
            <Key className="w-3.5 h-3.5 text-black fill-black" />
            <span>Claim $5 Free Key</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </Link>

          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss quick bar"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
