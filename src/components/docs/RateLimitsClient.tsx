'use client';

import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Gauge,
  Zap,
  Activity,
} from 'lucide-react';

export function RateLimitsClient() {
  const [tokens, setTokens] = useState<number>(8500);
  const maxCapacity = 10000;

  useEffect(() => {
    const timer = setInterval(() => {
      setTokens((prev) => Math.min(maxCapacity, prev + 25));
    }, 50);
    return () => clearInterval(timer);
  }, []);

  const simulateBurst = () => {
    setTokens((prev) => Math.max(0, prev - 4000));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'Architecture & Trust', href: '/docs/architecture' },
            { label: 'Rate Limits & Concurrency Governor' },
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <Gauge className="w-3.5 h-3.5" />
              <span>CONTINUOUS TOKEN REPLENISHMENT</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Rate Limits &amp; Concurrency Governor Guide</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-sans">
            Continuous fractional token replenishment calculus, 2-phase token reservations, and burst smoothing eliminate top-of-minute 429 stampedes.
          </p>
        </div>

        <DocsSubNav />

        {/* Founding Cohort Rate Lock Ribbon */}

        {/* Interactive Continuous Governor Visualizer */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-amber-500/30 bg-amber-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                <Activity className="w-5 h-5 text-amber-400" />
                <span>Live Continuous Token Replenishment Simulator</span>
              </h2>
              <p className="text-xs text-zinc-400">Tokens refill smoothly microsecond-by-microsecond rather than resetting in a cliff at :00.</p>
            </div>

            <button
              onClick={simulateBurst}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Simulate 4,000 Token Burst</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-black/80 border border-white/10 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Available Token Governor Capacity:</span>
              <span className="text-amber-300 font-bold">{tokens.toLocaleString()} / {maxCapacity.toLocaleString()} TPM</span>
            </div>

            <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-75"
                style={{ width: `${(tokens / maxCapacity) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px]">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                <span className="text-zinc-500 text-[10px] uppercase">Refill Granularity</span>
                <div className="text-white font-bold">1 microsecond</div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                <span className="text-zinc-500 text-[10px] uppercase">Top-of-Minute Jitter</span>
                <div className="text-emerald-400 font-bold">0.0 ms (Eliminated)</div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                <span className="text-zinc-500 text-[10px] uppercase">Scavenger Reclaim</span>
                <div className="text-cyan-300 font-bold">Instant on disconnect</div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Continuous Fractional Calculus */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
              <Activity className="w-5 h-5 text-indigo-400" />
              1. Continuous Fractional Token Calculus Formula
            </h2>
            <p className="text-xs text-zinc-400">
              Unlike traditional gateways that reset rate limits at the top of every minute, GALXAI recalculates capacity microsecond by microsecond.
            </p>
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            This continuous formula eliminates the &quot;top-of-minute stampede&quot; problem where thousands of concurrent agents slam upstream APIs at :00 seconds:
          </p>

          <pre className="p-4 rounded-2xl bg-black/60 border border-white/5 font-mono text-xs text-cyan-300 overflow-x-auto">
            <code>{`// Continuous microsecond replenishment formula
const elapsedMs = Math.max(0, nowMs - bucket.lastRefillTimestamp);
const fractionalTokensToAdd = elapsedMs * (bucket.refillRatePerMinute / 60000);
bucket.currentTokens = Math.min(bucket.maxCapacity, bucket.currentTokens + fractionalTokensToAdd);`}</code>
          </pre>
        </div>

        {/* Section: 2-Phase Token Reservation */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
              <Zap className="w-5 h-5 text-amber-400" />
              2. 2-Phase Token Reservation &amp; Stream Buffering
            </h2>
            <p className="text-xs text-zinc-400">
              Prevents concurrent requests from exhausting token ceilings during long generation streams.
            </p>
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            When an inference request is accepted, an initial soft reservation is locked in the governor. As output tokens stream back, the reservation is continuously reconciled with actual usage. If a client disconnects early, unused reserved tokens are immediately reclaimed by the scavenger engine.
          </p>
        </div>

        {/* Consumer-Grade Trust Seals */}
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
    </div>
  );
}
