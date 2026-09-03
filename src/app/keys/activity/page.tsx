'use client';

import React from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { KeysSubNav } from '@/components/dashboard/KeysSubNav';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { LiveUsageLedger } from '@/components/wallet/LiveUsageLedger';
import { ErrorBoundary, withErrorBoundary } from '@/components/common/ErrorBoundary';

function BaseKeyActivityPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-zinc-100 font-sans">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'API Keys', href: '/keys' },
            { label: 'Activity & Telemetry' }
          ]}
        />

        <ErrorBoundary name="Keys Navigation">
          <KeysSubNav />
        </ErrorBoundary>

        <AuthRequiredGate
          title="Sign In to View Real-Time API Key Logs"
          description="Live request logs, token volume telemetry, and latency metrics are private to your workspace."
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Live Key Activity &amp; Telemetry
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Real-time stream of request events, token deductions, and gateway latency telemetry.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Stream Active
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d101c] p-4 sm:p-6 overflow-hidden">
            <LiveUsageLedger />
          </div>
        </AuthRequiredGate>
      </main>
    </div>
  );
}

export default withErrorBoundary(BaseKeyActivityPage, {
  name: 'Key Activity Page'
});
