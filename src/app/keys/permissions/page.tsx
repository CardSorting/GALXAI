'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { KeysSubNav } from '@/components/dashboard/KeysSubNav';
import {
  ShieldCheck,
  Lock,
  Globe,
  Sliders,
  CheckCircle2,
  Check,
  Key,
  AlertTriangle,
  Radio,
  Cpu
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';

export default function KeyPermissionsPage() {
  const [selectedKey, setSelectedKey] = useState('galx_live_d819');
  const [ipAllowlist, setIpAllowlist] = useState('0.0.0.0/0');
  const [allowedModels, setAllowedModels] = useState<string[]>(['gpt-5.6-sol', 'gpt-5.6-terra', 'grok-4.5']);
  const [maxTokensPerRequest, setMaxTokensPerRequest] = useState(8192);
  const [keyTtl, setKeyTtl] = useState('never');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const availableModels = [
    { id: 'gpt-5.6-sol', label: 'OpenAI GPT-5.6 Sol (Coding & Reasoning)' },
    { id: 'gpt-5.6-terra', label: 'OpenAI GPT-5.6 Terra (Balanced Frontier)' },
    { id: 'gpt-5.6-luna', label: 'OpenAI GPT-5.6 Luna (Sub-second Velocity)' },
    { id: 'grok-4.5', label: 'xAI Grok 4.5 (500K Multimodal Context)' },
    { id: 'gpt-image-2', label: 'OpenAI GPT-Image-2 (Visual Synthesis)' }
  ];

  const handleToggleModel = (modelId: string) => {
    setAllowedModels(prev =>
      prev.includes(modelId) ? prev.filter(m => m !== modelId) : [...prev, modelId]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'API Keys', href: '/keys' },
            { label: 'Security & IP Allowlists' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">API Key Security & Scoped Permissions</h1>
            <p className="text-xs text-zinc-400">
              Lock down API keys with IP CIDR allowlists, restricted model access policies, max token guardrails, and auto-expiry TTLs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>STRICT POLICY ENFORCEMENT</span>
            </span>
          </div>
        </div>

        <KeysSubNav />

        <AuthRequiredGate
          title="Sign In to Configure Key Permissions"
          description="IP CIDR allowlists, restricted model access policies, and max token guardrails are private to your workspace."
          checkoutAmount={25}
        >
          {savedSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Security policies and CIDR allowlists updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Key Selector */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs text-zinc-400 font-mono uppercase">Select Target API Key to Govern:</span>
              <h3 className="text-base font-bold text-white">Configuring Scoped Security Policies</h3>
            </div>

            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="py-2.5 px-4 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
            >
              <option value="galx_live_d819">galx_live_d819 (Cursor IDE Coding Agent)</option>
              <option value="galx_live_p401">galx_live_p401 (Production API Backend)</option>
              <option value="galx_live_lc99">galx_live_lc99 (Agent Swarm / LangChain)</option>
            </select>
          </div>

          {/* Security Rules Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* IP Allowlist */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  IP CIDR Allowlist
                </h3>
                <p className="text-xs text-zinc-400">
                  Restrict request ingress to specific server IP addresses or VPC CIDR subnets.
                </p>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <input
                  type="text"
                  required
                  placeholder="0.0.0.0/0 (Global) or 54.210.0.0/16, 192.168.1.1/32"
                  value={ipAllowlist}
                  onChange={(e) => setIpAllowlist(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
                <span className="text-[11px] text-zinc-500 block font-sans">
                  Requests originating outside this CIDR range will be rejected with HTTP 403 Forbidden.
                </span>
              </div>
            </div>

            {/* Token Guardrails & TTL */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  Token Guardrails & Key Expiration
                </h3>
                <p className="text-xs text-zinc-400">Prevent runaway generation loops and configure automatic key TTL.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase text-[10px]">Max Tokens Per Request</label>
                  <select
                    value={maxTokensPerRequest}
                    onChange={(e) => setMaxTokensPerRequest(Number(e.target.value))}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value={2048}>2,048 Tokens (Short Snippets)</option>
                    <option value={4096}>4,096 Tokens (Standard Completion)</option>
                    <option value={8192}>8,192 Tokens (Large Refactors)</option>
                    <option value={32768}>32,768 Tokens (Full Codebase Files)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase text-[10px]">Key Auto-Expiry (TTL)</label>
                  <select
                    value={keyTtl}
                    onChange={(e) => setKeyTtl(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="never">Never Expires (Production Default)</option>
                    <option value="24h">24 Hours (Temporary CI/CD)</option>
                    <option value="7d">7 Days (Sprint / Testing)</option>
                    <option value="30d">30 Days (Monthly Rotation)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Model Access Whitelist */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Allowed Frontier Models Scoping
              </h3>
              <p className="text-xs text-zinc-400">
                Select which models this API key is permitted to call. Unselected models will be blocked at the gateway level.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {availableModels.map((model) => (
                <label
                  key={model.id}
                  onClick={() => handleToggleModel(model.id)}
                  className={`p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                    allowedModels.includes(model.id)
                      ? 'bg-amber-500/10 border-amber-500/30 text-white'
                      : 'bg-black/30 border-white/5 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={allowedModels.includes(model.id)}
                    onChange={() => {}}
                    className="rounded bg-black/50 border-white/10 text-amber-400 focus:ring-0"
                  />
                  <div className="font-mono text-xs font-bold">{model.label}</div>
                </label>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-white/5">
              <button
                type="submit"
                className="px-8 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider font-mono shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                Save Security Policies
              </button>
            </div>
          </div>
        </form>
        </AuthRequiredGate>
      </main>
    </div>
  );
}
