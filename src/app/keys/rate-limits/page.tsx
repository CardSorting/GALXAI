'use client';

import React, { useState } from 'react';
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
  Flame
} from 'lucide-react';

export default function RateLimitsPage() {
  const [selectedKey, setSelectedKey] = useState('galx_live_d819');
  const [rpmLimit, setRpmLimit] = useState(120);
  const [tpmLimit, setTpmLimit] = useState(250000);
  const [burstMultiplier, setBurstMultiplier] = useState(1.5);
  const [retryBackoff, setRetryBackoff] = useState('exponential_jitter');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col">
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
            <h1 className="text-2xl sm:text-3xl font-black text-white">Rate Limits & Concurrency Governor</h1>
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

        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Rate limit quotas and burst parameters updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Key Selector */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs text-zinc-400 font-mono uppercase">Select Target Key:</span>
              <h3 className="text-base font-bold text-white">Configuring Throughput Governor</h3>
            </div>

            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="py-2.5 px-4 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
            >
              <option value="galx_live_d819">galx_live_d819 (Cursor IDE Coding Agent)</option>
              <option value="galx_live_p401">galx_live_p401 (Production API Backend)</option>
              <option value="galx_live_lc99">galx_live_lc99 (Agent Swarm / LangChain)</option>
            </select>
          </div>

          {/* Current Quota Utilization Gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-xs">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 uppercase text-[10px]">Requests Per Minute (RPM)</span>
                <span className="font-bold text-white">38 / {rpmLimit} RPM</span>
              </div>
              <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(38 / rpmLimit) * 100}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>Utilization: {((38 / rpmLimit) * 100).toFixed(1)}%</span>
                <span className="text-emerald-400">Headroom: {rpmLimit - 38} RPM available</span>
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 uppercase text-[10px]">Tokens Per Minute (TPM)</span>
                <span className="font-bold text-white">48,200 / {tpmLimit.toLocaleString()} TPM</span>
              </div>
              <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${(48200 / tpmLimit) * 100}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>Utilization: {((48200 / tpmLimit) * 100).toFixed(1)}%</span>
                <span className="text-cyan-400">75% prompt cache discount active</span>
              </div>
            </div>
          </div>

          {/* Rate Limit Rules Configuration */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                Dynamic Rate Limiter Rules & Burst Parameters
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
                  <option value="exponential_jitter">Exponential Backoff with Full Jitter (P-AHT Recommended)</option>
                  <option value="immediate_failover">Immediate Circuit-Breaker Failover (&lt; 15ms Auto-Reroute)</option>
                  <option value="queue_pause">Adaptive Queue Token Reservation Pause</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button
                type="submit"
                className="px-8 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider font-mono shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                Save Quotas & Limits
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
