'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { BillingSubNav } from '@/components/dashboard/BillingSubNav';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  Filter,
  CheckCircle2,
  Check,
  Mail,
  PieChart,
  DollarSign,
  Cpu,
  Key
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';

export default function ScheduledReportsPage() {
  const [dateRange, setDateRange] = useState('aug_2026');
  const [groupBy, setGroupBy] = useState<'model' | 'team' | 'key' | 'daily'>('model');
  const [includeDiscounts, setIncludeDiscounts] = useState(true);
  const [autoEmailSchedule, setAutoEmailSchedule] = useState(true);
  const [scheduleEmail, setScheduleEmail] = useState('accounting@acme.ai');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  const handleRunExport = (format: 'csv' | 'json') => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      const filename = `galxai_inference_report_${dateRange}_by_${groupBy}.${format}`;

      let rows = [
        { dimension: 'GPT-5.6 Sol (Apex Reasoning)', spendUsd: 184.20, tokens: 142000000, savingsUsd: 61.40 },
        { dimension: 'GPT-5.6 Terra (High-Throughput)', spendUsd: 92.50, tokens: 185000000, savingsUsd: 37.00 },
        { dimension: 'GPT-5.6 Luna (Sub-15ms Real-Time)', spendUsd: 41.80, tokens: 83600000, savingsUsd: 16.72 },
        { dimension: 'xAI Grok 4.5 (2M Ultra-Long Context)', spendUsd: 28.60, tokens: 28600000, savingsUsd: 11.44 },
      ];

      if (groupBy === 'team') {
        rows = [
          { dimension: 'Core Engineering / AI Coding (CC-ENG-101)', spendUsd: 495.10, tokens: 285000000, savingsUsd: 165.00 },
          { dimension: 'Data Science & ML Research Swarm (CC-DS-204)', spendUsd: 1240.00, tokens: 620000000, savingsUsd: 413.33 },
          { dimension: 'Customer Support Agents (CC-CS-302)', spendUsd: 190.00, tokens: 95000000, savingsUsd: 63.33 },
          { dimension: 'Product Prototyping Fleet (CC-PRD-405)', spendUsd: 85.00, tokens: 42500000, savingsUsd: 28.33 },
        ];
      } else if (groupBy === 'daily') {
        rows = [
          { dimension: '2026-08-25', spendUsd: 42.10, tokens: 32000000, savingsUsd: 14.03 },
          { dimension: '2026-08-24', spendUsd: 38.60, tokens: 29500000, savingsUsd: 12.87 },
          { dimension: '2026-08-23', spendUsd: 51.20, tokens: 41000000, savingsUsd: 17.07 },
          { dimension: '2026-08-22', spendUsd: 34.00, tokens: 26000000, savingsUsd: 11.33 },
        ];
      }

      const reportContent = format === 'csv'
        ? [
            ['Dimension', 'Inference Spend USD', 'Tokens Processed', includeDiscounts ? 'Wholesale Savings USD' : ''].filter(Boolean).join(','),
            ...rows.map(r => [
              `"${r.dimension}"`,
              r.spendUsd.toFixed(2),
              r.tokens,
              includeDiscounts ? r.savingsUsd.toFixed(2) : ''
            ].filter(Boolean).join(','))
          ].join('\n')
        : JSON.stringify({
            generatedAt: new Date().toISOString(),
            dateRange,
            groupBy,
            includeDiscounts,
            totalSpendUsd: rows.reduce((a, b) => a + b.spendUsd, 0),
            totalTokens: rows.reduce((a, b) => a + b.tokens, 0),
            items: rows
          }, null, 2);

      const blob = new Blob([reportContent], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();

      setExportSuccess(`Generated and downloaded ${filename} successfully!`);
      setTimeout(() => setExportSuccess(null), 4000);
    }, 600);
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleSaved(true);
    setTimeout(() => setScheduleSaved(false), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Billing', href: '/billing' },
            { label: 'Financial Ledger', href: '/billing' },
            { label: 'Custom Reports & ERP Exports' }
          ]}
        />

        <AuthRequiredGate
          title="Sign In to Generate Custom ERP Reports"
          description="Custom report exports, accounting statements, and automated delivery schedules are private to your workspace."
          checkoutAmount={50}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Custom Financial Reports & ERP Exports</h1>
            <p className="text-xs text-zinc-400">
              Generate customizable accounting statements, configure automated monthly email schedules, and export ERP-ready datasets.
            </p>
          </div>
        </div>

        <BillingSubNav />

        {exportSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportSuccess}</span>
          </div>
        )}

        {/* Custom Report Query Builder */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-400" />
              On-Demand Report Query Builder
            </h2>
            <p className="text-xs text-zinc-400">Customize the time window and dimensions for your export.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px]">Time Period</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="aug_2026">Current Month (August 2026)</option>
                <option value="jul_2026">Previous Month (July 2026)</option>
                <option value="q2_2026">Q2 2026 (Apr - Jun)</option>
                <option value="ytd_2026">Year to Date (2026)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px]">Aggregation Dimension</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="model">Group by AI Model (Sol, Terra, Grok)</option>
                <option value="team">Group by Team Cost Center (GL Allocation)</option>
                <option value="key">Group by Gateway API Key</option>
                <option value="daily">Group by Day (Daily Burn Rate)</option>
              </select>
            </div>

            <div className="space-y-1 flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-black/30 border border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDiscounts}
                  onChange={(e) => setIncludeDiscounts(e.target.checked)}
                  className="rounded bg-black/50 border-white/10 text-amber-400 focus:ring-0"
                />
                <span className="text-zinc-300 font-sans text-xs">Include Wholesale Savings Column</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              onClick={() => handleRunExport('json')}
              disabled={isExporting}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-white text-xs font-mono font-bold flex items-center gap-2 border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Dataset (.JSON)</span>
            </button>

            <button
              onClick={() => handleRunExport('csv')}
              disabled={isExporting}
              className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs font-mono uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-black" />
              <span>Download Excel/CSV Spreadsheet</span>
            </button>
          </div>
        </div>

        {/* Automated Recurring Schedule Box */}
        <form onSubmit={handleSaveSchedule} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-cyan-400" />
              Automated Monthly Statement Delivery Schedule
            </h3>
            <p className="text-xs text-zinc-400">
              Automatically dispatch consolidated PDF invoices and CSV reports to your corporate accounting inbox on the 1st of every month.
            </p>
          </div>

          {scheduleSaved && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Automated reporting schedule saved successfully!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px]">Accounting Email Recipient</label>
              <input
                type="email"
                required
                value={scheduleEmail}
                onChange={(e) => setScheduleEmail(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px]">Dispatch Cadence</label>
              <select className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500">
                <option>1st of Every Month at 00:00 UTC (Monthly Close)</option>
                <option>Weekly Monday Summary (Weekly Sprint)</option>
                <option>Quarterly Consolidated Close</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs font-mono transition-all cursor-pointer"
            >
              Update Delivery Schedule
            </button>
          </div>
        </form>
        </AuthRequiredGate>
      </main>
    </div>
  );
}
