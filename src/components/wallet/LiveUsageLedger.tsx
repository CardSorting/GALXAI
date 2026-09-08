'use client';

import React, { useState } from 'react';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  TrendingDown,
  Download,
  Check,
  Eye,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  ArrowUpRight,
  Zap,
  Coins
} from 'lucide-react';
import { TransactionDetail, TransactionDetailModal } from './TransactionDetailModal';

const INITIAL_TRANSACTIONS: TransactionDetail[] = [
  {
    id: 'tx_live_8912',
    type: 'usage',
    description: 'API Chat: OpenAI GPT-5.6 Sol',
    amountUsd: -0.007750,
    balanceAfterUsd: 114.590000,
    model: 'gpt-5.6-sol',
    modelName: 'OpenAI GPT-5.6 Sol',
    promptTokens: 1200,
    cachedTokens: 400,
    completionTokens: 320,
    totalTokens: 1520,
    savingsUsd: 0.003250,
    retailEquivalentUsd: 0.011000,
    latencyMs: 164,
    compactionMode: 'raw',
    compactedTokens: 0,
    keyPrefix: 'galx_live_d819',
    keyName: 'Cursor IDE / Coding Assistant',
    zdrDigest: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    status: 'settled',
    timestamp: 'Just now'
  },
  {
    id: 'tx_live_8911',
    type: 'usage',
    description: 'Stream Chat: OpenAI GPT-5.6 Terra',
    amountUsd: -0.003420,
    balanceAfterUsd: 114.597750,
    model: 'gpt-5.6-terra',
    modelName: 'OpenAI GPT-5.6 Terra',
    promptTokens: 850,
    cachedTokens: 300,
    completionTokens: 180,
    totalTokens: 1030,
    compactedTokens: 420,
    compactionMode: 'auto',
    savingsUsd: 0.001480,
    retailEquivalentUsd: 0.004900,
    latencyMs: 128,
    keyPrefix: 'galx_live_p401',
    keyName: 'Production API Backend',
    zdrDigest: 'sha256:9a32c2560ef7a812b77cc48188e1a65dfc2d4b1fa3d677284addd200126d8412',
    status: 'settled',
    timestamp: '4 mins ago'
  },
  {
    id: 'tx_live_8910',
    type: 'usage',
    description: 'API Chat: OpenAI GPT-5.6 Luna (Flash)',
    amountUsd: -0.004820,
    balanceAfterUsd: 114.601170,
    model: 'gpt-5.6-luna',
    modelName: 'OpenAI GPT-5.6 Luna (Flash)',
    promptTokens: 4100,
    cachedTokens: 1800,
    completionTokens: 640,
    totalTokens: 4740,
    compactedTokens: 1650,
    compactionMode: 'auto',
    savingsUsd: 0.002760,
    retailEquivalentUsd: 0.007580,
    latencyMs: 142,
    keyPrefix: 'galx_live_lc99',
    keyName: 'Agent Swarm / LangChain Fleet',
    zdrDigest: 'sha256:8b41f1789aa1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d7190',
    status: 'settled',
    timestamp: '18 mins ago'
  },
  {
    id: 'tx_topup_100',
    type: 'deposit',
    description: 'Developer Compute Deposit (+50% Match Grant Applied)',
    amountUsd: 150.00,
    balanceAfterUsd: 114.612410,
    savingsUsd: 50.00,
    retailEquivalentUsd: 150.00,
    keyPrefix: undefined,
    keyName: 'Card •••• 4242',
    zdrDigest: 'dep:stripe_ch_98124b8912aa',
    status: 'settled',
    timestamp: '2 hours ago'
  },
  {
    id: 'tx_usage_batch',
    type: 'usage',
    description: 'Batch Code Review: OpenAI GPT-5.6 Sol',
    amountUsd: -0.159400,
    balanceAfterUsd: -35.387590,
    model: 'gpt-5.6-sol',
    modelName: 'OpenAI GPT-5.6 Sol',
    promptTokens: 42500,
    cachedTokens: 18000,
    completionTokens: 4800,
    totalTokens: 47300,
    savingsUsd: 0.064200,
    retailEquivalentUsd: 0.223600,
    latencyMs: 340,
    keyPrefix: 'galx_live_d819',
    keyName: 'Cursor IDE / Coding Assistant',
    zdrDigest: 'sha256:4c12bb998a1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d6012',
    status: 'settled',
    timestamp: '3 hours ago'
  },
  {
    id: 'tx_welcome_grant',
    type: 'grant',
    description: 'Welcome Grant ($5.00 Free Starter Compute Credit)',
    amountUsd: 5.00,
    balanceAfterUsd: 5.00,
    savingsUsd: 5.00,
    retailEquivalentUsd: 5.00,
    keyPrefix: undefined,
    keyName: 'Platform Promotion',
    zdrDigest: 'promo:welcome_grant_claim',
    status: 'settled',
    timestamp: 'Yesterday'
  }
];

