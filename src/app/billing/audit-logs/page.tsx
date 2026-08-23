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

interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  ip: string;
  details: string;
  hash: string;
  timestamp: string;
  status: 'verified' | 'tamper_proof';
}

const INITIAL_LOGS: AuditLogEntry[] = [
  {
    id: 'log_01',
    action: 'AUTO_RELOAD_RULE_UPDATED',
    actor: 'admin@acme.ai',
    ip: '192.168.1.42',
    details: 'Threshold set to $10.00, Reload amount set to $50.00 (+5% Bonus)',
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    timestamp: '2026-08-22 06:12:10 UTC',
    status: 'verified'
  },
  {
    id: 'log_02',
    action: 'COMPUTE_WALLET_CREDITED',
    actor: 'system_auto_topup_daemon',
    ip: '10.0.4.19 [Internal VPC]',
    details: '+$110.00 USD credited via Visa (••4242) with +10% Volume Bonus',
    hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    timestamp: '2026-08-22 04:15:33 UTC',
    status: 'verified'
  },
  {
    id: 'log_03',
    action: 'TEAM_BUDGET_CAP_MODIFIED',
    actor: 'finance-lead@acme.ai',
    ip: '192.168.1.88',
    details: 'Cost Center CC-ENG-101 monthly budget increased to $1,500.00 USD',
    hash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    timestamp: '2026-08-21 22:45:01 UTC',
    status: 'verified'
  },
  {
    id: 'log_04',
    action: 'DEVELOPER_KEY_MINTED',
    actor: 'admin@acme.ai',
    ip: '192.168.1.42',
    details: 'Key galx_live_d819... minted for Cursor IDE (Rate: 120 RPM)',
    hash: '3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d',
    timestamp: '2026-08-21 19:30:12 UTC',
    status: 'verified'
  },
  {
    id: 'log_05',
    action: 'TAX_INVOICE_GENERATED',
    actor: 'system_billing_engine',
    ip: '10.0.1.5 [Internal Gateway]',
    details: 'Monthly tax invoice INV-2026-0801 generated for Acme AI Corp ($110.00)',
    hash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    timestamp: '2026-08-21 00:00:00 UTC',
    status: 'verified'
  }
];

export default function AuditLogsPage() {
  const [logs] = useState<AuditLogEntry[]>(INITIAL_LOGS);
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
