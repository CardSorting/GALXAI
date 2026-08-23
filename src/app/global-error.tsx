'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log fatal runtime errors for observability
    console.error('💥 [GALXAI Global Error Boundary Caught]:', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#07080d] text-white flex items-center justify-center p-4 font-sans antialiased">
        <div className="max-w-md w-full glass-panel rounded-3xl p-8 border border-rose-500/30 bg-gradient-to-b from-rose-500/10 via-black/80 to-black/90 shadow-2xl text-center space-y-6 relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400 shadow-lg shadow-rose-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              <AlertTriangle className="w-3 h-3" />
              <span>SYSTEM ENCLAVE RECOVERY</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Application Runtime Interrupted
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              An unexpected error occurred in the root gateway lifecycle. Your session credentials and cryptographic keys remain fully isolated and secure.
            </p>
          </div>

          {error.digest && (
            <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 font-mono text-[10px] text-zinc-400 truncate">
              Digest ID: {error.digest}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
            <button
              onClick={() => reset()}
              className="py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-500/25"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Session</span>
            </button>

            <button
              onClick={() => { window.location.href = '/'; }}
              className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center gap-2 transition-all border border-white/10 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return Home</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
