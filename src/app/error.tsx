'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ShieldCheck,
  RotateCcw,
  Key,
  CreditCard
} from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Page Error Boundary]:', error);
  }, [error]);

  return (
    <main className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-lg w-full glass-panel rounded-3xl p-6 sm:p-8 border border-rose-500/30 bg-gradient-to-b from-rose-500/10 via-black/80 to-black/90 shadow-2xl text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-rose-500/10 rounded-full blur-[90px] pointer-events-none" />

        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400 shadow-xl shadow-rose-500/20">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SESSION ISOLATION ACTIVE</span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight font-sans">
            Page View Encountered an Error
          </h2>

          <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-md mx-auto">
            The requested page state could not be rendered, but your API keys and compute wallet are unaffected.
          </p>
        </div>

        {error.digest && (
          <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 font-mono text-[10px] text-zinc-400 truncate">
            Error Digest: {error.digest}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs pt-2">
          <button
            onClick={() => reset()}
            className="py-3 px-4 rounded-2xl bg-rose-500 hover:bg-rose-400 text-black font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-500/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center gap-2 transition-all border border-white/10 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Hard Refresh</span>
          </button>
        </div>

        {/* Quick Fallback Navigation */}
        <div className="pt-4 border-t border-white/10 grid grid-cols-3 gap-2 font-mono text-xs text-zinc-400">
          <Link
            href="/"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1.5 transition-all"
          >
            <Home className="w-3.5 h-3.5 text-cyan-400" />
            <span>Home</span>
          </Link>

          <Link
            href="/billing"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1.5 transition-all"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Wallet</span>
          </Link>

          <Link
            href="/keys"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1.5 transition-all"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>Keys</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
