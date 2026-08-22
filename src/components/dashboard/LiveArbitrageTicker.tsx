'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  Activity,
  Coins,
  ShieldCheck,
  Zap,
  Flame,
  ArrowUpRight,
  Database
} from 'lucide-react';

export function LiveArbitrageTicker() {
  const [tokens24h, setTokens24h] = useState(52891400);
  const [dollarsSaved24h, setDollarsSaved24h] = useState(18429.60);
  const [activeStreams, setActiveStreams] = useState(148);

  useEffect(() => {
    // Dynamic simulated live pulse incrementing metrics smoothly
    const interval = setInterval(() => {
      setTokens24h(prev => prev + Math.floor(Math.random() * 450) + 120);
      setDollarsSaved24h(prev => prev + (Math.random() * 0.18) + 0.04);
      setActiveStreams(prev => Math.max(120, Math.min(220, prev + Math.floor(Math.random() * 5) - 2)));
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full glass-panel rounded-2xl p-3.5 border border-emerald-500/25 bg-black/50 backdrop-blur-md font-mono text-xs shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Live Network Health Status */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-zinc-300 font-bold uppercase text-[10px] tracking-wider">
            Live Global Arbitrage Mesh
          </span>
        </div>

        {/* 24h Metrics Cluster */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-400">24h Community Savings:</span>
            <strong className="text-emerald-300 font-bold">
              ${dollarsSaved24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-zinc-400">Tokens Routed (24h):</span>
            <strong className="text-white font-bold">
              {(tokens24h / 1000000).toFixed(2)}M
            </strong>
          </div>

          <div className="flex items-center gap-1.5 hidden md:flex">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-zinc-400">Prompt Caching Rebate:</span>
            <strong className="text-cyan-300 font-bold">75.0% Pass-Through</strong>
          </div>

          <div className="flex items-center gap-1.5 hidden lg:flex">
            <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span className="text-zinc-400">Gateway Overhead:</span>
            <strong className="text-emerald-400 font-bold">&lt; 0.85ms</strong>
          </div>
        </div>

        {/* Real-Time Live Stream Counter Badge */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
            {activeStreams} Concurrent Streams Active
          </span>
        </div>
      </div>
    </div>
  );
}
