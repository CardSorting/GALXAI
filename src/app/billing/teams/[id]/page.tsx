'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Users2,
  Building2,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowLeft,
  Key,
  Sliders,
  DollarSign,
  Download,
  Check,
  PieChart,
  Lock,
  Cpu
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';

interface TeamDetail {
  id: string;
  name: string;
  code: string;
  leadEmail: string;
  keysCount: number;
  monthlyBudgetCap: number;
  currentSpend: number;
  color: string;
  models: { name: string; spend: number; pct: number }[];
  keys: { id: string; name: string; prefix: string; rateLimit: number; spend: number }[];
}

const TEAM_MAP: Record<string, TeamDetail> = {
  'team_eng': {
    id: 'team_eng',
    name: 'Core Engineering / AI Coding (Cursor)',
    code: 'CC-ENG-101',
    leadEmail: 'eng-lead@acme.ai',
    keysCount: 6,
    monthlyBudgetCap: 1500,
    currentSpend: 480.00,
    color: 'bg-amber-400',
    models: [
      { name: 'OpenAI GPT-5.6 Sol', spend: 320.00, pct: 66.7 },
      { name: 'OpenAI GPT-5.6 Terra', spend: 110.00, pct: 22.9 },
      { name: 'xAI Grok 4.5', spend: 50.00, pct: 10.4 }
    ],
    keys: [
      { id: 'k1', name: 'Cursor IDE Coding Agent', prefix: 'galx_live_c910', rateLimit: 120, spend: 280.00 },
      { id: 'k2', name: 'Windsurf Development', prefix: 'galx_live_w821', rateLimit: 120, spend: 120.00 },
      { id: 'k3', name: 'CI/CD Automated Refactoring', prefix: 'galx_live_ci44', rateLimit: 300, spend: 80.00 }
    ]
  },
  'team_ds': {
    id: 'team_ds',
    name: 'Data Science & ML Research Swarm',
    code: 'CC-DS-204',
    leadEmail: 'ml-lead@acme.ai',
    keysCount: 4,
    monthlyBudgetCap: 2500,
    currentSpend: 1240.00,
    color: 'bg-cyan-400',
    models: [
      { name: 'xAI Grok 4.5 (500K)', spend: 720.00, pct: 58.1 },
      { name: 'OpenAI GPT-5.6 Sol', spend: 400.00, pct: 32.3 },
      { name: 'OpenAI GPT-Image-2', spend: 120.00, pct: 9.6 }
    ],
    keys: [
      { id: 'k4', name: 'LangChain Agent Swarm', prefix: 'galx_live_lc99', rateLimit: 600, spend: 840.00 },
      { id: 'k5', name: 'Batch Evaluation Pipeline', prefix: 'galx_live_ev32', rateLimit: 300, spend: 400.00 }
    ]
  },
  'team_support': {
    id: 'team_support',
    name: 'Autonomous Customer Support Agents',
    code: 'CC-CS-302',
    leadEmail: 'support-ops@acme.ai',
    keysCount: 2,
    monthlyBudgetCap: 800,
    currentSpend: 190.00,
    color: 'bg-emerald-400',
    models: [
      { name: 'OpenAI GPT-5.6 Terra', spend: 150.00, pct: 78.9 },
      { name: 'OpenAI GPT-5.6 Luna', spend: 40.00, pct: 21.1 }
    ],
    keys: [
      { id: 'k6', name: 'Support Bot Live Gateway', prefix: 'galx_live_cs01', rateLimit: 300, spend: 190.00 }
    ]
  },
  'team_product': {
    id: 'team_product',
    name: 'Product Prototyping Fleet',
    code: 'CC-PRD-405',
    leadEmail: 'pm-lead@acme.ai',
    keysCount: 3,
    monthlyBudgetCap: 500,
    currentSpend: 85.00,
    color: 'bg-indigo-400',
    models: [
      { name: 'OpenAI GPT-5.6 Sol', spend: 60.00, pct: 70.6 },
      { name: 'OpenAI DALL-E 3', spend: 25.00, pct: 29.4 }
    ],
    keys: [
      { id: 'k7', name: 'PM Design Playground', prefix: 'galx_live_pm88', rateLimit: 60, spend: 85.00 }
    ]
  }
};

export default function SingleTeamCostCenterPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const teamId = resolvedParams.id;
  const team = TEAM_MAP[teamId] || TEAM_MAP['team_eng'];

  const [budgetCap, setBudgetCap] = useState(team.monthlyBudgetCap);
  const [savedMsg, setSavedMsg] = useState(false);

  const handleUpdateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const utilPct = Math.min(100, (team.currentSpend / budgetCap) * 100);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Billing', href: '/billing' },
            { label: 'Team Cost Centers', href: '/billing/teams' },
            { label: team.name }
          ]}
        />

        <AuthRequiredGate
          title="Sign In to Manage Team Cost Center"
          description="Squad budget allocations, associated API key lists, and spend velocity data are private to your workspace."
          checkoutAmount={100}
        >
          <div className="flex items-center justify-between">
          <Link
            href="/billing/teams"
            className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Cost Centers</span>
          </Link>
        </div>

        {/* Hero Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono text-xs font-bold">
                  {team.code}
                </span>
                <span className="text-xs text-zinc-400 font-mono">{team.keysCount} assigned keys</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{team.name}</h1>
              <p className="text-xs text-zinc-500 font-mono">Lead / Owner: {team.leadEmail}</p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 font-mono text-right space-y-0.5">
              <div className="text-zinc-500 text-[10px] uppercase">Current Monthly Spend</div>
              <div className="text-3xl font-black text-white">${team.currentSpend.toFixed(2)}</div>
              <div className="text-[11px] text-zinc-400 font-sans">{utilPct.toFixed(1)}% of ${budgetCap.toLocaleString()} cap</div>
            </div>
          </div>

          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div className={`h-full ${team.color} rounded-full`} style={{ width: `${utilPct}%` }} />
          </div>
        </div>

        {/* Spend by Model & Keys Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Models */}
          <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Squad Inference by Model
            </h3>

            <div className="space-y-3 font-mono text-xs">
              {team.models.map((m) => (
                <div key={m.name} className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-200 font-sans font-semibold">{m.name}</span>
                    <span className="text-white font-bold">${m.spend.toFixed(2)} ({m.pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keys */}
          <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                Assigned Gateway API Keys
              </h3>
              <Link href="/keys/new" className="text-xs font-mono text-cyan-300 hover:underline">
                + Mint Key
              </Link>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {team.keys.map((k) => (
                <div key={k.id} className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-200 font-sans font-semibold">{k.name}</span>
                    <span className="text-white font-bold">${k.spend.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span><code>{k.prefix}...</code></span>
                    <span>Rate: {k.rateLimit} RPM</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Update Squad Budget Cap Form */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            Modify Squad Budget Cap & Safety Thresholds
          </h3>

          {savedMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Squad budget cap updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleUpdateBudget} className="flex flex-col sm:flex-row items-center gap-4 font-mono text-xs">
            <div className="w-full sm:w-72 space-y-1">
              <label className="text-zinc-400 uppercase text-[10px]">Monthly Safety Cap ($ USD)</label>
              <input
                type="number"
                min="100"
                max="50000"
                value={budgetCap}
                onChange={(e) => setBudgetCap(Number(e.target.value))}
                className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 mt-auto rounded-xl bg-amber-400 text-black font-bold text-xs font-mono hover:bg-amber-300 transition-all cursor-pointer"
            >
              Update Squad Budget
            </button>
          </form>
        </div>
        </AuthRequiredGate>
      </main>
    </div>
  );
}
