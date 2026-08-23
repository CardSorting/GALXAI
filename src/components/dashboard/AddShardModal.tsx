'use client';

import React, { useState } from 'react';
import { X, Key, Shield, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { ProviderType } from '@/core/contracts/GalxContracts';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

interface AddShardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function BaseAddShardModal({ isOpen, onClose, onSuccess }: AddShardModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [accountLabel, setAccountLabel] = useState('');
  const [provider, setProvider] = useState<ProviderType>('openai');
  const [shardMode, setShardMode] = useState<'pooled' | 'private'>('pooled');
  const [priority, setPriority] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleKeyChange = (val: string) => {
    setApiKey(val);
    if (val.startsWith('xai-') || val.toLowerCase().includes('grok')) {
      setProvider('xai-grok');
    } else if (val.startsWith('sk-')) {
      setProvider('openai');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please enter a valid API key');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await resilientFetch<{ success?: boolean; error?: string }>('/api/shards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          accountLabel: accountLabel.trim() || (provider === 'xai-grok' ? 'xAI Grok Key Shard' : 'OpenAI Key Shard'),
          provider,
          shardMode,
          priority: Number(priority)
        }),
        enableCacheFallback: false,
      });

      const data = res.data;
      if (!data?.success && data?.error) {
        throw new Error(data.error || 'Failed to deposit key');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Key registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg glass-panel border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/20">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 mb-2">
            <Key className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-black text-white">Deposit Quota Shard Key</h2>
          <p className="text-xs text-zinc-400">
            Vaulted with Authenticated Associated Data (AAD). Auto-verified via live pre-flight probe.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">Provider</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProvider('openai')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  provider === 'openai'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                    : 'bg-black/30 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <span>⚡ OpenAI Codex</span>
              </button>
              <button
                type="button"
                onClick={() => setProvider('xai-grok')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  provider === 'xai-grok'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm'
                    : 'bg-black/30 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <span>🚀 xAI Grok</span>
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
              placeholder={provider === 'xai-grok' ? 'xai-...' : 'sk-proj-...'}
              className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500/80 transition-all placeholder:text-zinc-600"
              required
            />
          </div>

          {/* Label Input */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">Account Label (Optional)</label>
            <input
              type="text"
              value={accountLabel}
              onChange={(e) => setAccountLabel(e.target.value)}
              placeholder="e.g. My Personal Tier 5 Account"
              className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500/80 transition-all placeholder:text-zinc-600"
            />
          </div>

          {/* Shard Mode Toggle */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">Compute Allocation Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShardMode('pooled')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer ${
                  shardMode === 'pooled'
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 font-bold'
                    : 'bg-black/30 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Pooled (Cooperative)
                </div>
                <p className="text-[10px] text-zinc-500 font-normal mt-0.5">Shared rotation & pool yield</p>
              </button>

              <button
                type="button"
                onClick={() => setShardMode('private')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer ${
                  shardMode === 'private'
                    ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 font-bold'
                    : 'bg-black/30 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" /> Dedicated Private
                </div>
                <p className="text-[10px] text-zinc-500 font-normal mt-0.5">100% isolated to your user ID</p>
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying & Vaulting Key...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Vault & Initialize Shard</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export const AddShardModal = withErrorBoundary(BaseAddShardModal, {
  name: 'Add Shard Modal',
  fallback: null
});
