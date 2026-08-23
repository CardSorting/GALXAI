'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Shield,
  Zap,
  Rocket,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Power,
  Trash2,
  Lock,
  Users,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { formatNumber, formatTimeAgo } from '@/lib/utils';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { resilientFetch } from '@/lib/resilience/ResilientClient';

export default function ShardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shardId = params.id as string;

  const [shard, setShard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchShard = React.useCallback(async () => {
    try {
      const res = await resilientFetch<{ shards: any[] }>('/api/shards', { enableCacheFallback: true });
      const found = res.data.shards?.find((s: any) => s.id === shardId);
      setShard(found || null);
    } catch {} finally {
      setIsLoading(false);
    }
  }, [shardId]);

  useEffect(() => {
    fetchShard();
    const interval = setInterval(fetchShard, 3000);
    return () => clearInterval(interval);
  }, [fetchShard]);

  const handleToggleMode = async () => {
    if (!shard) return;
    const nextMode = shard.shardMode === 'private' ? 'pooled' : 'private';
    try {
      await resilientFetch(`/api/shards/${shard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shardMode: nextMode,
          priority: nextMode === 'private' ? 50 : 10
        })
      });
      fetchShard();
      showToast(`Mode switched to ${nextMode.toUpperCase()}`);
    } catch {
      showToast('Failed to update mode');
    }
  };

  const handleRetract = async () => {
    if (!shard) return;
    try {
      const res = await resilientFetch<{ success: boolean }>(`/api/shards/${shard.id}/retract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: shard.userId })
      });
      if (res.data.success) {
        showToast('🛑 1-Click Retraction: Shard evicted and memory zeroized');
        setTimeout(() => router.push('/vault'), 1000);
      }
    } catch {
      showToast('Failed to retract shard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 max-w-5xl w-full mx-auto p-8 animate-pulse space-y-6">
          <div className="h-8 w-48 bg-white/5 rounded-xl" />
          <div className="h-64 glass-panel rounded-3xl" />
        </main>
      </div>
    );
  }

  if (!shard) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 max-w-5xl w-full mx-auto p-8 text-center space-y-4 my-auto">
          <Shield className="w-12 h-12 text-zinc-600 mx-auto" />
          <h1 className="text-xl font-bold text-white">Shard Not Found or Revoked</h1>
          <p className="text-xs text-zinc-400">The requested quota shard may have been retracted or deleted.</p>
          <Link
            href="/vault"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold inline-block"
          >
            Back to Shard Vault
          </Link>
        </main>
      </div>
    );
  }

  const tokenPercent = Math.min(
    100,
    Math.round(((shard.tokenBucket?.remainingTokens || 0) / (shard.tokenBucket?.maxTokens || 1)) * 100)
  );

  return (
    <div className="min-h-screen flex flex-col">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl glass-panel-glow border border-indigo-500/50 text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}

      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Linked Accounts', href: '/vault' },
            { label: shard.accountLabel || shard.id }
          ]}
        />

        <AuthRequiredGate
          title="Sign In to Inspect Provider Shard Quotas"
          description="Hardware AES-256 encrypted quota shards, token replenishment buckets, and lease activity are private to your workspace."
          checkoutAmount={50}
        >
          {/* Shard Hero Header */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  shard.provider === 'xai-grok' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                }`}>
                  {shard.provider === 'xai-grok' ? <Rocket className="w-6 h-6" /> : <Zap className="w-6 h-6 fill-amber-400" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-white">{shard.accountLabel}</h1>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      shard.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {shard.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-mono">
                    ID: <code className="text-zinc-300">{shard.id}</code> • Masked: <code className="text-cyan-300">{shard.apiKeyMasked}</code>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMode}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
                >
                  {shard.shardMode === 'private' ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-emerald-400" /> Switch to Pooled
                    </>
                  ) : (
                    <>
                      <Users className="w-3.5 h-3.5 text-indigo-400" /> Switch to Private
                    </>
                  )}
                </button>

                <button
                  onClick={handleRetract}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  1-Click Retract
                </button>
              </div>
            </div>

            {/* Telemetry Matrix Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10 font-mono">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-zinc-500 text-[10px] uppercase">Tokens Remaining</span>
                <div className="text-base font-bold text-white">
                  {formatNumber(shard.tokenBucket?.remainingTokens || 0)} <span className="text-xs text-zinc-500 font-normal">/ {formatNumber(shard.tokenBucket?.maxTokens || 0)}</span>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-zinc-500 text-[10px] uppercase">Active In-Flight Leases</span>
                <div className="text-base font-bold text-cyan-300">{shard.inFlight || 0} concurrent</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-zinc-500 text-[10px] uppercase">Total Tokens Served</span>
                <div className="text-base font-bold text-amber-300">{formatNumber(shard.stats?.totalTokensConsumed || 0)}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-zinc-500 text-[10px] uppercase">Total Requests Served</span>
                <div className="text-base font-bold text-emerald-300">{shard.stats?.totalRequestsServed || 0}</div>
              </div>
            </div>

            {/* Token Bucket Progress Bar */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Continuous Token Capacity ({tokenPercent}%)</span>
                <span className="text-zinc-400">Refill: 500k tok/min</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${tokenPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Cryptographic Protection Invariants */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              Cryptographic Vault Envelope
            </h2>

            <div className="p-4 rounded-2xl bg-black/50 border border-white/5 font-mono text-xs text-zinc-400 space-y-2">
              <div><strong>Key Derivation:</strong> HKDF-SHA256 (Keyring Version v1)</div>
              <div><strong>Cipher Mode:</strong> AES-256-GCM (128-bit authentication tag)</div>
              <div><strong>AAD Binding:</strong> <code className="text-cyan-300">{shard.userId}:{shard.id}:{shard.provider}</code></div>
              <div><strong>Memory Lifetime:</strong> Zeroized in heap via Buffer.fill(0) inside finally blocks</div>
            </div>
          </div>
        </AuthRequiredGate>
      </main>
    </div>
  );
}
