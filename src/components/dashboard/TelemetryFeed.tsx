'use client';

import React from 'react';
import { Radio, RefreshCw, Shield, Zap, AlertTriangle, Key } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';
import { useResilientQuery } from '@/lib/resilience/useResilientQuery';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

interface TelemetryResponse {
  logs: any[];
}

function BaseTelemetryFeed() {
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    isStale
  } = useResilientQuery<TelemetryResponse>('/api/pool/telemetry', {
    refetchIntervalMs: 5000,
    enableCacheFallback: true,
    initialData: { logs: [] }
  });

  const logs = data?.logs || [];

  return (
    <div className="glass-panel rounded-3xl p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              Live Pool Telemetry & Immutable Audit Trail
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30">
              {logs.length} Events
            </span>
            {isStale && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                Cached State
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time audit log of lease allocations, token replenishments, circuit breaker trips, and 1-click retractions.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          title="Refresh Feed"
          aria-label="Refresh Telemetry Feed"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading || isRefetching ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-black/30 border border-dashed border-white/10 space-y-2">
          <Radio className="w-8 h-8 text-zinc-500 mx-auto" />
          <p className="text-xs text-zinc-400">Waiting for pool activity and lease events...</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
          {logs.map((log) => {
            const isRetract = log.action === 'PERMISSION_RETRACTED';
            const isShardReg = log.action === 'SHARD_REGISTERED';
            const isKeyCreated = log.action === 'GATEWAY_KEY_CREATED';

            return (
              <div
                key={log.id || `${log.timestampMs}-${Math.random()}`}
                className="p-3.5 rounded-2xl bg-black/30 border border-white/5 hover:border-white/10 transition-colors flex items-start justify-between gap-4 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isRetract
                      ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                      : isShardReg
                      ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'
                      : isKeyCreated
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                      : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  }`}>
                    {isRetract ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : isShardReg ? (
                      <Shield className="w-3.5 h-3.5" />
                    ) : isKeyCreated ? (
                      <Key className="w-3.5 h-3.5" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{log.action}</span>
                      {log.shardId && (
                        <span className="text-[10px] text-zinc-500 font-mono font-normal">
                          [{log.shardId}]
                        </span>
                      )}
                    </div>
                    <pre className="text-[10px] text-zinc-400 font-mono max-w-lg overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 0)}
                    </pre>
                  </div>
                </div>

                <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                  {formatTimeAgo(log.timestampMs)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const TelemetryFeed = withErrorBoundary(BaseTelemetryFeed, {
  name: 'Telemetry Feed Monitor'
});
