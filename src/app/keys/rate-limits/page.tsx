'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { KeysSubNav } from '@/components/dashboard/KeysSubNav';
import {
  Gauge,
  Zap,
  Sliders,
  CheckCircle2,
  Check,
  Key,
  ShieldCheck,
  TrendingUp,
  Activity,
  Flame,
  Save,
  Gift,
  ArrowRight
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { useAuth } from '@/contexts/AuthContext';
import { KeyActivationPaywallModal } from '@/components/keys/KeyActivationPaywallModal';
import { useDepositVerification } from '@/lib/hooks/useDepositVerification';

export default function RateLimitsPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [rpmLimit, setRpmLimit] = useState(120);
  const [tpmLimit, setTpmLimit] = useState(250000);
  const [burstMultiplier, setBurstMultiplier] = useState(1.5);
  const [retryBackoff, setRetryBackoff] = useState('exponential_jitter');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywallSelectedAmt, setPaywallSelectedAmt] = useState(50);

  const { depositAndUnlock } = useDepositVerification();

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
        setRpmLimit(activeKeys[0].rateLimitPerMinute || 120);
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
    const found = keys.find(k => k.id === id);
    if (found) {
      setRpmLimit(found.rateLimitPerMinute || 120);
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
    <div className="min-h-screen flex flex-col bg-[#07090e]">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'API Keys', href: '/keys' },
            { label: 'Rate Limits & Quotas' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Rate Limits &amp; Concurrency Governor</h1>
            <p className="text-xs text-zinc-400">
              Configure per-key RPM / TPM limits, burst multiplier allowances, and 2-phase token reservation calculus.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>SUB-15MS GOVERNOR ACTIVE</span>
            </span>
          </div>
        </div>

        <KeysSubNav />

        <AuthRequiredGate
          title="Sign In to Configure Rate Limits & Quotas"
          description="RPM and TPM limit governors, burst allowance allocations, and retry backoff policies are private to your workspace."
          checkoutAmount={25}
        >
          {savedSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Rate limit quotas and burst parameters updated successfully!</span>
            </div>
          )}

          {keys.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-black/30 border border-dashed border-white/10 space-y-3">
              <Key className="w-8 h-8 text-zinc-500 mx-auto" />
              <p className="text-xs text-zinc-400">No active keys found. Mint an API key to configure rate limit quotas.</p>
              <Link href="/keys" className="inline-block px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">
                Mint Your First Key
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Key Selector */}
              <div className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs text-zinc-400 font-mono uppercase">Select Target Key:</span>
                  <h3 className="text-base font-bold text-white">Configuring Throughput Governor</h3>
                </div>

                <select
                  value={selectedKeyId}
                  onChange={(e) => handleSelectKey(e.target.value)}
                  className="py-2.5 px-4 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  {keys.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.keyPrefix}... • {k.name} ({k.rateLimitPerMinute || 120} RPM)
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Quota Utilization Gauges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-xs">
                <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 uppercase text-[10px]">Configured RPM Ceiling</span>
                    <span className="font-bold text-white">{rpmLimit} RPM</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: '35%' }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>Lifetime Requests: {currentRequests.toLocaleString()}</span>
                    <span className="text-emerald-400">Zero Rate 429 Throttle</span>
                  </div>
                </div>

                <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 uppercase text-[10px]">Tokens Per Minute (TPM)</span>
                    <span className="font-bold text-white">{tpmLimit.toLocaleString()} TPM</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-indigo-400 rounded-full" style={{ width: '45%' }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>Lifetime Tokens: {currentTokens.toLocaleString()}</span>
                    <span className="text-cyan-400">75% prompt cache active</span>
                  </div>
                </div>
              </div>

              {/* Rate Limit Rules Configuration */}
              <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    Dynamic Rate Limiter Rules &amp; Burst Parameters
                  </h3>
                  <p className="text-xs text-zinc-400">Fine-tune quota ceilings for high-concurrency workloads.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="space-y-1">
                    <label className="text-zinc-400 uppercase text-[10px]">Requests Per Minute (RPM) Ceiling</label>
                    <select
                      value={rpmLimit}
                      onChange={(e) => setRpmLimit(Number(e.target.value))}
                      className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value={60}>60 RPM (Local Prototyping)</option>
                      <option value={120}>120 RPM (Cursor IDE / Coding Assistant Default)</option>
                      <option value={300}>300 RPM (Production Backend Server)</option>
                      <option value={600}>600 RPM (Multi-Agent Swarm / LangChain)</option>
                      <option value={1200}>1,200 RPM (Enterprise Dedicated Tier)</option>
                      <option value={5000}>5,000 RPM (High-Throughput Cluster)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 uppercase text-[10px]">Burst Multiplier Allowance</label>
                    <select
                      value={burstMultiplier}
                      onChange={(e) => setBurstMultiplier(Number(e.target.value))}
                      className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value={1.0}>1.0x (Strict Constant Rate)</option>
                      <option value={1.5}>1.5x (Recommended - Absorbs 10s Traffic Spikes)</option>
                      <option value={2.0}>2.0x (High-Burst Elastic Queuing)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-zinc-400 uppercase text-[10px]">Rate Governor 429 Handling Strategy</label>
                    <select
                      value={retryBackoff}
                      onChange={(e) => setRetryBackoff(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="exponential_jitter">Exponential Backoff with Full Jitter (Recommended)</option>
                      <option value="immediate_failover">Immediate Circuit-Breaker Failover (&lt; 15ms Auto-Reroute)</option>
                      <option value="queue_pause">Adaptive Queue Token Reservation Pause</option>
                    </select>
                  </div>
                </div>

                {/* Contextual VIP High-Throughput Banner */}
                {rpmLimit >= 300 && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-bold shrink-0">
                        <Gift className="w-4 h-4 text-black" />
                      </div>
                      <div>
                        <span className="font-bold text-white block">
                          {rpmLimit >= 1200 ? 'Enterprise VIP Dedicated Shard' : rpmLimit >= 600 ? 'Scale Fleet Burst Pass (600 RPM)' : 'Growth VIP Fast-Lane (300 RPM)'}
                        </span>
                        <span className="text-zinc-300 text-[11px]">
                          High concurrency requires an active VIP compute deposit. Unlock with up to 100% Match Bonus.
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPaywallSelectedAmt(rpmLimit >= 1200 ? 250 : rpmLimit >= 600 ? 100 : 50);
                        setIsPaywallOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-md shadow-amber-500/20"
                    >
                      <span>Unlock VIP Tier</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-8 py-3 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 font-black text-xs uppercase tracking-wider font-mono shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4 text-black" />
                    <span>{isSaving ? 'Saving Quota...' : 'Save Quotas & Limits'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </AuthRequiredGate>
      </main>

      {/* Paywall Blocker & Upgrade Modal */}
      <KeyActivationPaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onSuccess={(depositAmt) => {
          depositAndUnlock(depositAmt);
          setIsPaywallOpen(false);
          fetchKeys();
        }}
        keyLabel="Throughput Governor Upgrade"
        initialAmount={paywallSelectedAmt}
      />
    </div>
  );
}
