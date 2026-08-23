'use client';

import React from 'react';
import { Layers, Activity, Cpu, ShieldCheck, RefreshCw, Zap, Rocket } from 'lucide-react';
import type { PoolStats, GalxRotationStrategy } from '@/core/contracts/GalxContracts';
import { formatNumber } from '@/lib/utils';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

interface PoolMetricsOverviewProps {
  stats: PoolStats | null;
  onStrategyChange: (strategy: GalxRotationStrategy) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

function BasePoolMetricsOverview({
  stats,
  onStrategyChange,
  onRefresh,
  isLoading
}: PoolMetricsOverviewProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 rounded-2xl glass-card border border-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Telemetry Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Shards & Health */}
        <div className="glass-card rounded-2xl p-5 border border-indigo-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Quota Shards</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{stats.totalShards}</span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {stats.healthyShards} Healthy
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 flex items-center justify-between pt-2 border-t border-white/5">
            <span>Pooled: {stats.totalPooledShards}</span>
            <span>Private: {stats.totalPrivateShards}</span>
            <span className="text-amber-400">Cool: {stats.cooldownShards}</span>
          </div>
        </div>

        {/* Card 2: In-Flight & Active Leases */}
        <div className="glass-card rounded-2xl p-5 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Active Leases</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-cyan-300 font-mono">{stats.activeLeasesCount}</span>
            <span className="text-xs text-zinc-400">in-flight</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 flex items-center justify-between pt-2 border-t border-white/5">
            <span>Latency: &lt; 25ms</span>
            <span className="text-cyan-400 font-mono">0% Quota Leakage</span>
          </div>
        </div>

        {/* Card 3: Token Replenish Velocity */}
        <div className="glass-card rounded-2xl p-5 border border-amber-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Token Velocity</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-300 font-mono">
              {formatNumber(stats.tokensPerMinuteThroughput || 0)}
            </span>
            <span className="text-xs text-zinc-400">tok/min</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 flex items-center justify-between pt-2 border-t border-white/5">
            <span>Total: {formatNumber(stats.totalTokensServedLifetime || stats.totalTokensConsumed || 0)} tok</span>
            <span>Reqs: {formatNumber(stats.totalRequestsServedLifetime || stats.totalRequestsServed || 0)}</span>
          </div>
        </div>

        {/* Card 4: Provider Balance */}
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Provider Matrix</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-amber-300">
                <Zap className="w-3.5 h-3.5 fill-amber-400" /> OpenAI
              </span>
              <span className="font-mono text-zinc-200">
                {stats.providerBreakdown?.openai.healthy || 0}/{stats.providerBreakdown?.openai.total || 0} online
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Rocket className="w-3.5 h-3.5 text-emerald-400" /> xAI Grok
              </span>
              <span className="font-mono text-zinc-200">
                {stats.providerBreakdown?.['xai-grok'].healthy || 0}/{stats.providerBreakdown?.['xai-grok'].total || 0} online
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rotation Strategy & Quick Controls Bar */}
      <div className="glass-panel rounded-2xl p-3.5 px-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase text-zinc-400">Quota Cycling:</span>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/5 text-xs">
            <button
              onClick={() => onStrategyChange('adaptive_headroom')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                stats.rotationStrategy === 'adaptive_headroom'
                  ? 'bg-amber-600/40 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ⚡ Adaptive Headroom (Apex)
            </button>
            <button
              onClick={() => onStrategyChange('smooth_weighted_round_robin')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                stats.rotationStrategy === 'smooth_weighted_round_robin'
                  ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Smooth WRR
            </button>
            <button
              onClick={() => onStrategyChange('least_utilized')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                stats.rotationStrategy === 'least_utilized'
                  ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Least Utilized
            </button>
            <button
              onClick={() => onStrategyChange('priority_failover')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                stats.rotationStrategy === 'priority_failover'
                  ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Priority Spillover
            </button>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Sync Telemetry
        </button>
      </div>
    </div>
  );
}

export const PoolMetricsOverview = withErrorBoundary(BasePoolMetricsOverview, {
  name: 'Pool Metrics Overview'
});
