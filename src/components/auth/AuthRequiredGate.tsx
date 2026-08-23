'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Lock,
  ShieldCheck,
  Key,
  Zap,
  CheckCircle2,
  Activity,
  ArrowRight
} from 'lucide-react';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

interface AuthRequiredGateProps {
  title?: string;
  description?: string;
  checkoutAmount?: number;
  children: React.ReactNode;
}

function BaseAuthRequiredGate({
  title = 'Developer Authentication Required',
  description = 'You must connect your developer account or sign in to access your private workspace, telemetry, keys, and billing records.',
  checkoutAmount = 50,
  children
}: AuthRequiredGateProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3 font-mono text-xs text-zinc-400">
        <Activity className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
        <p>Authenticating developer workspace session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-black/50 to-black/70 shadow-2xl text-center space-y-8 relative overflow-hidden max-w-3xl mx-auto my-6">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/20">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>DEVELOPER AUTHENTICATION REQUIRED</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto font-mono text-xs">
          <Link
            href="/auth/connect"
            className="p-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-105"
          >
            <Key className="w-4 h-4 text-black fill-black" />
            <span>Connect Developer Account</span>
          </Link>

          <Link
            href={`/checkout?amount=${checkoutAmount}`}
            className="p-4 rounded-2xl bg-black/60 hover:bg-black/80 border border-emerald-500/40 text-emerald-300 font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-105"
          >
            <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            <span>Proceed to Checkout (${checkoutAmount})</span>
          </Link>
        </div>

        {/* 4 Trust Badges */}
        <div className="pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono text-zinc-400">
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>ZDR-100 Privacy</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Session Enclave</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>&lt; 15ms Latency</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
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
