'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Terminal,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ArrowLeft,
  X
} from 'lucide-react';

function DeviceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loginWithOAuth } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prefillCode = searchParams.get('code');
    if (prefillCode) {
      setCode(prefillCode.toUpperCase());
    }
  }, [searchParams]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 8) val = val.substring(0, 8);
    if (val.length > 4) {
      val = `${val.substring(0, 4)}-${val.substring(4)}`;
    }
    setCode(val);
    setError(null);
  };

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.replace(/[^A-Z0-9]/g, '');
    if (cleanCode.length < 8) {
      setError('Please enter the full 8-character code shown in your terminal.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/oauth/device/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userCode: code,
          sessionToken: user?.token
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error_description || data.error || 'Failed to authorize device');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'The code is invalid or expired. Check your terminal and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10 space-y-6">
      {success ? (
        /* Success State */
        <div className="bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Device Authorized!</h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              You're all set. You can now close this window and return to your terminal.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/playground"
              className="w-full py-3.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Go to Playground</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* Code Entry Form */
        <div className="bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-white/10 flex items-center justify-center mx-auto shadow-inner text-amber-400">
              <Terminal className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Connect Device
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Enter the code displayed in your terminal
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-400 hover:text-rose-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuthorize} className="space-y-4">
            <div>
              <input
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="XXXX-XXXX"
                autoFocus
                maxLength={9}
                className="w-full h-14 px-4 text-center tracking-[0.25em] text-xl font-mono uppercase rounded-xl bg-black/50 border border-white/15 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-semibold"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.replace(/[^A-Z0-9]/g, '').length < 8}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-semibold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Authorize Device</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Back to regular login */}
          <div className="pt-2 border-t border-white/5 text-center">
            <Link
              href="/auth/connect"
              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to standard sign in</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeviceAuthPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-zinc-100 selection:bg-zinc-800 selection:text-white">
      <Navigation />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[320px] bg-gradient-to-tr from-amber-500/10 via-orange-500/5 to-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <Suspense fallback={
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
        }>
          <DeviceContent />
        </Suspense>
      </main>
    </div>
  );
}
