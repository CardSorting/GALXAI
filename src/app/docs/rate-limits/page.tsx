'use client';

import React from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Gauge,
  Zap,
  Activity,
  Sliders,
  CheckCircle2,
  Cpu,
  Layers
} from 'lucide-react';

export default function RateLimitsDocsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'Architecture & Trust', href: '/docs/architecture' },
            { label: 'Rate Limits & Concurrency Governor' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Rate Limits & Concurrency Governor Guide</h1>
            <p className="text-xs text-zinc-400">
              Continuous fractional token replenishment calculus, 2-phase token reservations, and burst handling.
            </p>
          </div>

          <Link
            href="/keys/rate-limits"
            className="px-4 py-2.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold flex items-center gap-2 transition-all"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Manage Key Quotas →</span>
          </Link>
        </div>

        <DocsSubNav />

        {/* Section: Continuous Fractional Calculus */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              1. Continuous Fractional Token Calculus
            </h2>
            <p className="text-xs text-zinc-400">
              Unlike traditional gateways that reset rate limits at the top of every minute, GALXAI recalculates capacity microsecond by microsecond.
            </p>
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            This continuous formula eliminates the "top-of-minute stampede" problem where thousands of concurrent agents slam upstream APIs at :00 seconds:
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
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              2. 2-Phase Token Reservation & Long-Stream Leases
            </h2>
            <p className="text-xs text-zinc-400">
              Prevents concurrent requests from exhausting token ceilings during long generation streams.
            </p>
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            When an inference request is accepted, an initial soft reservation is locked in the governor. As output tokens stream back, the reservation is continuously reconciled with actual usage. If a client disconnects early, unused reserved tokens are immediately reclaimed by the scavenger engine.
          </p>
        </div>
      </main>
    </div>
  );
}
