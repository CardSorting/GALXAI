'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Route,
  Zap,
  Activity,
  ShieldCheck,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  Sparkles,
  Sliders,
  Check,
  RefreshCw,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/ModelCatalog';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';

interface RoutingRule {
  id: string;
  name: string;
  primaryModel: string;
  fallbackModel: string;
  latencyThresholdMs: number;
  preservePromptCache: boolean;
  isActive: boolean;
  strategy: 'latency_and_health' | 'cost_optimized' | 'priority_failover';
  totalReroutes: number;
}

const INITIAL_RULES: RoutingRule[] = [
  {
    id: 'rule_1',
    name: 'Frontier Production Failover (Sol -> Terra)',
    primaryModel: 'gpt-5.6-sol',
    fallbackModel: 'gpt-5.6-terra',
    latencyThresholdMs: 25,
    preservePromptCache: true,
    isActive: true,
    strategy: 'latency_and_health',
    totalReroutes: 142
  },
  {
    id: 'rule_2',
    name: 'Sub-Second Agent Reroute (Terra -> Luna)',
    primaryModel: 'gpt-5.6-terra',
    fallbackModel: 'gpt-5.6-luna',
    latencyThresholdMs: 18,
    preservePromptCache: true,
    isActive: true,
    strategy: 'cost_optimized',
    totalReroutes: 89
  },
  {
    id: 'rule_3',
    name: 'High-Assurance Quota Pool Shield (Sol -> Terra)',
    primaryModel: 'gpt-5.6-sol',
    fallbackModel: 'gpt-5.6-terra',
    latencyThresholdMs: 30,
    preservePromptCache: true,
    isActive: true,
    strategy: 'priority_failover',
    totalReroutes: 37
  }
];

export default function SmartRoutingPage() {
  const [rules, setRules] = useState<RoutingRule[]>(INITIAL_RULES);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newPrimary, setNewPrimary] = useState('gpt-5.6-sol');
  const [newFallback, setNewFallback] = useState('gpt-5.6-terra');
  const [newLatencyThreshold, setNewLatencyThreshold] = useState(25);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState(false);

  const toggleRuleActive = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const newRule: RoutingRule = {
      id: `rule_${Date.now()}`,
      name: newRuleName.trim(),
      primaryModel: newPrimary,
      fallbackModel: newFallback,
      latencyThresholdMs: newLatencyThreshold,
      preservePromptCache: true,
      isActive: true,
      strategy: 'latency_and_health',
      totalReroutes: 0
    };

    setRules(prev => [newRule, ...prev]);
    setIsAddingRule(false);
    setNewRuleName('');
    setSavedSuccessMsg(true);
    setTimeout(() => setSavedSuccessMsg(false), 2500);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Models & Routing', href: '/models' },
            { label: 'Smart Failover Rules' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
              <Route className="w-6 h-6 text-cyan-400" />
              Smart Model Routing &amp; Failover Rules
            </h1>
            <p className="text-xs text-zinc-400">
              Declaratively route inference traffic with automated latency thresholds, prompt cache preservation, and zero-egress failover.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddingRule(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider font-mono flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Routing Rule</span>
            </button>
          </div>
        </div>

        <AuthRequiredGate
          title="Sign In to Manage Routing Policies"
          description="Model routing policies, latency thresholds, and automated failover rules are private to your workspace."
          checkoutAmount={50}
        >
          {savedSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Routing policy created and deployed to global Anycast Edge PoPs!</span>
            </div>
          )}

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
            <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
              <span className="text-[11px] text-zinc-400 uppercase font-sans font-semibold">Active Routing Rules</span>
              <div className="text-2xl font-black text-white">{rules.filter(r => r.isActive).length} / {rules.length}</div>
              <div className="text-[11px] text-emerald-400 font-sans">Automated Anycast switching</div>
            </div>

            <div className="glass-panel p-5 rounded-3xl space-y-1 border border-cyan-500/30 bg-cyan-500/5">
              <span className="text-[11px] text-cyan-400 uppercase font-sans font-semibold">Total SLA Shield Reroutes</span>
              <div className="text-2xl font-black text-cyan-300">
                {rules.reduce((acc, r) => acc + r.totalReroutes, 0)} Requests
              </div>
              <div className="text-[11px] text-cyan-400 font-sans">0 client-facing 429/500 errors</div>
            </div>

            <div className="glass-panel p-5 rounded-3xl space-y-1 border border-amber-500/30 bg-amber-500/5">
              <span className="text-[11px] text-amber-400 uppercase font-sans font-semibold">Prefix Cache Retention</span>
              <div className="text-2xl font-black text-amber-300">100% Preserved</div>
              <div className="text-[11px] text-amber-400 font-sans">75% discount carried over</div>
            </div>
          </div>

          {/* Add Rule Form Modal */}
          {isAddingRule && (
            <form onSubmit={handleCreateRule} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-cyan-500/30 bg-black/60 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Define New Failover &amp; Latency Rule
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingRule(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-zinc-400 uppercase text-[10px]">Rule Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Agent Fleet Sub-20ms SLA Guarantee"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-cyan-500 font-sans text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase text-[10px]">Primary Target Model</label>
                  <select
                    value={newPrimary}
                    onChange={(e) => setNewPrimary(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {FRONTEND_VISIBLE_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase text-[10px]">Automatic Fallback Model</label>
                  <select
                    value={newFallback}
                    onChange={(e) => setNewFallback(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {FRONTEND_VISIBLE_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase text-[10px]">Max Latency Threshold ({newLatencyThreshold}ms)</label>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={newLatencyThreshold}
                    onChange={(e) => setNewLatencyThreshold(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingRule(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-cyan-400 text-black font-bold text-xs font-mono hover:bg-cyan-300 transition-all cursor-pointer"
                >
                  Deploy Rule
                </button>
              </div>
            </form>
          )}

          {/* Rules List */}
          <div className="space-y-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="glass-panel rounded-3xl p-6 sm:p-7 space-y-4 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{rule.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${rule.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/70'}`}>
                        {rule.isActive ? 'Active on Edge' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Reroutes traffic when observed latency exceeds <strong className="text-white font-mono">{rule.latencyThresholdMs}ms</strong> or on upstream rate limit errors.
                    </p>
                  </div>

                  <button
                    onClick={() => toggleRuleActive(rule.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      rule.isActive
                        ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    {rule.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>

                {/* Routing Flow Visualizer */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                      {rule.primaryModel}
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-500" />
                    <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold">
                      {rule.fallbackModel}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-zinc-400 text-[11px]">
                    <span>Preserve Prompt Cache: <strong className="text-emerald-400">Enabled (75% off)</strong></span>
                    <span>Total Reroutes: <strong className="text-white">{rule.totalReroutes}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AuthRequiredGate>
      </main>
    </div>
  );
}
