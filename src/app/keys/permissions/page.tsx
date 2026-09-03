'use client';

import React, { useState, useEffect } from 'react';
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
  Cpu,
  Layers,
  Save,
  Zap,
  FileCode
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { resilientFetch } from '@/lib/resilience/ResilientClient';

export default function KeyPermissionsPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [ipAllowlist, setIpAllowlist] = useState('0.0.0.0/0');
  const [allowedScopes, setAllowedScopes] = useState<string[]>(['*']);
  const [keyTtlDays, setKeyTtlDays] = useState<number>(0);
  const [compactionMode, setCompactionMode] = useState<'auto' | 'raw'>('raw');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const availableScopes = [
    { id: '*', label: 'Full Root Access (*)', desc: 'Unrestricted completions, models, images, and embeddings' },
    { id: 'chat:*', label: 'Chat & Completions (chat:*)', desc: 'Allows chat completions and streaming responses' },
    { id: 'models:read', label: 'Models Read (models:read)', desc: 'Allows querying model catalogs and context limits' },
    { id: 'images:generate', label: 'Image Synthesis (images:generate)', desc: 'Allows GPT-Image generation calls' },
    { id: 'embeddings:*', label: 'Embeddings (embeddings:*)', desc: 'Allows vector embeddings generation' }
  ];

  const fetchKeys = async () => {
    try {
      const res = await resilientFetch<{ keys: any[] }>('/api/keys', { enableCacheFallback: true });
      const activeKeys = res.data?.keys?.filter(k => !k.revoked) || [];
      setKeys(activeKeys);
      if (activeKeys.length > 0 && !selectedKeyId) {
        setSelectedKeyId(activeKeys[0].id);
        loadKeySettings(activeKeys[0]);
      }
    } catch {}
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const loadKeySettings = (key: any) => {
    if (!key) return;
    setIpAllowlist(Array.isArray(key.ipWhitelist) && key.ipWhitelist.length > 0 ? key.ipWhitelist.join(', ') : '0.0.0.0/0');
    setAllowedScopes(Array.isArray(key.scopes) && key.scopes.length > 0 ? key.scopes : ['*']);
    if (key.expiresAt) {
      const diffDays = Math.ceil((key.expiresAt - Date.now()) / (86400 * 1000));
      setKeyTtlDays(diffDays > 0 ? diffDays : 0);
    } else {
      setKeyTtlDays(0);
    }
    setCompactionMode(key.defaultCompactionMode === 'raw' ? 'raw' : 'auto');
  };

  const handleSelectKey = (id: string) => {
    setSelectedKeyId(id);
    const found = keys.find(k => k.id === id);
    if (found) loadKeySettings(found);
  };

  const handleToggleScope = (scopeId: string) => {
    if (scopeId === '*') {
      setAllowedScopes(['*']);
      return;
    }
    setAllowedScopes(prev => {
      const withoutAll = prev.filter(s => s !== '*');
      if (withoutAll.includes(scopeId)) {
        const next = withoutAll.filter(s => s !== scopeId);
        return next.length > 0 ? next : ['*'];
      }
      return [...withoutAll, scopeId];
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKeyId) return;

    setIsSaving(true);
    try {
      const parsedIps = ipAllowlist
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const res = await resilientFetch(`/api/keys/${selectedKeyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipWhitelist: parsedIps.length > 0 ? parsedIps : ['0.0.0.0/0'],
          scopes: allowedScopes,
          expiresInDays: keyTtlDays,
          defaultCompactionMode: compactionMode,
        })
      });

      if (res.data?.success) {
        setSavedSuccess(true);
        fetchKeys();
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch {} finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e]">
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
            <h1 className="text-2xl sm:text-3xl font-black text-white">API Key Security &amp; Scoped Permissions</h1>
            <p className="text-xs text-zinc-400">
              Lock down API keys with IP CIDR allowlists, granular capability scopes, and automatic expiry TTLs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>STRICT POLICY ENFORCEMENT</span>
            </span>
          </div>
        </div>

        <KeysSubNav />

        <AuthRequiredGate
          title="Sign In to Configure Key Permissions"
          description="IP CIDR allowlists, scoped capability policies, and auto-expiry guardrails are private to your workspace."
          checkoutAmount={25}
        >
          {savedSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Security policies and CIDR allowlists updated successfully!</span>
            </div>
          )}

          {keys.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-black/30 border border-dashed border-white/10 space-y-3">
              <Key className="w-8 h-8 text-zinc-500 mx-auto" />
              <p className="text-xs text-zinc-400">No active keys found. Mint an API key to configure security policies.</p>
              <Link href="/keys" className="inline-block px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">
                Mint Your First Key
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Key Selector */}
              <div className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs text-zinc-400 font-mono uppercase">Select Target API Key to Govern:</span>
                  <h3 className="text-base font-bold text-white">Configuring Scoped Security Policies</h3>
                </div>

                <select
                  value={selectedKeyId}
                  onChange={(e) => handleSelectKey(e.target.value)}
                  className="py-2.5 px-4 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  {keys.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.keyPrefix}... • {k.name} ({k.environment ? k.environment.toUpperCase() : 'LIVE'})
                    </option>
                  ))}
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
                      className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                    />
                    <span className="text-[11px] text-zinc-500 block font-sans">
                      Requests originating outside this CIDR range will be rejected with HTTP 403 Forbidden.
                    </span>
                  </div>
                </div>

                {/* Key Expiration / TTL */}
                <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                      Automatic Key Expiration (TTL)
                    </h3>
                    <p className="text-xs text-zinc-400">Enforce periodic key rotation policies for SOC2/ISO-27001 compliance.</p>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <select
                      value={keyTtlDays}
                      onChange={(e) => setKeyTtlDays(Number(e.target.value))}
                      className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value={0}>Never Expires (Production Default)</option>
                      <option value={1}>1 Day (Temporary CI/CD)</option>
                      <option value={7}>7 Days (Sprint / Testing)</option>
                      <option value={30}>30 Days (Monthly Rotation)</option>
                      <option value={90}>90 Days (Quarterly Audit)</option>
                      <option value={365}>365 Days (Annual Certificate)</option>
                    </select>
                    <span className="text-[11px] text-zinc-500 block font-sans">
                      Keys are automatically rendered invalid once their expiration timestamp elapses.
                    </span>
                  </div>
                </div>

                {/* Default Prompt Compaction Policy */}
                <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10 sm:col-span-2">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      Default Gateway Prompt Policy
                    </h3>
                    <p className="text-xs text-zinc-400">Configure how requests minted with this key are preprocessed by default.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCompactionMode('auto')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        compactionMode === 'auto'
                          ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                          : 'bg-black/30 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-cyan-400" />
                          <span>⚡ Compacted (Default)</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                          -64% Tokens
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Deflates repetitive conversation history and redundant turns for lower latency and cost.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCompactionMode('raw')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        compactionMode === 'raw'
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10'
                          : 'bg-black/30 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <FileCode className="w-3.5 h-3.5 text-amber-400" />
                          <span>📝 Raw Passthrough</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          100% Verbatim
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Recommended for Cursor, Windsurf, AST code diffing, and exact byte-for-byte fidelity.
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Scopes & Permissions Selector */}
              <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Granular Capability Scopes
                  </h3>
                  <p className="text-xs text-zinc-400">Limit this key's operational authority across platform services.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                  {availableScopes.map((s) => {
                    const isChecked = allowedScopes.includes(s.id) || (allowedScopes.includes('*') && s.id !== '*');
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleToggleScope(s.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          allowedScopes.includes(s.id)
                            ? 'bg-indigo-500/15 border-indigo-500/40 text-white'
                            : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={allowedScopes.includes(s.id)}
                          onChange={() => {}}
                          className="mt-1 accent-indigo-500"
                        />
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs">{s.label}</div>
                          <div className="text-[11px] text-zinc-500 font-sans">{s.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4 text-black" />
                  <span>{isSaving ? 'Saving Policies...' : 'Save Security Policies'}</span>
                </button>
              </div>
            </form>
          )}
        </AuthRequiredGate>
      </main>
    </div>
  );
}
