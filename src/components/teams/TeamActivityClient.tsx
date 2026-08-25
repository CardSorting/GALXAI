'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Download,
  Filter,
  Search,
  CheckCircle2,
  UserPlus,
  Shield,
  Key,
  Sliders,
  Lock,
  Calendar,
  Check,
  Building2
} from 'lucide-react';
import { useOrganizationStore } from '@/lib/storage/organizationStore';
import { GovernanceAuditEvent } from '@/lib/data/organizationData';

export function TeamActivityClient() {
  const { auditEvents } = useOrganizationStore();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportedStatus, setExportedStatus] = useState(false);

  const filteredEvents = auditEvents.filter((evt) => {
    const matchesCat = filterCategory === 'all' || evt.category === filterCategory;
    const matchesSearch =
      evt.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.actorEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'Actor', 'Email', 'Action', 'Category', 'Details', 'IP Address'].join(','),
      ...filteredEvents.map(e => [
        `"${e.timestamp}"`,
        `"${e.actorName}"`,
        `"${e.actorEmail}"`,
        `"${e.action}"`,
        `"${e.category}"`,
        `"${e.details}"`,
        `"${e.ipAddress}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `galxai_governance_audit_${Date.now()}.csv`;
    a.click();
    setExportedStatus(true);
    setTimeout(() => setExportedStatus(false), 2000);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden bg-gradient-to-r from-emerald-500/5 via-black/40 to-cyan-500/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Immutable Governance Audit Trail</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Organization Activity &amp; Member Audit Stream
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl font-sans">
              Track every seat invitation, role elevation, spend cap adjustment, and SSO authentication event in real-time for compliance audits.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={handleExport}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold border border-white/15 flex items-center gap-2 transition-all cursor-pointer"
            >
              {exportedStatus ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4 text-cyan-400" />}
              <span>{exportedStatus ? 'Exported CSV!' : 'Export SOC 2 CSV'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['all', 'members', 'roles', 'caps', 'sso', 'security', 'settings'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-xl capitalize font-bold transition-all cursor-pointer ${
                filterCategory === cat
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat === 'all' ? 'All Events' : cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="py-1.5 pl-8 pr-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-cyan-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Events Stream */}
      <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 font-mono text-xs">
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 font-sans">No matching activity records found.</div>
          ) : (
            filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:border-white/15 transition-all"
              >
                <div className="space-y-1 font-sans flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{evt.action}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-white/10 text-zinc-300 uppercase">
                      {evt.category}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{evt.details}</p>
                  <div className="text-[11px] text-zinc-400 font-mono pt-1">
                    Actor: <span className="text-zinc-200">{evt.actorName}</span> ({evt.actorEmail}) • IP: <span className="text-zinc-400">{evt.ipAddress}</span>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400 font-mono shrink-0">
                  {evt.timestamp}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
