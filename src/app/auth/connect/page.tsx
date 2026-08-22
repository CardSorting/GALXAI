'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { useAuth } from '@/contexts/AuthContext';
import {
  Zap,
  Rocket,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Key
} from 'lucide-react';

export default function ConnectProviderPage() {
  const router = useRouter();
  const { user, loginWithOpenAI, loginWithGrok, loginAsGuest, logout } = useAuth();

  const [loadingProvider, setLoadingProvider] = useState<'openai' | 'grok' | 'guest' | null>(null);
  const [connectingStep, setConnectingStep] = useState<'idle' | 'verifying' | 'authorizing' | 'ready'>('idle');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [customMode, setCustomMode] = useState<'pooled' | 'private'>('pooled');
  const [error, setError] = useState<string | null>(null);

  const handleOpenAIConnect = async () => {
    setLoadingProvider('openai');
    setConnectingStep('verifying');
    setError(null);
    try {
      await new Promise(r => setTimeout(r, 400));
      setConnectingStep('authorizing');
      await new Promise(r => setTimeout(r, 400));

      await loginWithOpenAI({
        apiKey: customKey.trim() || undefined,
        mode: customMode
      });

      setConnectingStep('ready');
      setTimeout(() => {
        router.push('/keys');
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with OpenAI');
      setLoadingProvider(null);
      setConnectingStep('idle');
    }
  };

  const handleGrokConnect = async () => {
    setLoadingProvider('grok');
    setConnectingStep('verifying');
    setError(null);
    try {
      await new Promise(r => setTimeout(r, 400));
      setConnectingStep('authorizing');
      await new Promise(r => setTimeout(r, 400));

      await loginWithGrok({
        apiKey: customKey.trim() || undefined,
        mode: customMode
      });

      setConnectingStep('ready');
      setTimeout(() => {
        router.push('/keys');
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with xAI Grok');
      setLoadingProvider(null);
      setConnectingStep('idle');
    }
  };

  const handleGuestConnect = async () => {
    setLoadingProvider('guest');
    setConnectingStep('verifying');
    setError(null);
    try {
      await loginAsGuest();
      setConnectingStep('ready');
      setTimeout(() => {
        router.push('/keys');
      }, 300);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize guest pass');
      setLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'Provider Single Sign-On' }]} />

        {/* Hero & Authenticated User Status */}
        {user ? (
          <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-emerald-500/30 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-white">{user.name}</h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold uppercase border border-emerald-500/30">
                      {user.provider} Authenticated
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono">
                    Session Email: {user.email} • Vault Shard: <code className="text-cyan-300">{user.shardId}</code>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/keys"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
                >
                  Manage API Keys
                </Link>
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Value Proposition */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 fill-amber-400 animate-pulse" />
                <span>Provider IS Auth Architecture</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  One Sign-In.<br />
                  <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
                    Automatic Compute Quota.
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  You don't need to know about API keys or paste complex <code className="text-amber-300 font-mono">sk-...</code> strings. Authenticating with OpenAI or xAI Grok automatically establishes your identity and provisions compute quota in one seamless step.
                </p>
              </div>

              {/* Guarantees Matrix */}
              <div className="space-y-3 pt-2 font-mono text-xs">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-sans block text-xs">Zero Manual API Keys Required</strong>
                    <span className="text-zinc-400 text-[11px]">Identity establishes compute quota automatically.</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-sans block text-xs">Hardware AES-256-GCM Vaulting</strong>
                    <span className="text-zinc-400 text-[11px]">Zero plaintext lingering in memory. Continuous token rate governance.</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-sans block text-xs">Instant 1-Click Disconnection</strong>
                    <span className="text-zinc-400 text-[11px]">Retract or sign out anytime in under 40 milliseconds.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Auth Card */}
            <div className="lg:col-span-6 glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-2xl space-y-6">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 mx-auto mb-3">
                  <Zap className="w-6 h-6 text-black fill-black" />
                </div>
                <h2 className="text-xl font-black text-white">Choose Your Provider</h2>
                <p className="text-xs text-zinc-400">Zero separate passwords • Instant 1-click single sign-on</p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              {/* 1-Click Buttons */}
              <div className="space-y-3">
                {/* Option 1: OpenAI */}
                <button
                  type="button"
                  onClick={handleOpenAIConnect}
                  disabled={loadingProvider !== null}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  {loadingProvider === 'openai' ? (
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4 fill-black animate-spin" />
                      {connectingStep === 'verifying' && 'Connecting to OpenAI...'}
                      {connectingStep === 'authorizing' && 'Provisioning Hardware Vault...'}
                      {connectingStep === 'ready' && 'Authorized! Launching Gateway...'}
                    </span>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-black" />
                      <span>Continue with OpenAI</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Option 2: xAI Grok */}
                <button
                  type="button"
                  onClick={handleGrokConnect}
                  disabled={loadingProvider !== null}
                  className="w-full py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  {loadingProvider === 'grok' ? (
                    <span className="flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-emerald-400 animate-spin" />
                      {connectingStep === 'verifying' && 'Connecting to xAI Grok...'}
                      {connectingStep === 'authorizing' && 'Provisioning Hardware Vault...'}
                      {connectingStep === 'ready' && 'Authorized! Launching Gateway...'}
                    </span>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 text-emerald-400" />
                      <span>Continue with xAI Grok</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Guest Sandbox Pass */}
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-zinc-800" />
                <span className="absolute px-3 bg-zinc-950 text-[10px] uppercase font-mono font-bold text-zinc-500">
                  Or Preview As Guest
                </span>
              </div>

              <button
                type="button"
                onClick={handleGuestConnect}
                disabled={loadingProvider !== null}
                className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Instant 1-Click Guest Pass (Zero Credentials)</span>
              </button>

              {/* Optional Developer Advanced Accordion */}
              <div className="pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between text-[11px] text-zinc-500 hover:text-zinc-300 font-mono py-1 cursor-pointer"
                >
                  <span>Advanced Developer Options (Optional Custom Key)</span>
                  {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3 p-3 rounded-2xl bg-black/40 border border-white/5 text-xs animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                        Custom API Key (Optional)
                      </label>
                      <input
                        type="password"
                        value={customKey}
                        onChange={(e) => setCustomKey(e.target.value)}
                        placeholder="sk-... or xai-..."
                        className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                        Compute Allocation Mode
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomMode('pooled')}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border ${
                            customMode === 'pooled' ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300' : 'bg-black/20 border-white/5 text-zinc-400'
                          }`}
                        >
                          Cooperative Pooled
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomMode('private')}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border ${
                            customMode === 'private' ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300' : 'bg-black/20 border-white/5 text-zinc-400'
                          }`}
                        >
                          Dedicated Private
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
