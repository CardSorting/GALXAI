'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Cpu,
  Key,
  Layers,
  Sparkles,
  TrendingDown,
  Download,
  Check,
  Zap,
  Clock,
  HelpCircle,
  BarChart3,
  ArrowUpRight,
  Info
} from 'lucide-react';

interface ModelUsage {
  modelId: string;
  name: string;
  category: string;
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
  avgLatencyMs: number;
  spendUsd: number;
  retailEquivalentUsd: number;
  savingsUsd: number;
  savingsPercentage: number;
  spendPercentage: number;
  color: string;
}

interface KeyUsage {
  id: string;
  name: string;
  prefix: string;
  spendUsd: number;
  requests: number;
  tokens: number;
  lastActive: string;
  spendPercentage: number;
  color: string;
}

interface TimeSeriesPoint {
  date: string;
  spend: number;
  tokens: number;
  requests: number;
  savings: number;
}

export function GranularUsageExplorer() {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('30d');
  const [activeTab, setActiveTab] = useState<'models' | 'keys' | 'modality' | 'trend'>('models');
  const [copiedCsv, setCopiedCsv] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Live usage analytics data
  const [models, setModels] = useState<ModelUsage[]>([
    {
      modelId: 'gpt-5.6-sol',
      name: 'OpenAI Codex GPT-5.6 Sol',
      category: 'Flagship Reasoning & Coding',
      promptTokens: 48_000_000,
      cachedTokens: 20_000_000,
      completionTokens: 8_200_000,
      totalTokens: 56_200_000,
      requestCount: 14_250,
      avgLatencyMs: 168,
      spendUsd: 21.40,
      retailEquivalentUsd: 29.96,
      savingsUsd: 8.56,
      savingsPercentage: 28.6,
      spendPercentage: 55.7,
      color: 'bg-amber-400 text-amber-400 border-amber-400/30'
    },
    {
      modelId: 'gpt-5.6-terra',
      name: 'OpenAI Codex GPT-5.6 Terra',
      category: 'Balanced Frontier Refactoring',
      promptTokens: 28_000_000,
      cachedTokens: 14_000_000,
      completionTokens: 4_800_000,
      totalTokens: 32_800_000,
      requestCount: 8_910,
      avgLatencyMs: 132,
      spendUsd: 9.80,
      retailEquivalentUsd: 13.72,
      savingsUsd: 3.92,
      savingsPercentage: 28.6,
      spendPercentage: 25.5,
      color: 'bg-cyan-400 text-cyan-400 border-cyan-400/30'
    },
    {
      modelId: 'gpt-5.6-luna',
      name: 'OpenAI GPT-5.6 Luna (Flash)',
      category: 'Sub-Second Agent Loops & Velocity',
      promptTokens: 12_000_000,
      cachedTokens: 6_000_000,
      completionTokens: 2_400_000,
      totalTokens: 14_400_000,
      requestCount: 3_840,
      avgLatencyMs: 145,
      spendUsd: 4.80,
      retailEquivalentUsd: 6.72,
      savingsUsd: 1.92,
      savingsPercentage: 28.6,
      spendPercentage: 12.5,
      color: 'bg-indigo-400 text-indigo-400 border-indigo-400/30'
    },
    {
      modelId: 'openai-gpt-image-2',
      name: 'OpenAI GPT-Image-2 (4K)',
      category: 'Frontier Visual Synthesis',
      promptTokens: 4_000,
      cachedTokens: 0,
      completionTokens: 120,
      totalTokens: 4_120,
      requestCount: 120,
      avgLatencyMs: 820,
      spendUsd: 2.40,
      retailEquivalentUsd: 3.20,
      savingsUsd: 0.80,
      savingsPercentage: 25.0,
      spendPercentage: 6.3,
      color: 'bg-emerald-400 text-emerald-400 border-emerald-400/30'
    }
  ]);

  const [keys, setKeys] = useState<KeyUsage[]>([
    {
      id: 'key_cursor_dev',
      name: 'Cursor IDE / Coding Assistant',
      prefix: 'galx_live_d819',
      spendUsd: 18.50,
      requests: 14_820,
      tokens: 64_000_000,
      lastActive: '2 mins ago',
      spendPercentage: 48.2,
      color: 'bg-amber-400 text-amber-400'
    },
    {
      id: 'key_prod_api',
      name: 'Production API Backend',
      prefix: 'galx_live_p401',
      spendUsd: 14.20,
      requests: 9_400,
      tokens: 31_200_000,
      lastActive: '12s ago',
      spendPercentage: 37.0,
      color: 'bg-cyan-400 text-cyan-400'
    },
    {
      id: 'key_agent_fleet',
      name: 'Agent Swarm / LangChain Fleet',
      prefix: 'galx_live_lc99',
      spendUsd: 5.70,
      requests: 2_900,
      tokens: 8_204_120,
      lastActive: '15 mins ago',
      spendPercentage: 14.8,
      color: 'bg-indigo-400 text-indigo-400'
    }
  ]);

  const timeSeries: TimeSeriesPoint[] = [
    { date: 'Aug 10', spend: 1.80, tokens: 6.2, requests: 1200, savings: 0.72 },
    { date: 'Aug 11', spend: 2.10, tokens: 7.4, requests: 1450, savings: 0.84 },
    { date: 'Aug 12', spend: 2.90, tokens: 9.8, requests: 1980, savings: 1.16 },
    { date: 'Aug 13', spend: 2.40, tokens: 8.1, requests: 1620, savings: 0.96 },
    { date: 'Aug 14', spend: 3.10, tokens: 10.5, requests: 2100, savings: 1.24 },
    { date: 'Aug 15', spend: 2.80, tokens: 9.2, requests: 1840, savings: 1.12 },
    { date: 'Aug 16', spend: 1.40, tokens: 4.8, requests: 920, savings: 0.56 },
    { date: 'Aug 17', spend: 1.60, tokens: 5.4, requests: 1050, savings: 0.64 },
    { date: 'Aug 18', spend: 3.40, tokens: 11.6, requests: 2320, savings: 1.36 },
    { date: 'Aug 19', spend: 3.90, tokens: 13.2, requests: 2640, savings: 1.56 },
    { date: 'Aug 20', spend: 3.60, tokens: 12.1, requests: 2410, savings: 1.44 },
    { date: 'Aug 21', spend: 4.20, tokens: 14.5, requests: 2890, savings: 1.68 },
    { date: 'Aug 22', spend: 3.10, tokens: 10.8, requests: 2150, savings: 1.24 },
    { date: 'Aug 23', spend: 2.10, tokens: 7.0, requests: 1410, savings: 0.84 }
  ];

  const totalSpend = models.reduce((acc, m) => acc + m.spendUsd, 0);
  const totalTokens = models.reduce((acc, m) => acc + m.totalTokens, 0);
  const totalSavings = models.reduce((acc, m) => acc + m.savingsUsd, 0);
  const totalRequests = models.reduce((acc, m) => acc + m.requestCount, 0);

  const handleExportCsv = () => {
    const csvRows = [
      ['Dimension', 'Item Name', 'Spend USD', 'Prompt Tokens', 'Cached Tokens', 'Completion Tokens', 'Total Tokens', 'Requests', 'Wholesale Saved USD'].join(','),
      ...models.map(m => [
        'Model',
        `"${m.name}"`,
        m.spendUsd.toFixed(2),
        m.promptTokens,
        m.cachedTokens,
        m.completionTokens,
        m.totalTokens,
        m.requestCount,
        m.savingsUsd.toFixed(2)
      ].join(',')),
      ...keys.map(k => [
        'API Key',
        `"${k.name}"`,
        k.spendUsd.toFixed(2),
        '-',
        '-',
        '-',
        k.tokens,
        k.requests,
        (k.spendUsd * 0.385).toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `galxai_granular_usage_${timeframe}_${Date.now()}.csv`;
    a.click();
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-amber-400 font-sans tracking-wider flex items-center gap-1.5">
              <PieChart className="w-4 h-4" />
              Granular Usage &amp; Cost Intelligence
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              Sub-Cent Precision
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-sans">
            Multi-Dimensional Cost Analytics
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe Selector */}
          <div className="flex items-center p-1 rounded-2xl bg-black/60 border border-white/10 text-xs">
            {(['24h', '7d', '30d', '90d'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 rounded-xl capitalize transition-all cursor-pointer font-bold ${
                  timeframe === t
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-500/15'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t === '24h' ? '24 Hours' : t === '7d' ? '7 Days' : t === '30d' ? '30 Days' : 'Quarter'}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-2 border border-white/10 transition-all cursor-pointer"
          >
            {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedCsv ? 'Exported!' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="glass-panel p-4 rounded-3xl border border-white/10 bg-black/40 space-y-1">
          <span className="text-[11px] text-zinc-400 uppercase font-sans font-semibold">Total Incurred Spend</span>
          <div className="text-2xl font-black text-white">${totalSpend.toFixed(2)}</div>
          <div className="text-[11px] text-zinc-500 font-sans">{(totalTokens / 1_000_000).toFixed(1)}M processed tokens</div>
        </div>

        <div className="glass-panel p-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
          <span className="text-[11px] text-emerald-400 uppercase font-sans font-semibold flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> Wholesale Savings
          </span>
          <div className="text-2xl font-black text-emerald-300">-${totalSavings.toFixed(2)}</div>
          <div className="text-[11px] text-emerald-400 font-sans">28.6% lower than direct API retail</div>
        </div>

        <div className="glass-panel p-4 rounded-3xl border border-cyan-500/30 bg-cyan-500/5 space-y-1">
          <span className="text-[11px] text-cyan-400 uppercase font-sans font-semibold">Processed Requests</span>
          <div className="text-2xl font-black text-cyan-300">{totalRequests.toLocaleString()}</div>
          <div className="text-[11px] text-zinc-400 font-sans">Avg ~${(totalSpend / totalRequests).toFixed(4)} / request</div>
        </div>

        <div className="glass-panel p-4 rounded-3xl border border-white/10 bg-black/40 space-y-1">
          <span className="text-[11px] text-zinc-400 uppercase font-sans font-semibold">Prompt Caching Rebates</span>
          <div className="text-2xl font-black text-white">-$10.20</div>
          <div className="text-[11px] text-zinc-400 font-sans">75% discount pass-through</div>
        </div>
      </div>

      {/* Navigation Dimension Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-xs overflow-x-auto">
        {[
          { id: 'models', label: 'Spend by AI Model', icon: Cpu },
          { id: 'keys', label: 'Spend by API Key', icon: Key },
          { id: 'modality', label: 'Token Modality & Caching', icon: Layers },
          { id: 'trend', label: 'Daily Spend Trend', icon: BarChart3 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl whitespace-nowrap transition-all cursor-pointer font-bold ${
                isActive
                  ? 'bg-white/10 text-white border border-white/20 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: By AI Model */}
      {activeTab === 'models' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-black/40 overflow-hidden divide-y divide-white/5 text-xs">
            {models.map((model) => (
              <div key={model.modelId} className="p-5 space-y-3 hover:bg-white/[0.02] transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-sans text-sm">{model.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">
                        {model.modelId}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-sans">{model.category}</p>
                  </div>

                  <div className="text-left sm:text-right space-y-0.5">
                    <div className="text-lg font-black text-white font-mono">${model.spendUsd.toFixed(2)} USD</div>
                    <div className="text-[11px] text-emerald-400 flex items-center sm:justify-end gap-1">
                      <TrendingDown className="w-3 h-3" />
                      Saved ${model.savingsUsd.toFixed(2)} ({model.savingsPercentage}%)
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        model.modelId.includes('sol')
                          ? 'bg-amber-400'
                          : model.modelId.includes('terra')
                          ? 'bg-cyan-400'
                          : model.modelId.includes('luna')
                          ? 'bg-indigo-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${model.spendPercentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>{model.spendPercentage}% of total portfolio spend</span>
                    <span>{model.requestCount.toLocaleString()} requests • {(model.totalTokens / 1_000_000).toFixed(1)}M tokens</span>
                  </div>
                </div>

                {/* Token Split Sub-Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-zinc-400">
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-zinc-500 block text-[10px]">Uncached Input</span>
                    <span className="text-white font-bold">{((model.promptTokens - model.cachedTokens) / 1_000_000).toFixed(1)}M tokens</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-300">
                    <span className="text-emerald-400/80 block text-[10px]">Cached Reads (75% OFF)</span>
                    <span className="font-bold">{(model.cachedTokens / 1_000_000).toFixed(1)}M tokens</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-zinc-500 block text-[10px]">Output Tokens</span>
                    <span className="text-white font-bold">{(model.completionTokens / 1_000_000).toFixed(1)}M tokens</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-zinc-500 block text-[10px]">Average Latency</span>
                    <span className="text-cyan-300 font-bold">{model.avgLatencyMs} ms</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: By API Key */}
      {activeTab === 'keys' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-black/40 overflow-hidden divide-y divide-white/5 text-xs">
            {keys.map((key) => (
              <div key={key.id} className="p-5 space-y-3 hover:bg-white/[0.02] transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white font-sans text-sm">{key.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 font-mono">
                        {key.prefix}••••
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">Last activity: {key.lastActive}</p>
                  </div>

                  <div className="text-left sm:text-right space-y-0.5">
                    <div className="text-lg font-black text-white font-mono">${key.spendUsd.toFixed(2)} USD</div>
                    <div className="text-[11px] text-zinc-400">
                      {key.requests.toLocaleString()} queries ({key.spendPercentage}%)
                    </div>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${key.spendPercentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Token Modality & Caching */}
      {activeTab === 'modality' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-black/40 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white font-sans text-base">Standard Input Processing</h3>
              <p className="text-zinc-400 text-xs font-sans">
                Non-cached prompt tokens processed across SOTA model endpoints at wholesale discounted rates.
              </p>
            </div>
            <div className="pt-2 border-t border-white/10 space-y-1">
              <div className="text-xl font-bold text-white font-mono">$21.80 USD</div>
              <div className="text-zinc-500">88.0M prompt tokens</div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-emerald-300 font-sans text-base">Prompt Caching Read Hits</h3>
              <p className="text-zinc-300 text-xs font-sans">
                Automatic 75%-80% cost discount pass-through on repeated prefixes, system prompts, and multi-turn context.
              </p>
            </div>
            <div className="pt-2 border-t border-emerald-500/20 space-y-1">
              <div className="text-xl font-bold text-emerald-400 font-mono">-$10.20 Net Rebate</div>
              <div className="text-emerald-400/80">40.0M cached tokens (75% saved)</div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-cyan-500/30 bg-cyan-500/5 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-cyan-300 font-sans text-base">Generation &amp; Thinking</h3>
              <p className="text-zinc-400 text-xs font-sans">
                Frontier reasoning tokens and generated responses with zero-latency streaming.
              </p>
            </div>
            <div className="pt-2 border-t border-cyan-500/20 space-y-1">
              <div className="text-xl font-bold text-cyan-300 font-mono">$13.20 USD</div>
              <div className="text-zinc-400">15.4M output tokens</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Daily Spend Trend */}
      {activeTab === 'trend' && (
        <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-black/40 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-white font-sans text-sm">14-Day Spend &amp; Arbitrage Velocity</h3>
              <p className="text-xs text-zinc-400 font-sans">Daily token inference burn vs direct retail cost</p>
            </div>
            <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
              Average Burn: ~$2.74 / day
            </span>
          </div>

          {/* Simple Visual Bar Chart */}
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-40 pt-6">
            {timeSeries.map((point) => {
              const maxSpend = 5.0;
              const heightPct = Math.min(100, (point.spend / maxSpend) * 100);
              return (
                <div key={point.date} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${point.spend.toFixed(1)}
                  </div>
                  <div
                    className="w-full bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-lg transition-all group-hover:brightness-125"
                    style={{ height: `${heightPct}%`, minHeight: '6px' }}
                  />
                  <span className="text-[10px] text-zinc-500 truncate w-full text-center">{point.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
