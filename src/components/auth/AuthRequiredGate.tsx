'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Lock,
  ShieldCheck,
  Key,
  Zap,
  CheckCircle2,
  Activity,
  ArrowRight,
  Sparkles,
  Github,
  Loader2
} from 'lucide-react';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

interface AuthRequiredGateProps {
  title?: string;
  description?: string;
  checkoutAmount?: number;
  showCheckoutButton?: boolean;
  children: React.ReactNode;
}

function BaseAuthRequiredGate({
  title = 'Sign In Required',
  description = 'Sign in with your developer account to access your workspace, API keys, telemetry, and settings.',
  checkoutAmount = 50,
  showCheckoutButton = false,
  children
}: AuthRequiredGateProps) {
  const { user, isLoading, signInWithOAuth } = useAuth();
  const pathname = usePathname() || '/';
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="w-full py-8 space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-white/10 rounded-2xl" />
          <div className="h-4 w-96 max-w-full bg-white/5 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-28 bg-white/5 rounded-3xl border border-white/10" />
          <div className="h-28 bg-white/5 rounded-3xl border border-white/10" />
          <div className="h-28 bg-white/5 rounded-3xl border border-white/10" />
        </div>
        <div className="h-72 bg-white/5 rounded-3xl border border-white/10" />
      </div>
    );
  }

  if (!user) {
    const handleOAuth = async (provider: 'github' | 'google') => {
      setOauthLoading(provider);
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        await signInWithOAuth(provider, {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(pathname)}`
        });
      } catch {
        setOauthLoading(null);
      }
    };

    return (
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-black/60 to-black/80 shadow-2xl text-center space-y-7 relative overflow-hidden max-w-2xl mx-auto my-6">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/20">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AUTHENTICATION REQUIRED</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
            {description}
          </p>
        </div>

        <div className="max-w-md mx-auto space-y-3">

          {/* Social OAuth Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleOAuth('github')}
              disabled={Boolean(oauthLoading)}
              className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {oauthLoading === 'github' ? (
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              ) : (
                <Github className="w-4 h-4" />
              )}
              <span>GitHub</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={Boolean(oauthLoading)}
              className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.9C3.7 20.6 7.5 23.5 12 23.5z" />
                </svg>
              )}
              <span>Google</span>
            </button>
          </div>

          {/* Links for Standard Sign In & Checkout */}
          <div className="pt-2 flex items-center justify-between text-xs font-sans">
            <Link
              href={`/auth/signin?next=${encodeURIComponent(pathname)}`}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Sign in with Email</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href={`/auth/signup?next=${encodeURIComponent(pathname)}`}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Create Account
            </Link>
          </div>

          {showCheckoutButton && (
            <div className="pt-2">
              <Link
                href={`/checkout?amount=${checkoutAmount}`}
                className="w-full py-2.5 px-4 rounded-xl bg-black/60 hover:bg-black/80 border border-emerald-500/40 text-emerald-300 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>Proceed to Checkout (${checkoutAmount})</span>
              </Link>
            </div>
          )}
        </div>

        {/* 4 Trust Badges */}
        <div className="pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono text-zinc-400">
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>ZDR-100 Privacy</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Session Enclave</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>&lt; 15ms Latency</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>100% Refundable</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export const AuthRequiredGate = withErrorBoundary(BaseAuthRequiredGate, {
  name: 'Auth Required Gate'
});
