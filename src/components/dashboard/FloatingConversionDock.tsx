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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-auto max-w-[94vw] animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto">
      <div className="glass-panel rounded-full py-1 px-2.5 sm:py-1.5 sm:px-3 border border-amber-500/40 bg-[#090b14]/95 backdrop-blur-xl shadow-xl flex items-center gap-2 sm:gap-3 font-mono text-[10px] text-white">
        {/* Value Hook & Badge */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
          </span>
          <span className="font-bold text-amber-300 text-[10px] sm:text-[11px] whitespace-nowrap">
            50% Match
          </span>
          <span className="hidden md:inline-block text-zinc-400 text-[10px]">
            • 25%–40% Wholesale
          </span>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-1.5">
          <Link
            href="/keys/new"
            className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 shadow-md shadow-amber-500/25 whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95"
          >
            <Key className="w-3 h-3 text-black fill-black" />
            <span>Claim $5 Key</span>
            <ArrowRight className="w-3 h-3 text-black" />
          </Link>

          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss quick bar"
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
