'use client';

import React, { useState } from 'react';
import { Zap, Rocket, X, CheckCircle2, ShieldCheck, ArrowRight, Sparkles, Key, AlertCircle, Loader2 } from 'lucide-react';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';
import { SafeStorage } from '@/lib/resilience/SafeStorage';

interface AuthProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

function BaseAuthProviderModal({ isOpen, onClose, onSuccess }: AuthProviderModalProps) {
  const [activeTab, setActiveTab] = useState<'oauth' | 'token'>('oauth');
  const [loadingProvider, setLoadingProvider] = useState<'openai' | null>(null);
  const [mode, setMode] = useState<'pooled' | 'private'>('pooled');
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. OAuth 2.0 PKCE Flow
  const handleOAuthLogin = async () => {
    setLoadingProvider('openai');
    setError(null);
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const res = await resilientFetch<{ success: boolean; url: string; codeVerifier: string; state: string }>(
        `/api/auth/oauth/url?provider=openai&redirectUri=${encodeURIComponent(redirectUri)}`,
        { enableCacheFallback: false }
      );

      if (!res.data?.success || !res.data?.url) {
        throw new Error(res.data?.url ? undefined : 'Failed to initialize OAuth PKCE challenge');
      }

      SafeStorage.setJSON('galxai_oauth_pkce', {
        provider: 'openai',
        codeVerifier: res.data.codeVerifier,
        state: res.data.state,
        mode
      });

      window.location.href = res.data.url;
    } catch (err: any) {
      setError(err.message || 'Failed to start OAuth authentication');
      setLoadingProvider(null);
    }
  };

  // 2. Direct Token / Key Deposit
  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setError('Please paste a valid OAuth access token or API key');
      return;
    }

    setLoadingProvider('openai');
    setError(null);

    const isApiKey = tokenInput.startsWith('sk-');
    const endpoint = '/api/auth/openai';

    try {
      const res = await resilientFetch<{ success: boolean; user: any; error?: string }>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [isApiKey ? 'apiKey' : 'accessToken']: tokenInput.trim(),
          authType: isApiKey ? 'api_key' : 'oauth',
          mode
        }),
        enableCacheFallback: false
      });

      if (!res.data?.success || !res.data?.user) {
        throw new Error(res.data?.error || 'Authentication verification failed');
      }

      onSuccess(res.data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid authentication token');
    } finally {
      setLoadingProvider(null);
    }
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-emerald-500 to-teal-400 p-[1px] mx-auto shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#0d101c] rounded-[15px] flex items-center justify-center">
              <Zap className="w-6 h-6 text-cyan-400 fill-cyan-400" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white">Provider Authentication</h2>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Connect your OpenAI Codex credentials
          </p>
        </div>

        {/* Tab Selector */}
        <div className="mb-5 p-1 rounded-2xl bg-black/40 border border-white/5 grid grid-cols-2 gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setActiveTab('oauth'); setError(null); }}
            className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'oauth'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            1-Click OAuth
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('token'); setError(null); }}
            className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'token'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Token / Key
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: 1-Click OAuth */}
        {activeTab === 'oauth' && (
          <div className="space-y-3.5">
            <button
              type="button"
              onClick={handleOAuthLogin}
              disabled={loadingProvider !== null}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
            >
              <span className="flex items-center gap-3">
                <Zap className="w-5 h-5 fill-black text-black" />
                <span>{loadingProvider === 'openai' ? 'Connecting OAuth...' : 'Continue with OpenAI OAuth'}</span>
              </span>
              {loadingProvider === 'openai' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Tab 2: Direct Token / Key */}
        {activeTab === 'token' && (
          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                OAuth Bearer Access Token or API Key
              </label>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="sk-... or Bearer Token"
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 transition-all placeholder:text-zinc-600"
              />
            </div>

            <button
              type="submit"
              disabled={loadingProvider !== null || !tokenInput.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loadingProvider !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              <span>Vault & Authenticate</span>
            </button>
          </form>
        )}

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

