'use client';

import React from 'react';
import Link from 'next/link';
import {
  Shield,
  Zap,
  Rocket,
  Trash2,
  Lock,
  Users,
  Power,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  ArrowRight
} from 'lucide-react';
import { formatNumber, formatTimeAgo } from '@/lib/utils';
import type { GalxShardAccount } from '@/core/contracts/GalxContracts';

interface ShardVaultManagerProps {
  shards: GalxShardAccount[];
  onToggleMode: (id: string, currentMode: 'pooled' | 'private') => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onRetract: (id: string, userId: string) => void;
  onDelete: (id: string) => void;
}

export function ShardVaultManager({
  shards,
  onToggleMode,
  onToggleStatus,
  onRetract,
  onDelete,
}: ShardVaultManagerProps) {
  return (
    <div className="glass-panel rounded-3xl p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            Active Route Pipelines
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Enterprise gateway routing pipelines with automated failover and rate-limit buffering.
          </p>
        </div>
      </div>

      {/* Shards Table */}
      {shards.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-black/30 border border-dashed border-white/10 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-300">Default Enterprise Routes Active</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Your requests are automatically routed across high-availability enterprise gateway pipelines with zero data retention.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/20">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Provider / Label</th>
                <th className="py-3 px-4">Masked Credential</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Token Bucket Capacity</th>
                <th className="py-3 px-4">Requests Served</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {shards.map((shard) => {
                const tokenPercent = Math.min(
                  100,
                  Math.round(((shard.tokenBucket?.remainingTokens || 0) / (shard.tokenBucket?.maxTokens || 1)) * 100)
                );

                return (
                  <tr key={shard.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Provider & Label */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${shard.provider === 'xai-grok'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                          }`}>
                          {shard.provider === 'xai-grok' ? <Rocket className="w-4 h-4" /> : <Zap className="w-4 h-4 fill-amber-400" />}
                        </div>
                        <div>
                          <Link href={`/vault/shards/${shard.id}`} className="font-bold text-white hover:text-cyan-300 transition-colors">
                            {shard.accountLabel}
                          </Link>
                          <div className="text-[10px] text-zinc-500 font-mono">{shard.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Masked Key */}
                    <td className="py-3.5 px-4 font-mono text-zinc-400">
                      <code>{shard.apiKeyMasked}</code>
                    </td>

                    {/* Mode Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => onToggleMode(shard.id, shard.shardMode || 'pooled')}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${shard.shardMode === 'private'
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                          }`}
                        title="Click to toggle between Pooled and Dedicated Private"
                      >
                        {shard.shardMode === 'private' ? (
                          <>
                            <Lock className="w-3 h-3 text-indigo-400" /> Private
                          </>
                        ) : (
                          <>
                            <Users className="w-3 h-3 text-cyan-400" /> Pooled
                          </>
                        )}
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 w-max border ${shard.status === 'healthy'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : shard.status === 'cooldown'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${shard.status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'
                          }`} />
                        {shard.status}
                      </span>
                    </td>

                    {/* Token Bucket Gauge */}
                    <td className="py-3.5 px-4 min-w-[160px]">
                      <div className="space-y-1 font-mono text-[10px]">
                        <div className="flex justify-between text-zinc-400">
                          <span>{formatNumber(shard.tokenBucket?.remainingTokens || 0)} tok</span>
                          <span>{tokenPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${tokenPercent < 20
                                ? 'bg-rose-500'
                                : tokenPercent < 50
                                  ? 'bg-amber-500'
                                  : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                              }`}
                            style={{ width: `${tokenPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Requests Served */}
                    <td className="py-3.5 px-4 font-mono text-zinc-300">
                      {shard.stats?.totalRequestsServed || 0} req
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/vault/shards/${shard.id}`}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                          title="View Account Details"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => onRetract(shard.id, shard.userId)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold transition-all cursor-pointer"
                          title="1-Click Disconnect (< 40ms lease purge)"
                        >
                          Retract
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
