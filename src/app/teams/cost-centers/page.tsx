'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { TeamsSubNav } from '@/components/teams/TeamsSubNav';
import {
  Users2,
  Building2,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Plus,
  Key,
  Sliders,
  DollarSign,
  Download,
  Check,
  X,
  PieChart,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useOrganizationStore } from '@/lib/storage/organizationStore';
import { useAuth } from '@/contexts/AuthContext';

export default function TeamCostCentersPage() {
  const { costCenters: teams, createCostCenter } = useOrganizationStore();
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCode, setNewTeamCode] = useState('CC-OPS-501');
  const [newTeamBudget, setNewTeamBudget] = useState(1000);
  const [newTeamLead, setNewTeamLead] = useState('');
  const [copiedCsv, setCopiedCsv] = useState(false);

  const totalAllocatedBudget = teams.reduce((acc, t) => acc + t.monthlyBudgetCap, 0);
  const totalCurrentSpend = teams.reduce((acc, t) => acc + t.currentSpend, 0);
  const totalKeysManaged = teams.reduce((acc, t) => acc + t.keysCount, 0);

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    createCostCenter(
      newTeamName.trim(),
      newTeamCode.trim() || `CC-${Math.floor(100 + Math.random() * 900)}`,
      newTeamLead.trim() || 'lead@acme.ai',
      Number(newTeamBudget)
    );

    setIsAddingTeam(false);
    setNewTeamName('');
    setNewTeamLead('');
  };

  const handleExportCsv = () => {
    const csvRows = [
      ['Cost Center Code', 'Team Name', 'Team Lead', 'Assigned Keys', 'Budget Cap USD', 'Current Spend USD', 'Utilization %'].join(','),
      ...teams.map(t => [
        `"${t.code}"`,
        `"${t.name}"`,
        `"${t.leadEmail}"`,
        t.keysCount,
        t.monthlyBudgetCap,
        t.currentSpend,
        `${((t.currentSpend / t.monthlyBudgetCap) * 100).toFixed(1)}%`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `galxai_team_cost_centers_${Date.now()}.csv`;
    a.click();
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const { user } = useAuth();
  const workspaceName = user?.company || 'Acme AI Corp';
  const planName = user?.role === 'enterprise' ? 'Enterprise Fleet' : 'Small Business';

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          workspaceContext={{ name: workspaceName, plan: planName }}
          items={[
            { label: 'Workspace & Teams', href: '/teams/seats', icon: Users2 },
            { label: 'Members & Access' },
            { label: 'Cost Centers & Squads', icon: Building2, badge: '4 Squads', badgeColor: 'bg-white/10 text-white' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Enterprise Cost Centers &amp; Squad Budgets</h1>
            <p className="text-xs text-zinc-400">
              Allocate AI compute budgets across engineering squads, research teams, and business units with GL cost center codes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/teams/seats"
              className="px-4 py-2.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
            >
              <Users2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Manage Seats</span>
            </Link>

            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-mono font-bold flex items-center gap-2 border border-white/10 transition-all cursor-pointer"
            >
              {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              <span>{copiedCsv ? 'Exported!' : 'Export GL Cost Center CSV'}</span>
            </button>

            <button
              onClick={() => setIsAddingTeam(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider font-mono flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Cost Center</span>
            </button>
          </div>
        </div>

        <TeamsSubNav />

        {/* Executive KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
            <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
              <span className="text-[11px] text-zinc-400 uppercase font-sans font-semibold">Allocated Team Budgets</span>
              <div className="text-2xl font-black text-white">${totalAllocatedBudget.toLocaleString()} / mo</div>
              <div className="text-[11px] text-zinc-400 font-sans">{teams.length} active cost centers</div>
            </div>

            <div className="glass-panel p-5 rounded-3xl space-y-1 border border-cyan-500/30 bg-cyan-500/5">
              <span className="text-[11px] text-cyan-400 uppercase font-sans font-semibold">Active Incurred Spend</span>
              <div className="text-2xl font-black text-cyan-300">${totalCurrentSpend.toFixed(2)} USD</div>
              <div className="text-[11px] text-cyan-400 font-sans">
                {((totalCurrentSpend / totalAllocatedBudget) * 100).toFixed(1)}% global budget utilization
              </div>
            </div>

            <div className="glass-panel p-5 rounded-3xl space-y-1 border border-emerald-500/30 bg-emerald-500/5">
              <span className="text-[11px] text-emerald-400 uppercase font-sans font-semibold">Governed Gateway Keys</span>
              <div className="text-2xl font-black text-emerald-300">{totalKeysManaged} Active Keys</div>
              <div className="text-[11px] text-emerald-400 font-sans">Multi-tenant isolation active</div>
            </div>
          </div>

          {/* Visual Budget Allocation Distribution Bar (Stripe & AWS Style) */}
          <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-amber-400" />
                  Department Budget Allocation Distribution
                </h3>
                <p className="text-xs text-zinc-400">Proportional breakdown of the ${totalAllocatedBudget.toLocaleString()}/mo total workspace budget cap.</p>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> AI Fleet</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Platform</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Product</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Data Sci</span>
              </div>
            </div>

            {/* Proportional Segmented Progress Bar */}
            <div className="w-full h-3 rounded-full bg-white/10 flex overflow-hidden p-0.5 gap-0.5">
              {teams.map((team) => {
                const sharePct = totalAllocatedBudget > 0 ? (team.monthlyBudgetCap / totalAllocatedBudget) * 100 : 25;
                return (
                  <div
                    key={team.id}
                    style={{ width: `${sharePct}%` }}
                    className={`h-full ${team.color} rounded-sm transition-all`}
                    title={`${team.name}: $${team.monthlyBudgetCap.toLocaleString()} (${sharePct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>
          </div>

          {/* Add Team Modal / Form */}
          {isAddingTeam && (
            <form onSubmit={handleCreateTeam} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-amber-500/30 bg-black/50 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users2 className="w-4 h-4 text-amber-400" />
                  Provision New Team Cost Center
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingTeam(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase text-[10px]">Team / Department Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Autonomous Agent Fleet, Mobile Eng"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500 font-sans text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase text-[10px]">GL Cost Center Code</label>
                  <input
                    type="text"
                    required
                    value={newTeamCode}
                    onChange={(e) => setNewTeamCode(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase text-[10px]">Team Lead / Owner Email</label>
                  <input
                    type="email"
                    required
                    placeholder="lead@acme.ai"
                    value={newTeamLead}
                    onChange={(e) => setNewTeamLead(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase text-[10px]">Monthly Safety Budget Cap ($ USD)</label>
                  <input
                    type="number"
                    required
                    min="100"
                    max="50000"
                    value={newTeamBudget}
                    onChange={(e) => setNewTeamBudget(Number(e.target.value))}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingTeam(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs font-mono hover:bg-amber-300 transition-all cursor-pointer"
                >
                  Save Cost Center
                </button>
              </div>
            </form>
          )}

          {/* Cost Centers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams.map((team) => {
              const utilPct = Math.min(100, (team.currentSpend / team.monthlyBudgetCap) * 100);

              return (
                <div
                  key={team.id}
                  className="glass-panel rounded-3xl p-6 sm:p-7 space-y-4 border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-white/10 text-cyan-300 font-mono text-[10px] font-bold">
                          {team.code}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">{team.keysCount} API keys</span>
                      </div>
                      <h3 className="text-base font-bold text-white">{team.name}</h3>
                      <p className="text-xs text-zinc-400 font-mono">Lead: {team.leadEmail}</p>
                    </div>

                    <Link
                      href="/keys"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                      title="Manage Keys"
                    >
                      <Key className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Current Spend: <strong className="text-white">${team.currentSpend.toFixed(2)}</strong></span>
                      <span className="text-zinc-400">Cap: ${team.monthlyBudgetCap.toLocaleString()} / mo</span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full ${team.color} rounded-full transition-all duration-500`} style={{ width: `${utilPct}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                      <span>{utilPct.toFixed(1)}% budget utilized</span>
                      <span className="text-emerald-400 font-semibold">Auto-Throttle Active</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
      </main>
    </div>
  );
}
