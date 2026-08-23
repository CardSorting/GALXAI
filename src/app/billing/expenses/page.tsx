'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { BillingSubNav } from '@/components/dashboard/BillingSubNav';
import {
  PieChart,
  TrendingDown,
  ArrowUpRight,
  Download,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  Key,
  Check,
  BarChart3,
  Cpu,
  Receipt
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';

export default function ExpensesPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30d' | '90d' | 'ytd'>('30d');
  const [copiedCsv, setCopiedCsv] = useState(false);

  const modelSpendData = [
    { model: 'OpenAI GPT-5.6 Sol', spend: 21.40, tokens: 68000000, pct: 55.7, color: 'bg-amber-400' },
    { model: 'OpenAI GPT-5.6 Terra', spend: 9.80, tokens: 42000000, pct: 25.5, color: 'bg-cyan-400' },
    { model: 'xAI Grok 4.5 (500K)', spend: 4.80, tokens: 18000000, pct: 12.5, color: 'bg-indigo-400' },
    { model: 'OpenAI GPT-Image-2', spend: 2.40, tokens: 4000, pct: 6.3, color: 'bg-emerald-400' }
  ];

  const keySpendData = [
    { name: 'Production API Backend', spend: 18.50, requests: 1240, pct: 48.2, color: 'bg-cyan-400' },
    { name: 'Cursor IDE / Coding Assistant', spend: 14.20, requests: 3820, pct: 37.0, color: 'bg-amber-400' },
    { name: 'Agent Swarm / LangChain', spend: 5.70, requests: 890, pct: 14.8, color: 'bg-indigo-400' }
  ];

  const handleExportCsv = () => {
    const csvRows = [
      ['Dimension', 'Item Name', 'Spend USD', 'Tokens/Requests', 'Percentage'].join(','),
      ...modelSpendData.map(m => ['Model', `"${m.model}"`, m.spend, m.tokens, `${m.pct}%`].join(',')),
      ...keySpendData.map(k => ['API Key', `"${k.name}"`, k.spend, k.requests, `${k.pct}%`].join(','))
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `galxai_expense_report_${Date.now()}.csv`;
    a.click();
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Billing', href: '/billing' },
            { label: 'Expense Reporting' }
          ]}
        />

        <AuthRequiredGate
          title="Sign In to Access Expense Reports"
          description="Detailed model cost distributions, token volume analytics, and wholesale discount audits are private to your authenticated workspace."
          checkoutAmount={50}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Expense & Cost Center Analytics</h1>
            <p className="text-xs text-zinc-400">
              Granular breakdown of token inference costs, model distributions, and wholesale savings audits.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center p-1 rounded-xl bg-black/50 border border-white/10 text-xs font-mono">
              {(['30d', '90d', 'ytd'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTimeframe(t)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                    selectedTimeframe === t
                      ? 'bg-amber-400 text-black font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {t === '30d' ? 'Last 30 Days' : t === '90d' ? 'Last Quarter' : 'Year to Date'}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-mono font-bold flex items-center gap-2 border border-white/10 transition-all cursor-pointer"
            >
              {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              <span>{copiedCsv ? 'Exported Report!' : 'Export Expenses (.CSV)'}</span>
            </button>
          </div>
        </div>

        <BillingSubNav />

        {/* Expense KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
            <span className="text-[11px] text-zinc-400 uppercase font-sans font-semibold">Total Incurred Spend</span>
            <div className="text-2xl font-black text-white">$38.40 USD</div>
            <div className="text-[11px] text-zinc-500 font-sans">128.0M processed tokens</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-emerald-500/30 bg-emerald-500/5">
            <span className="text-[11px] text-emerald-400 uppercase font-sans font-semibold">Wholesale Savings Arbitrage</span>
            <div className="text-2xl font-black text-emerald-300">-$14.80 USD</div>
            <div className="text-[11px] text-emerald-400 font-sans">27.8% lower than direct API retail</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-cyan-500/30 bg-cyan-500/5">
            <span className="text-[11px] text-cyan-400 uppercase font-sans font-semibold">Average Burn Rate</span>
            <div className="text-2xl font-black text-cyan-300">~$1.28 / day</div>
            <div className="text-[11px] text-zinc-400 font-sans">Runway: 89+ days at current rate</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
            <span className="text-[11px] text-zinc-400 uppercase font-sans font-semibold">Prompt Caching Rebates</span>
            <div className="text-2xl font-black text-white">-$6.40 USD</div>
            <div className="text-[11px] text-zinc-400 font-sans">75% discount pass-through</div>
          </div>
        </div>

        {/* Spend Breakdown Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Model */}
          <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Spend by AI Model
              </h3>
              <span className="text-xs font-mono text-zinc-500">100% SOTA Frontier</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {modelSpendData.map((m) => (
                <div key={m.model} className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-200 font-semibold font-sans">{m.model}</span>
                    <span className="text-white font-bold">${m.spend.toFixed(2)} ({m.pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-0.5">
                    <span>{m.tokens > 10000 ? `${(m.tokens / 1000000).toFixed(1)}M tokens` : `${m.tokens} images`}</span>
                    <span className="text-emerald-400">25%-40% discount applied</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By API Key */}
          <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                Spend by Active Gateway Key
              </h3>
              <Link href="/keys" className="text-xs font-mono text-cyan-300 hover:underline">
                Manage Keys →
              </Link>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {keySpendData.map((k) => (
                <div key={k.name} className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-200 font-semibold font-sans">{k.name}</span>
                    <span className="text-white font-bold">${k.spend.toFixed(2)} ({k.pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full ${k.color} rounded-full`} style={{ width: `${k.pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-0.5">
                    <span>{k.requests.toLocaleString()} total requests</span>
                    <span className="text-cyan-400">Micro-billed seamlessly</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </AuthRequiredGate>
      </main>
    </div>
  );
}
