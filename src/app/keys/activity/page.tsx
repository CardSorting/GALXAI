'use client';

import React from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { KeysSubNav } from '@/components/dashboard/KeysSubNav';
import {
  Activity,
  Zap,
  ShieldCheck,
  TrendingDown,
  Key,
  Clock
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { LiveUsageLedger } from '@/components/wallet/LiveUsageLedger';

export default function KeyActivityPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'API Keys', href: '/keys' },
            { label: 'Live Telemetry & Micro-Ledger' }
          ]}
        />

        <AuthRequiredGate
          title="Sign In to View Real-Time API Key Logs"
          description="Live request logs, token volume telemetry, and latency metrics are private to your authenticated developer workspace."
          checkoutAmount={50}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white font-sans">
                Real-Time Key Activity &amp; Sub-Cent Ledger
              </h1>
              <p className="text-xs text-zinc-400 font-sans">
                Live stream of token deductions, wholesale arbitrage savings, and zero-retention cryptographic attestations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Sub-Cent Stream Active
              </span>
            </div>
          </div>

          <KeysSubNav />

          <LiveUsageLedger />
        </AuthRequiredGate>
      </main>
    </div>
  );
}
