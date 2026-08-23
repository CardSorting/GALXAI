'use client';

import React, { useState } from 'react';
import { Zap, Rocket, X, CheckCircle2, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

interface AuthProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

function BaseAuthProviderModal({ isOpen, onClose, onSuccess }: AuthProviderModalProps) {
  const [loadingProvider, setLoadingProvider] = useState<'openai' | 'grok' | 'guest' | null>(null);
  const [mode, setMode] = useState<'pooled' | 'private'>('pooled');

  if (!isOpen) return null;

  const handleOpenAIAuth = async () => {
    setLoadingProvider('openai');
    try {
      const res = await resilientFetch<{ success: boolean; user: any }>('/api/auth/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'OpenAI Developer',
          email: 'dev@openai.codex',
          mode
        }),
        enableCacheFallback: false,
      });
      const data = res.data;
      if (data?.success) {
        onSuccess(data.user);
        onClose();
      }
    } catch {
      // Ignore
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGrokAuth = async () => {
    setLoadingProvider('grok');
    try {
      const res = await resilientFetch<{ success: boolean; user: any }>('/api/auth/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Grok Developer',
          email: 'dev@grok.xai',
          mode
        }),
        enableCacheFallback: false,
      });
      const data = res.data;
      if (data?.success) {
        onSuccess(data.user);
        onClose();
      }
    } catch {
      // Ignore
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGuestPass = async () => {
    setLoadingProvider('guest');
    const guestUser = {
      id: `guest_${Date.now().toString(36)}`,
      name: 'Guest Developer',
      email: 'guest@galxai.dev',
      provider: 'guest',
      token: `session_guest_${Date.now()}`
    };
    onSuccess(guestUser);
    setLoadingProvider(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg glass-panel border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/20 overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500 rounded-full" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] mx-auto shadow-lg shadow-indigo-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-[#0d101c] rounded-[15px] flex items-center justify-center">
              <Zap className="w-6 h-6 text-cyan-400 fill-cyan-400" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white">Choose Auth & Quota Provider</h2>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            "Provider IS Auth" • 1-Click single sign-on simultaneously establishes identity and compute quota.
          </p>
        </div>

        {/* Shard Mode Toggle */}
        <div className="mb-6 p-1.5 rounded-2xl bg-black/40 border border-white/5 grid grid-cols-2 gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('pooled')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'pooled'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Cooperative Pool (Shared)
          </button>
          <button
            type="button"
            onClick={() => setMode('private')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'private'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Dedicated Private Pipeline
          </button>
        </div>

        {/* Provider Buttons */}
        <div className="space-y-3.5">
          {/* OpenAI Button */}
          <button
            type="button"
            onClick={handleOpenAIAuth}
            disabled={loadingProvider !== null}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
          >
            <span className="flex items-center gap-3">
              <Zap className="w-5 h-5 fill-black text-black" />
              <span>{loadingProvider === 'openai' ? 'Authorizing with OpenAI...' : 'Continue with OpenAI'}</span>
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* xAI Grok Button */}
          <button
            type="button"
            onClick={handleGrokAuth}
            disabled={loadingProvider !== null}
            className="w-full py-3.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/10 hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
          >
            <span className="flex items-center gap-3">
              <Rocket className="w-5 h-5 text-emerald-400" />
              <span>{loadingProvider === 'grok' ? 'Authorizing with xAI...' : 'Continue with xAI Grok'}</span>
            </span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Guest Pass */}
          <button
            type="button"
            onClick={handleGuestPass}
            disabled={loadingProvider !== null}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Explore Sandbox as Guest</span>
          </button>
        </div>

        {/* Security Invariants Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-4 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> AES-256-GCM Vault
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> 1-Click Retraction
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> 0% Quota Leakage
          </span>
        </div>
      </div>
    </div>
  );
}

export const AuthProviderModal = withErrorBoundary(BaseAuthProviderModal, {
  name: 'Auth Provider Modal',
  fallback: null
});
