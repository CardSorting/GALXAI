'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sliders,
  ShieldAlert,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Flame,
  Check,
  Shield,
  Activity,
  ArrowRight,
  Power
} from 'lucide-react';
import { useOrganizationStore } from '@/lib/storage/organizationStore';
import { ThrottleMode } from '@/lib/data/organizationData';

export function SpendLimitsClient() {
  const {
    org,
    members,
    updateMemberSpendCap,
    toggleEmergencyFreeze
  } = useOrganizationStore();

  const [savedStatus, setSavedStatus] = useState(false);

  const totalCurrentSpend = members.reduce((acc, m) => acc + m.monthlySpendUsd, 0);
  const totalAllocatedCap = members.reduce((acc, m) => acc + m.monthlySpendCapUsd, 0);
  const emergencyFreeze = org.spendSafetyPolicy.emergencyFreezeActive;

  const handleCapChange = (id: string, newCap: number) => {
    updateMemberSpendCap(id, newCap);
  };

  const handleModeChange = (id: string, mode: ThrottleMode) => {
    const member = members.find(m => m.id === id);
    if (member) {
      updateMemberSpendCap(id, member.monthlySpendCapUsd, mode);
    }
  };

  const handleSaveAll = () => {
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden bg-gradient-to-r from-emerald-500/5 via-black/40 to-amber-500/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>Deterministic Spend Safeguards</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Member Spend Caps &amp; Safety Auto-Throttles
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl font-sans">
              Eliminate unexpected cloud inference bills. Assign individual monthly compute allowances to each engineer and configure instant hard freeze kill-switches.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={handleSaveAll}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-black font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              {savedStatus ? <Check className="w-4 h-4 text-black" /> : <Shield className="w-4 h-4 text-black" />}
              <span>{savedStatus ? 'Saved Policies!' : 'Save Spend Policies'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
          <span className="text-[11px] text-zinc-400 uppercase font-sans font-semibold">Total Monthly Incurred</span>
          <div className="text-2xl font-black text-white">${totalCurrentSpend.toFixed(2)} USD</div>
          <div className="text-[11px] text-zinc-400 font-sans">{members.length} active developer seats</div>
        </div>

        <div className="glass-panel p-5 rounded-3xl space-y-1 border border-amber-500/30 bg-amber-500/5">
          <span className="text-[11px] text-amber-400 uppercase font-sans font-semibold">Sum of Member Caps</span>
          <div className="text-2xl font-black text-amber-300">${totalAllocatedCap.toLocaleString()} / mo</div>
          <div className="text-[11px] text-amber-400 font-sans">
            {totalAllocatedCap > 0 ? ((totalCurrentSpend / totalAllocatedCap) * 100).toFixed(1) : '0.0'}% cap utilization
          </div>
        </div>

        <div className={`glass-panel p-5 rounded-3xl space-y-1 border ${emergencyFreeze ? 'border-rose-500 bg-rose-500/10' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] uppercase font-sans font-semibold ${emergencyFreeze ? 'text-rose-400' : 'text-emerald-400'}`}>
              Emergency Kill Switch
            </span>
            <Power className={`w-4 h-4 ${emergencyFreeze ? 'text-rose-400' : 'text-emerald-400'}`} />
          </div>
          <div className={`text-xl font-black ${emergencyFreeze ? 'text-rose-400' : 'text-emerald-300'}`}>
            {emergencyFreeze ? 'INFERENCE FROZEN' : 'Active & Normal'}
          </div>
          <button
            onClick={() => toggleEmergencyFreeze(!emergencyFreeze)}
            className="text-[10px] underline font-bold cursor-pointer pt-1"
          >
            {emergencyFreeze ? 'Resume inference for all keys' : 'Emergency freeze all workspace keys'}
          </button>
        </div>
      </div>

      {/* Member Spend Caps Table */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            Individual Member Monthly Allowances
          </h2>
          <p className="text-xs text-zinc-400">
            Slide each developer&apos;s monthly cap. When reached, <strong>Hard Freeze</strong> immediately blocks inference calls, while <strong>Soft Alert</strong> triggers notifications.
          </p>
        </div>

        <div className="space-y-4 font-mono text-xs">
          {members.map((member) => {
            const utilPct = member.monthlySpendCapUsd > 0
              ? Math.min(100, (member.monthlySpendUsd / member.monthlySpendCapUsd) * 100)
              : 0;

            return (
              <div
                key={member.id}
                className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-4 hover:border-white/15 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span>{member.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono uppercase">
                        {member.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono">{member.email}</div>
                  </div>

                  <div className="flex items-center gap-3 font-mono">
                    <div className="text-right">
                      <div className="text-white font-bold">${member.monthlySpendUsd.toFixed(2)} / ${member.monthlySpendCapUsd}</div>
                      <div className="text-[10px] text-zinc-400">{utilPct.toFixed(1)}% utilized</div>
                    </div>

                    <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
                      <button
                        onClick={() => handleModeChange(member.id, 'hard')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          member.throttleMode === 'hard'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Hard Freeze
                      </button>
                      <button
                        onClick={() => handleModeChange(member.id, 'soft')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          member.throttleMode === 'soft'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Soft Alert
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress bar and Slider */}
                <div className="space-y-2">
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        utilPct > 80 ? 'bg-rose-400' : utilPct > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${utilPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1">
                    <span>Adjust Monthly Allowance Cap:</span>
                    <span className="text-amber-300 font-bold">${member.monthlySpendCapUsd} USD / mo</span>
                  </div>

                  <input
                    type="range"
                    min="25"
                    max="1500"
                    step="25"
                    value={member.monthlySpendCapUsd}
                    onChange={(e) => handleCapChange(member.id, Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Environment-Level Spend Allocations (Production, Staging, Dev) */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Project &amp; Environment Spend Allocations
            </h2>
            <p className="text-xs text-zinc-400">
              Set automated spend caps per environment. Production instances stay active with burst headroom, while Dev/Staging auto-pause on cap breach.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-5 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Production Fleet
              </span>
              <span className="text-emerald-400 font-bold">$2,500 / mo</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: '42%' }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>$1,050.00 spent (42%)</span>
              <span className="text-emerald-300 font-semibold">+15% Burst Headroom</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-black/40 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Staging &amp; CI/CD
              </span>
              <span className="text-amber-400 font-bold">$800 / mo</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: '68%' }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>$544.00 spent (68%)</span>
              <span className="text-amber-300 font-semibold">Auto-Pause on Cap</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-black/40 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Local Dev &amp; Cursor
              </span>
              <span className="text-cyan-400 font-bold">$400 / mo</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full" style={{ width: '22%' }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>$88.00 spent (22%)</span>
              <span className="text-cyan-300 font-semibold">Auto-Pause on Cap</span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Channel Alert Destinations */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Real-Time Multi-Channel Notification Dispatch
          </h2>
          <p className="text-xs text-zinc-400">
            Route spend threshold alerts to Slack, Discord, PagerDuty, or Microsoft Teams with configurable quiet hours.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold">#ai-infra-alerts</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">Slack Active</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">Triggers at 80% and 100% of workspace cap.</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold">PagerDuty High-Sev</span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">Critical Cap Breach</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">Triggers when hard freeze threshold is reached.</p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold">Discord Devs</span>
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">Webhook Enabled</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">Quiet hours active: 22:00 - 06:00 UTC.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
