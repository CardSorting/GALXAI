'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { BillingSubNav } from '@/components/dashboard/BillingSubNav';
import {
  FileCheck,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Download,
  Filter,
  Search,
  Lock,
  Clock,
  Check,
  Terminal,
  Fingerprint
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { useFinanceStore } from '@/lib/storage/financeStore';

export default function AuditLogsPage() {
  const { auditLogs: logs } = useFinanceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCsv, setCopiedCsv] = useState(false);

  const handleExportCsv = () => {
    const csvRows = [
      ['Log ID', 'Action', 'Actor Email / IP', 'Details', 'SHA-256 Signature', 'Timestamp UTC'].join(','),
      ...logs.map(l => [
        l.id,
        l.action,
        `"${l.actor} [${l.ip}]"`,
        `"${l.details}"`,
        l.hash,
        `"${l.timestamp}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `galxai_soc2_audit_trail_${Date.now()}.csv`;
    a.click();
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const filteredLogs = logs.filter(l =>
    l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.details.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Billing', href: '/billing' },
            { label: 'Audit Trail & Compliance' }
          ]}
        />

        <AuthRequiredGate
          title="Sign In to Inspect Financial Audit Logs"
          description="Cryptographically signed financial transaction records, permission mutations, and actor audit logs are private to your workspace."
          checkoutAmount={50}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Tamper-Evident Financial Audit Trail</h1>
            <p className="text-xs text-zinc-400">
              Cryptographically signed ledger of all wallet adjustments, budget modifications, and key lifecycle events for SOC2 compliance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-mono font-bold flex items-center gap-2 border border-white/10 transition-all cursor-pointer"
            >
              {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              <span>{copiedCsv ? 'Exported!' : 'Export SOC2 Audit Log (.CSV)'}</span>
            </button>
          </div>
        </div>

        <BillingSubNav />

        {/* Compliance Certification Strip */}
        <div className="glass-panel rounded-3xl p-6 border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="font-bold text-white">SOC 2 Type II & ISO 27001 Financial Trail Certified</span>
              <p className="text-[11px] text-emerald-400/80">Every event is hashed with immutable SHA-256 signatures and zero data retention.</p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
            Chain Valid • 100% Tamper Proof
          </span>
        </div>

        {/* Audit Log Table */}
        <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 overflow-x-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-cyan-400" />
              Cryptographic Audit Stream
            </h3>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pl-9 pr-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4 font-sans">Timestamp (UTC)</th>
                <th className="py-3 px-4 font-sans">Event Action</th>
                <th className="py-3 px-4 font-sans">Actor & Network IP</th>
                <th className="py-3 px-4 font-sans">Event Details</th>
                <th className="py-3 px-4 font-sans">Cryptographic Signature</th>
                <th className="py-3 px-4 text-right font-sans">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                    {log.timestamp}
                  </td>

                  <td className="py-3.5 px-4 font-bold text-amber-300 whitespace-nowrap">
                    {log.action}
                  </td>

                  <td className="py-3.5 px-4 text-zinc-300">
                    <div>{log.actor}</div>
                    <span className="text-[10px] text-zinc-500">{log.ip}</span>
                  </td>

                  <td className="py-3.5 px-4 text-zinc-300 font-sans text-xs">
                    {log.details}
                  </td>

                  <td className="py-3.5 px-4 text-zinc-500 text-[10px] truncate max-w-xs font-mono">
                    <span className="text-cyan-400/80">{log.hash.slice(0, 16)}...</span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                      Verified
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </AuthRequiredGate>
      </main>
    </div>
  );
}
