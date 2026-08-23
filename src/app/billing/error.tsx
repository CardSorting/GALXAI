'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  Key,
  ShieldCheck
} from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';

export default function BillingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Billing Error Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="w-full glass-panel rounded-3xl p-8 sm:p-10 border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-black/80 to-black/90 shadow-2xl text-center space-y-6 relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/20">
            <Wallet className="w-7 h-7" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>COMPUTE WALLET SAFEGUARD</span>
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight font-sans">
              Billing Ledger Sync Interrupted
            </h2>

            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              The billing telemetry feed could not be resolved. Your prepaid balance and ongoing inference requests remain protected.
            </p>
          </div>

          {error.digest && (
            <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 font-mono text-[10px] text-zinc-400 max-w-xs mx-auto truncate">
              Digest: {error.digest}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 font-mono text-xs max-w-xs mx-auto">
            <button
              onClick={() => reset()}
              className="w-full py-3 px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Billing Sync</span>
            </button>

            <Link
              href="/keys"
              className="w-full py-3 px-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center gap-2 transition-all border border-white/10"
            >
              <Key className="w-4 h-4 text-cyan-400" />
              <span>View API Keys</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
