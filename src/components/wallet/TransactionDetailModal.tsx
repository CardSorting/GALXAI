'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Zap,
  Clock,
  Key,
  Layers,
  TrendingDown,
  Cpu,
  Copy,
  Check,
  Coins,
  CheckCircle2,
  FileCode,
  Sparkles
} from 'lucide-react';

import { withErrorBoundary } from '@/components/common/ErrorBoundary';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

export interface TransactionDetail {
  id: string;
  type: 'deposit' | 'usage' | 'grant' | 'refund';
  description: string;
  amountUsd: number;
  balanceAfterUsd: number;
  model?: string;
  modelName?: string;
  promptTokens?: number;
  completionTokens?: number;
  cachedTokens?: number;
  totalTokens?: number;
  savingsUsd?: number;
  retailEquivalentUsd?: number;
  latencyMs?: number;
  keyPrefix?: string;
  keyName?: string;
  zdrDigest?: string;
  status: 'settled' | 'pending' | 'failed';
  timestamp: string;
}

interface TransactionDetailModalProps {
  transaction: TransactionDetail | null;
  onClose: () => void;
}

function BaseTransactionDetailModal({ transaction, onClose }: TransactionDetailModalProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!transaction) return null;

  const isUsage = transaction.type === 'usage';
  const promptTokens = transaction.promptTokens || 0;
  const cachedTokens = transaction.cachedTokens || 0;
  const nonCachedPrompt = Math.max(0, promptTokens - cachedTokens);
  const completionTokens = transaction.completionTokens || 0;
  const totalTokens = transaction.totalTokens || (promptTokens + completionTokens);

  const handleCopyHash = async () => {
    if (transaction.zdrDigest) {
      const success = await safeCopyToClipboard(transaction.zdrDigest);
      if (success) {
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 2000);
      }
    }
  };

  const handleCopyJson = async () => {
    const success = await safeCopyToClipboard(JSON.stringify(transaction, null, 2));
    if (success) {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto font-mono">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  transaction.type === 'deposit'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : transaction.type === 'grant'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                }`}
              >
                {transaction.type}
              </span>
              <span className="text-xs text-zinc-400">{transaction.id}</span>
            </div>
            <h2 className="text-lg font-bold text-white font-sans">{transaction.description}</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Amount Card */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-black/40 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] text-zinc-400 uppercase font-sans font-semibold">Net Incurred Cost</span>
            <div className="text-2xl sm:text-3xl font-black text-white flex items-baseline gap-2">
              <span className={transaction.amountUsd < 0 ? 'text-zinc-100' : 'text-emerald-400'}>
                {transaction.amountUsd < 0 ? '-' : '+'}${Math.abs(transaction.amountUsd).toFixed(6)}
              </span>
              <span className="text-xs text-zinc-400 font-sans">USD</span>
            </div>
          </div>

          {transaction.savingsUsd !== undefined && transaction.savingsUsd > 0 && (
            <div className="text-right space-y-0.5">
              <span className="text-[11px] text-emerald-400 uppercase font-sans font-semibold flex items-center justify-end gap-1">
                <TrendingDown className="w-3 h-3" />
                Wholesale Arbitrage Saved
              </span>
              <div className="text-lg sm:text-xl font-bold text-emerald-300 font-mono">
                -${transaction.savingsUsd.toFixed(6)}
              </div>
              {transaction.retailEquivalentUsd && (
                <div className="text-[10px] text-zinc-500 line-through">
                  Retail List: ${transaction.retailEquivalentUsd.toFixed(6)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Token Modality Breakdown Grid (For API usage) */}
        {isUsage && (
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-bold text-zinc-400 font-sans tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Granular Token Modality Breakdown
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase">Input / Prompt</span>
                <div className="font-bold text-white text-sm">{nonCachedPrompt.toLocaleString()}</div>
                <div className="text-[10px] text-zinc-500">Uncached tokens</div>
              </div>

              <div className="p-3 rounded-2xl bg-black/50 border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                <span className="text-[10px] text-emerald-400 uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Cached Read
                </span>
                <div className="font-bold text-emerald-300 text-sm">{cachedTokens.toLocaleString()}</div>
                <div className="text-[10px] text-emerald-400/80">75% discount applied</div>
              </div>

              <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase">Output / Reasoning</span>
                <div className="font-bold text-white text-sm">{completionTokens.toLocaleString()}</div>
                <div className="text-[10px] text-zinc-500">Generated tokens</div>
              </div>

              <div className="p-3 rounded-2xl bg-black/50 border border-cyan-500/20 bg-cyan-500/5 space-y-1">
                <span className="text-[10px] text-cyan-400 uppercase">Total Tokens</span>
                <div className="font-bold text-cyan-300 text-sm">{totalTokens.toLocaleString()}</div>
                <div className="text-[10px] text-zinc-500">Combined stream</div>
              </div>
            </div>
          </div>
        )}

        {/* Execution Metadata Table */}
        <div className="space-y-2">
          <h3 className="text-xs uppercase font-bold text-zinc-400 font-sans tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Execution Ledger Metadata
          </h3>

          <div className="rounded-2xl bg-black/40 border border-white/10 divide-y divide-white/5 text-xs">
            {transaction.modelName && (
              <div className="p-3 flex items-center justify-between">
                <span className="text-zinc-400">Target Model</span>
                <span className="text-white font-bold">{transaction.modelName}</span>
              </div>
            )}
            {transaction.keyName && (
              <div className="p-3 flex items-center justify-between">
                <span className="text-zinc-400">API Key Source</span>
                <div className="flex items-center gap-2">
                  <span className="text-white">{transaction.keyName}</span>
                  {transaction.keyPrefix && (
                    <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-400 text-[10px]">
                      {transaction.keyPrefix}
                    </span>
                  )}
                </div>
              </div>
            )}
            {transaction.latencyMs !== undefined && (
              <div className="p-3 flex items-center justify-between">
                <span className="text-zinc-400">Gateway Latency</span>
                <span className="text-cyan-300 font-bold">{transaction.latencyMs} ms</span>
              </div>
            )}
            <div className="p-3 flex items-center justify-between">
              <span className="text-zinc-400">Settled Balance After</span>
              <span className="text-zinc-200 font-bold">${transaction.balanceAfterUsd.toFixed(6)} USD</span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-zinc-400">Ledger Status</span>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="capitalize">{transaction.status}</span>
              </div>
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-zinc-400">Timestamp</span>
              <span className="text-zinc-300">{transaction.timestamp}</span>
            </div>
          </div>
        </div>

        {/* Cryptographic Zero-Data-Retention (ZDR) Proof */}
        {transaction.zdrDigest && (
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero-Data-Retention SHA-256 Attestation
              </span>
              <button
                onClick={handleCopyHash}
                className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
              </button>
            </div>
            <div className="text-[11px] text-zinc-400 break-all bg-black/60 p-2.5 rounded-xl border border-white/5">
              {transaction.zdrDigest}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <button
            onClick={handleCopyJson}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center gap-2 border border-white/10 transition-all cursor-pointer"
          >
            {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileCode className="w-3.5 h-3.5" />}
            <span>{copiedJson ? 'Copied Full JSON' : 'Export JSON Record'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold font-sans transition-all cursor-pointer"
          >
            Close Detail
          </button>
        </div>
      </div>
    </div>
  );
}

export const TransactionDetailModal = withErrorBoundary(BaseTransactionDetailModal, {
  name: 'Transaction Detail Modal',
  fallback: null
});
