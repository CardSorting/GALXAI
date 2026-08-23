'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Key,
  Shield,
  Zap,
  Rocket,
  Lock,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import type { ProviderType, ShardIsolationMode } from '@/core/contracts/GalxContracts';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { resilientFetch } from '@/lib/resilience/ResilientClient';

export default function DepositShardPage() {
  const router = useRouter();

  const [provider, setProvider] = useState<ProviderType>('openai');
  const [apiKey, setApiKey] = useState('');
  const [accountLabel, setAccountLabel] = useState('');
  const [shardMode, setShardMode] = useState<ShardIsolationMode>('pooled');
  const [priority, setPriority] = useState(10);
  const [weight, setWeight] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect provider prefix
  const handleKeyChange = (val: string) => {
    setApiKey(val);
    const trimmed = val.trim();
    if (trimmed.startsWith('xai-')) {
      setProvider('xai-grok');
      if (!accountLabel) setAccountLabel('xAI Grok Dedicated Account');
    } else if (trimmed.startsWith('sk-')) {
      setProvider('openai');
      if (!accountLabel) setAccountLabel('OpenAI Primary Account');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('API Key is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await resilientFetch<{ success: boolean; error?: string }>('/api/shards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim(),
          accountLabel: accountLabel.trim() || `${provider.toUpperCase()} Account`,
          shardMode,
          priority: Number(priority),
          weight: Number(weight)
        })
      });

      if (!res.data.success) {
        throw new Error(res.data.error || 'Failed to connect provider account');
      }

      router.push('/vault');
    } catch (err: any) {
      setError(err.message || 'Account registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Linked Accounts', href: '/vault' },
            { label: 'Connect Account' }
          ]}
        />

        <AuthRequiredGate
          title="Sign In to Connect Provider Accounts"
          description="Connecting provider credentials, hardware encryption, and isolated pooling require an authenticated developer workspace."
          checkoutAmount={50}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form */}
          <div className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold mb-2">
                <Key className="w-3.5 h-3.5" />
                <span>CONNECT PROVIDER ACCOUNT</span>
              </div>
              <h1 className="text-2xl font-black text-white">Connect Provider Account</h1>
              <p className="text-xs text-zinc-400">
                Link an OpenAI or xAI Grok credential. Encrypted with hardware AES-256-GCM and verified in real-time.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase">Select Provider</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setProvider('openai');
                      if (!accountLabel) setAccountLabel('OpenAI Primary Account');
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      provider === 'openai'
                        ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10'
                        : 'bg-black/30 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Zap className="w-4 h-4 fill-amber-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">OpenAI Codex</div>
                      <div className="text-[10px] text-zinc-400 font-mono">GPT-5.6 Sol / Terra</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProvider('xai-grok');
                      if (!accountLabel) setAccountLabel('xAI Grok Dedicated Account');
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      provider === 'xai-grok'
                        ? 'bg-emerald-500/15 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                        : 'bg-black/30 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Rocket className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">xAI Grok</div>
                      <div className="text-[10px] text-zinc-400 font-mono">Grok 4.5 500K</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* API Key Input */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                  {provider === 'xai-grok' ? 'xAI API Key (xai-...)' : 'OpenAI API Key (sk-...)'}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  placeholder={provider === 'xai-grok' ? 'xai-live-...' : 'sk-proj-...'}
                  className="w-full py-3 px-4 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 placeholder:text-zinc-600"
                  required
                />
              </div>

              {/* Account Label */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">Account Label</label>
                <input
                  type="text"
                  value={accountLabel}
                  onChange={(e) => setAccountLabel(e.target.value)}
                  placeholder="e.g. Production Team Key, Personal Dev Account"
                  className="w-full py-3 px-4 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 placeholder:text-zinc-600"
                />
              </div>

              {/* Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase">Compute Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShardMode('pooled')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      shardMode === 'pooled'
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-white'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Cooperative Pooled</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                      Participates in multi-key load balancing and rate-limit sharing.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShardMode('private')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      shardMode === 'private'
                        ? 'bg-indigo-500/20 border-indigo-500/60 text-white'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Lock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Dedicated Private</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-normal">
                      Reserved exclusively for your workspace requests.
                    </p>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Verifying & Encrypting...' : 'Connect Provider Account'}
              </button>
            </form>
          </div>

          {/* Right Column: Security Guarantees */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel rounded-3xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Security Invariants
              </h2>

              <div className="space-y-3 text-xs text-zinc-300">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <div className="font-bold text-white">AES-256-GCM Encryption</div>
                  <p className="text-[11px] text-zinc-400">
                    Keys are encrypted at rest with Authenticated Associated Data (AAD).
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <div className="font-bold text-white">Zero RAM Residue</div>
                  <p className="text-[11px] text-zinc-400">
                    Plaintext key buffers are overwritten with binary zeroes in heap immediately after requests complete.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <div className="font-bold text-white">&lt; 40ms Instant Disconnect</div>
                  <p className="text-[11px] text-zinc-400">
                    Retract or remove your credentials anytime with a single click.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </AuthRequiredGate>
      </main>
    </div>
  );
}