export function LiveUsageLedger() {
  const [transactions, setTransactions] = useState<TransactionDetail[]>(INITIAL_TRANSACTIONS);
  const [filterType, setFilterType] = useState<'all' | 'usage' | 'deposit' | 'grant'>('all');
  const [compactionFilter, setCompactionFilter] = useState<'all' | 'compacted' | 'raw'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      const simulatedNewTx: TransactionDetail = {
        id: `tx_live_${Math.random().toString(36).substring(2, 7)}`,
        type: 'usage',
        description: 'API Chat: OpenAI GPT-5.6 Sol',
        amountUsd: -0.004280,
        balanceAfterUsd: 114.585720,
        model: 'gpt-5.6-sol',
        modelName: 'OpenAI GPT-5.6 Sol',
        promptTokens: 820,
        cachedTokens: 310,
        completionTokens: 190,
        totalTokens: 1010,
        savingsUsd: 0.001820,
        retailEquivalentUsd: 0.006100,
        latencyMs: 142,
        keyPrefix: 'galx_live_d819',
        keyName: 'Cursor IDE / Coding Assistant',
        zdrDigest: `sha256:${Math.random().toString(36).substring(2, 12)}4c12bb998a1fc53b92dc18148a1d65df`,
        status: 'settled',
        timestamp: 'Just now'
      };
      setTransactions([simulatedNewTx, ...transactions]);
    }, 400);
  };

  const handleExportCsv = () => {
    const csvRows = [
      ['ID', 'Type', 'Description', 'Model', 'Prompt Tokens', 'Cached Tokens', 'Completion Tokens', 'Amount USD', 'Saved USD', 'Timestamp'].join(','),
      ...transactions.map(t => [
        t.id,
        t.type,
        `"${t.description.replace(/"/g, '""')}"`,
        t.model || '',
        t.promptTokens || 0,
        t.cachedTokens || 0,
        t.completionTokens || 0,
        t.amountUsd.toFixed(6),
        (t.savingsUsd || 0).toFixed(6),
        `"${t.timestamp}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `galxai_live_ledger_${Date.now()}.csv`;
    a.click();
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (compactionFilter === 'compacted' && t.compactionMode !== 'auto') return false;
    if (compactionFilter === 'raw' && t.compactionMode !== 'raw') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.description.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.modelName && t.modelName.toLowerCase().includes(q)) ||
        (t.keyName && t.keyName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 font-mono">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, model, API key, or action..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-black/60 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-400/60 transition-all font-sans"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Type Filter Pills */}
          <div className="flex items-center p-1 rounded-2xl bg-black/60 border border-white/10 text-xs">
            {(['all', 'usage', 'deposit', 'grant'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-xl capitalize transition-all cursor-pointer font-bold ${
                  filterType === type
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-500/15'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {type === 'all' ? 'All Ledger' : type === 'usage' ? 'API Draws' : type === 'deposit' ? 'Deposits' : 'Grants'}
              </button>
            ))}
          </div>

          {/* Compaction Filter Pills */}
          <div className="flex items-center p-1 rounded-2xl bg-black/60 border border-white/10 text-xs">
            <button
              onClick={() => setCompactionFilter('all')}
              className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold ${
                compactionFilter === 'all'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCompactionFilter('compacted')}
              className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold ${
                compactionFilter === 'compacted'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ⚡ Compacted
            </button>
            <button
              onClick={() => setCompactionFilter('raw')}
              className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold ${
                compactionFilter === 'raw'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              📝 Raw Mode
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Live Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-all cursor-pointer"
          >
            {copiedExport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedExport ? 'Exported' : 'CSV'}</span>
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-3xl border border-white/10 bg-black/40 overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left divide-y divide-white/5">
            <thead className="bg-white/[0.02] text-zinc-400 uppercase text-[10px] font-sans font-semibold tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Activity &amp; Model</th>
                <th className="px-5 py-3.5">Policy</th>
                <th className="px-5 py-3.5">Token Breakdown</th>
                <th className="px-5 py-3.5 text-right">Debit / Credit (USD)</th>
                <th className="px-5 py-3.5 text-right">Wholesale Savings</th>
                <th className="px-5 py-3.5 text-right">Balance After</th>
                <th className="px-5 py-3.5 text-center">Inspect</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {filtered.map((tx) => {
                const isUsage = tx.type === 'usage';
                return (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTransaction(tx)}
                    className="hover:bg-white/[0.03] transition-all cursor-pointer group"
                  >
                    {/* Activity Description */}
                    <td className="px-5 py-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            tx.type === 'deposit'
                              ? 'bg-emerald-400'
                              : tx.type === 'grant'
                              ? 'bg-amber-400'
                              : 'bg-cyan-400'
                          }`}
                        />
                        <span className="font-bold text-white font-sans text-sm">{tx.description}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        <span>{tx.timestamp}</span>
                        {tx.keyName && (
                          <>
                            <span>•</span>
                            <span className="text-zinc-400">{tx.keyName}</span>
                          </>
                        )}
                        {tx.latencyMs && (
                          <>
                            <span>•</span>
                            <span className="text-cyan-400/80 font-mono">{tx.latencyMs}ms</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Policy Column */}
                    <td className="px-5 py-4">
                      {isUsage ? (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono ${
                          tx.compactionMode === 'raw'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {tx.compactionMode === 'raw' ? 'RAW' : 'COMPACTED'}
                        </span>
                      ) : (
                        <span className="text-zinc-600 font-mono text-[10px]">—</span>
                      )}
                    </td>

                    {/* Token Breakdown */}
                    <td className="px-5 py-4">
                      {isUsage ? (
                        <div className="space-y-0.5">
                          <div className="text-white font-bold">
                            {(tx.totalTokens || 0).toLocaleString()} tokens
                          </div>
                          <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                            <span>In: {((tx.promptTokens || 0) - (tx.cachedTokens || 0)).toLocaleString()}</span>
                            {tx.cachedTokens !== undefined && tx.cachedTokens > 0 && (
                              <span className="text-emerald-400 font-bold">
                                • Cached: {tx.cachedTokens.toLocaleString()}
                              </span>
                            )}
                            <span>• Out: {(tx.completionTokens || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>

                    {/* Debit / Credit Amount */}
                    <td className="px-5 py-4 text-right">
                      <div
                        className={`text-sm font-black ${
                          tx.amountUsd < 0 ? 'text-zinc-100' : 'text-emerald-400'
                        }`}
                      >
                        {tx.amountUsd < 0 ? '-' : '+'}${Math.abs(tx.amountUsd).toFixed(6)}
                      </div>
                    </td>

                    {/* Wholesale Savings */}
                    <td className="px-5 py-4 text-right">
                      {tx.savingsUsd && tx.savingsUsd > 0 ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20 text-[11px]">
                          <TrendingDown className="w-3 h-3 text-emerald-400" />
                          <span>-${tx.savingsUsd.toFixed(6)}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Balance After */}
                    <td className="px-5 py-4 text-right text-zinc-300 font-bold">
                      ${tx.balanceAfterUsd.toFixed(6)}
                    </td>

                    {/* Inspect Button */}
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTransaction(tx);
                        }}
                        className="p-1.5 rounded-xl bg-white/5 group-hover:bg-white/15 text-zinc-400 group-hover:text-white transition-all cursor-pointer"
                        title="Inspect Sub-Cent Audit Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-zinc-500 space-y-1">
                    <p className="font-bold text-white">No transactions found</p>
                    <p className="text-xs">Try adjusting your filter or search query.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}
