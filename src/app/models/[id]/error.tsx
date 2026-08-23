'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Cpu, RefreshCw, ArrowLeft, Home } from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';

export default function SingleModelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Single Model Error Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="w-full glass-panel rounded-3xl p-8 sm:p-10 border border-cyan-500/30 bg-gradient-to-b from-cyan-500/10 via-black/80 to-black/90 shadow-2xl text-center space-y-6 relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center mx-auto text-cyan-400 shadow-xl shadow-cyan-500/20">
            <Cpu className="w-7 h-7" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold">
              <span>MODEL BENCHMARK SPECIFICATION</span>
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight font-sans">
              Model Benchmark Unresolved
            </h2>

            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              The benchmark matrix or token economics for this specific model could not be loaded.
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
              className="w-full py-3 px-5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Spec</span>
            </button>

            <Link
              href="/models"
              className="w-full py-3 px-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center gap-2 transition-all border border-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Catalog</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
