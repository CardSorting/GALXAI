'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { KeysSubNav } from '@/components/dashboard/KeysSubNav';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  Terminal,
  Cpu,
  Layers,
  ArrowUpRight,
  Zap,
  Code2
} from 'lucide-react';

interface RequestLog {
  id: string;
  keyPrefix: string;
  keyName: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  statusCode: number;
  timestamp: string;
  costUsd: number;
}

const INITIAL_REQUEST_LOGS: RequestLog[] = [
  {
    id: 'req_9812a',
    keyPrefix: 'galx_live_d819',
    keyName: 'Cursor IDE Coding Agent',
    model: 'OpenAI GPT-5.6 Sol',
    promptTokens: 1420,
    completionTokens: 284,
    totalTokens: 1704,
    latencyMs: 182,
    statusCode: 200,
    timestamp: '12s ago',
    costUsd: 0.0034
  },
  {
    id: 'req_9811b',
    keyPrefix: 'galx_live_p401',
    keyName: 'Production API Backend',
    model: 'OpenAI GPT-5.6 Terra',
    promptTokens: 840,
    completionTokens: 160,
    totalTokens: 1000,
    latencyMs: 145,
    statusCode: 200,
    timestamp: '45s ago',
    costUsd: 0.0012
  },
  {
    id: 'req_9810c',
    keyPrefix: 'galx_live_lc99',
    keyName: 'Agent Swarm / LangChain',
    model: 'xAI Grok 4.5 (500K)',
    promptTokens: 4200,
    completionTokens: 920,
    totalTokens: 5120,
    latencyMs: 310,
    statusCode: 200,
    timestamp: '2m ago',
    costUsd: 0.0089
  },
  {
    id: 'req_9809d',
    keyPrefix: 'galx_live_d819',
    keyName: 'Cursor IDE Coding Agent',
    model: 'OpenAI GPT-5.6 Sol',
    promptTokens: 3100,
    completionTokens: 512,
    totalTokens: 3612,
    latencyMs: 240,
    statusCode: 200,
    timestamp: '3m ago',
    costUsd: 0.0072
  },
  {
    id: 'req_9808e',
    keyPrefix: 'galx_live_w821',
    keyName: 'Windsurf Development',
    model: 'OpenAI GPT-5.6 Luna',
    promptTokens: 620,
    completionTokens: 95,
    totalTokens: 715,
    latencyMs: 88,
    statusCode: 200,
    timestamp: '5m ago',
    costUsd: 0.0006
  }
];

export default function KeyActivityPage() {
  const [logs, setLogs] = useState<RequestLog[]>(INITIAL_REQUEST_LOGS);
  const [selectedKey, setSelectedKey] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      const newLog: RequestLog = {
        id: `req_${Math.random().toString(36).substring(2, 7)}`,
        keyPrefix: 'galx_live_d819',
        keyName: 'Cursor IDE Coding Agent',
        model: 'OpenAI GPT-5.6 Sol',
        promptTokens: Math.floor(500 + Math.random() * 2000),
        completionTokens: Math.floor(100 + Math.random() * 500),
        totalTokens: 1500,
        latencyMs: Math.floor(120 + Math.random() * 100),
        statusCode: 200,
        timestamp: 'Just now',
        costUsd: 0.0028
      };
      setLogs([newLog, ...logs]);
    }, 400);
  };

  const filteredLogs = logs.filter(log => {
    if (selectedKey !== 'all' && log.keyPrefix !== selectedKey) return false;
    if (selectedModel !== 'all' && !log.model.includes(selectedModel)) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'API Keys', href: '/keys' },
            { label: 'Live Telemetry & Activity' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Live Request Telemetry & Activity Stream</h1>
            <p className="text-xs text-zinc-400">
              Inspect real-time API completions, token counts, sub-millisecond latencies, and status codes across all active gateway keys.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Streaming...' : 'Refresh Activity'}</span>
          </button>
        </div>

        <KeysSubNav />

        {/* Live Metrics Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
            <span className="text-zinc-500 text-[10px] uppercase font-sans">Recent Request Velocity</span>
            <div className="text-2xl font-black text-white">38.4 req/min</div>
            <div className="text-[11px] text-zinc-400 font-sans">Across 6 active keys</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-emerald-500/30 bg-emerald-500/5">
            <span className="text-emerald-400 text-[10px] uppercase font-sans font-semibold">Average TTFT Latency</span>
            <div className="text-2xl font-black text-emerald-300">164 ms</div>
            <div className="text-[11px] text-emerald-400 font-sans">Sub-15ms router dispatch</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-cyan-500/30 bg-cyan-500/5">
            <span className="text-cyan-400 text-[10px] uppercase font-sans font-semibold">Success Rate</span>
            <div className="text-2xl font-black text-cyan-300">100.0%</div>
            <div className="text-[11px] text-zinc-400 font-sans">0 rate limit dropouts</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
            <span className="text-zinc-500 text-[10px] uppercase font-sans">Prompt Cache Hit Ratio</span>
            <div className="text-2xl font-black text-white">68.2%</div>
            <div className="text-[11px] text-emerald-400 font-sans">75% discount applied</div>
          </div>
        </div>

        {/* Filters & Request Table */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Live Request Stream
            </h3>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="py-1.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500 text-xs"
              >
                <option value="all">All API Keys</option>
                <option value="galx_live_d819">galx_live_d819 (Cursor IDE)</option>
                <option value="galx_live_p401">galx_live_p401 (Production Backend)</option>
                <option value="galx_live_lc99">galx_live_lc99 (Agent Swarm)</option>
              </select>

              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="py-1.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500 text-xs"
              >
                <option value="all">All Models</option>
                <option value="Sol">GPT-5.6 Sol</option>
                <option value="Terra">GPT-5.6 Terra</option>
                <option value="Grok">xAI Grok 4.5</option>
                <option value="Luna">GPT-5.6 Luna</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4 font-sans">Request ID & Time</th>
                  <th className="py-3 px-4 font-sans">API Key</th>
                  <th className="py-3 px-4 font-sans">AI Model</th>
                  <th className="py-3 px-4 font-sans">Tokens (In / Out)</th>
                  <th className="py-3 px-4 font-sans">Latency</th>
                  <th className="py-3 px-4 font-sans">Cost</th>
                  <th className="py-3 px-4 text-right font-sans">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-zinc-200">{log.id}</div>
                      <span className="text-[10px] text-zinc-500">{log.timestamp}</span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-white font-semibold font-sans">{log.keyName}</div>
                      <span className="text-[10px] text-zinc-500 font-mono"><code>{log.keyPrefix}...</code></span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-cyan-300 whitespace-nowrap">
                      {log.model}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-zinc-300">
                      <div>{log.totalTokens.toLocaleString()} total</div>
                      <span className="text-[10px] text-zinc-500">{log.promptTokens} in • {log.completionTokens} out</span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-zinc-200">
                      {log.latencyMs} ms
                    </td>

                    <td className="py-3 px-4 font-bold text-amber-300 whitespace-nowrap">
                      ${log.costUsd.toFixed(4)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        {log.statusCode} OK
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
