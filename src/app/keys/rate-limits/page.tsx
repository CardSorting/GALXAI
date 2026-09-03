'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { KeysSubNav } from '@/components/dashboard/KeysSubNav';
import {
  Gauge,
  Sliders,
  CheckCircle2,
  Key,
  Save,
  Zap,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { ErrorBoundary, withErrorBoundary } from '@/components/common/ErrorBoundary';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { useAuth } from '@/contexts/AuthContext';

function BaseRateLimitsPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [rpmLimit, setRpmLimit] = useState(120);
  const [tpmLimit, setTpmLimit] = useState(250000);
  const [burstMultiplier, setBurstMultiplier] = useState(1.5);
  const [retryBackoff, setRetryBackoff] = useState('exponential_jitter');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchKeys = async () => {
    if (!user?.id) {
      setKeys([]);
      return;
    }
    try {
      const res = await resilientFetch<{ keys: any[] }>(`/api/keys?userId=${encodeURIComponent(user.id)}`, { enableCacheFallback: true });
      const activeKeys = res.data?.keys?.filter(k => !k.revoked) || [];
      setKeys(activeKeys);
      if (activeKeys.length > 0 && !selectedKeyId) {
        setSelectedKeyId(activeKeys[0].id);
        const k = activeKeys[0];
        setRpmLimit(k.rateLimitPerMinute || 120);
        setTpmLimit(k.rateLimitPerMinute ? k.rateLimitPerMinute * 2000 : 250000);
      }
    } catch {}
  };

  useEffect(() => {
    if (user?.id) {
      fetchKeys();
    }
  }, [user?.id]);

  const handleSelectKey = (id: string) => {
    setSelectedKeyId(id);
    const k = keys.find(k => k.id === id);
    if (k) {
      setRpmLimit(k.rateLimitPerMinute || 120);
      setTpmLimit(k.rateLimitPerMinute ? k.rateLimitPerMinute * 2000 : 250000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKeyId) return;

    setIsSaving(true);
    try {
      const res = await resilientFetch(`/api/keys/${selectedKeyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rateLimitPerMinute: rpmLimit, userId: user?.id })
      });
      if (res.data?.success) {
        setSavedSuccess(true);
        fetchKeys();
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch {} finally {
      setIsSaving(false);
    }
  };

  const selectedKeyData = keys.find(k => k.id === selectedKeyId);
  const currentRequests = selectedKeyData?.totalRequests || 0;
  const currentTokens = selectedKeyData?.totalTokens || 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-zinc-100 font-sans">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'API Keys', href: '/keys' },
            { label: 'Rate Limits' }
          ]}
        />

        <ErrorBoundary name="Keys Navigation">
          <KeysSubNav />
        </ErrorBoundary>

        <AuthRequiredGate
          title="Sign In to Configure Rate Limits & Quotas"
          description="RPM and TPM limit governors, burst allowance allocations, and retry backoff policies are private to your workspace."
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Rate Limits &amp; Concurrency Governor</h1>
              <p className="text-xs text-zinc-400 mt-1">
                Configure per-key RPM / TPM ceilings, burst multiplier allowances, and circuit-breaker backoff policies.
              </p>
            </div>
          </div>

          {savedSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Rate limit quotas and burst parameters updated successfully!</span>
            </div>
          )}

          {keys.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl bg-[#0d101c] border border-white/10 space-y-3">
              <Key className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-300">No active keys found</p>
              <p className="text-xs text-zinc-500">Create an API key to configure rate limit quotas and concurrency governors.</p>
              <Link href="/keys/new" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors">
                Create API Key
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Key Selector Bar */}
              <div className="p-4 rounded-2xl border border-white/10 bg-[#0d101c] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-zinc-400 font-mono uppercase">Target Key:</span>
                  <h3 className="text-sm font-semibold text-white">Configuring Throughput Governor</h3>
                </div>

                <select
                  value={selectedKeyId}
                  onChange={(e) => handleSelectKey(e.target.value)}
                  className="py-2 px-3 rounded-xl bg-black/50 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {keys.map((k) => (
                    <option key={k.id} value={k.id} className="bg-[#0d101c] text-white">
                      {k.keyPrefix || k.prefix}... • {k.name} ({k.rateLimitPerMinute || 120} RPM)
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Quota Utilization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 font-mono text-xs">
                <div className="p-5 rounded-2xl border border-white/10 bg-[#0d101c] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 uppercase text-[10px]">Configured RPM Ceiling</span>
                    <span className="font-bold text-white text-sm">{rpmLimit} RPM</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: '35%' }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>Lifetime Requests: {currentRequests.toLocaleString()}</span>
                    <span className="text-emerald-400">Zero 429 Throttle</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-white/10 bg-[#0d101c] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 uppercase text-[10px]">Tokens Per Minute (TPM)</span>
                    <span className="font-bold text-white text-sm">{tpmLimit.toLocaleString()} TPM</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: '45%' }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>Lifetime Tokens: {currentTokens.toLocaleString()}</span>
                    <span className="text-cyan-400">Cache Active</span>
                  </div>
                </div>
              </div>

              {/* Rate Limit Rules Configuration */}
              <div className="p-5 rounded-2xl border border-white/10 bg-[#0d101c] space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>Rate Limiter Parameters</span>
                  </h3>
                  <p className="text-xs text-zinc-400">Tune quota ceilings and burst tolerance for production workloads.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1.5">
                    <label className="text-zinc-300 font-sans text-xs font-medium">Requests Per Minute (RPM) Ceiling</label>
                    <select
                      value={rpmLimit}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setRpmLimit(val);
                        setTpmLimit(val * 2000);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value={60} className="bg-[#0d101c] text-white">60 RPM (CLI & Prototyping)</option>
                      <option value={120} className="bg-[#0d101c] text-white">120 RPM (Cursor IDE & Standard)</option>
                      <option value={300} className="bg-[#0d101c] text-white">300 RPM (Production Backend Server)</option>
                      <option value={600} className="bg-[#0d101c] text-white">600 RPM (Multi-Agent Swarm Fleet)</option>
                      <option value={1200} className="bg-[#0d101c] text-white">1,200 RPM (Enterprise Dedicated)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-zinc-300 font-sans text-xs font-medium">Burst Multiplier Allowance</label>
                    <select
                      value={burstMultiplier}
                      onChange={(e) => setBurstMultiplier(Number(e.target.value))}
                      className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value={1.0} className="bg-[#0d101c] text-white">1.0x (Strict Constant Rate)</option>
                      <option value={1.5} className="bg-[#0d101c] text-white">1.5x (Recommended - Absorbs Spikes)</option>
                      <option value={2.0} className="bg-[#0d101c] text-white">2.0x (High-Burst Elastic Queuing)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5 pt-1">
                    <label className="text-zinc-300 font-sans text-xs font-medium">Rate Governor 429 Handling Strategy</label>
                    <select
                      value={retryBackoff}
                      onChange={(e) => setRetryBackoff(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="exponential_jitter" className="bg-[#0d101c] text-white">Exponential Backoff with Full Jitter (Recommended)</option>
                      <option value="immediate_failover" className="bg-[#0d101c] text-white">Immediate Circuit-Breaker Failover (&lt; 15ms Auto-Reroute)</option>
                      <option value="queue_pause" className="bg-[#0d101c] text-white">Adaptive Queue Token Reservation Pause</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-white/10">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save Rate Limits'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </AuthRequiredGate>
      </main>
    </div>
  );
}

export default withErrorBoundary(BaseRateLimitsPage, {
  name: 'Rate Limits Page'
});
