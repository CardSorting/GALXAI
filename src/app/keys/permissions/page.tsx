'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { KeysSubNav } from '@/components/dashboard/KeysSubNav';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  Check,
  Key,
  Save,
  Zap,
  FileCode,
  Layers,
  Sparkles
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { ErrorBoundary, withErrorBoundary } from '@/components/common/ErrorBoundary';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { SafeStorage } from '@/lib/resilience/SafeStorage';
import { useAuth } from '@/contexts/AuthContext';

const AVAILABLE_SCOPES = [
  { id: '*', label: 'Full Root Access (*)', desc: 'Unrestricted completions, models, images, and embeddings' },
  { id: 'chat:*', label: 'Chat & Completions (chat:*)', desc: 'Allows chat completions, streaming, and tool execution' },
  { id: 'models:read', label: 'Models Read (models:read)', desc: 'Allows querying model catalogs and context limits' },
  { id: 'images:generate', label: 'Image Synthesis (images:generate)', desc: 'Allows GALX Nova-image generation calls' },
  { id: 'embeddings:*', label: 'Embeddings (embeddings:*)', desc: 'Allows vector embeddings generation' }
];

function BaseKeyPermissionsPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [allowedScopes, setAllowedScopes] = useState<string[]>(['*']);
  const [keyTtlDays, setKeyTtlDays] = useState<number>(0);
  const [compactionMode, setCompactionMode] = useState<'auto' | 'raw'>('raw');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const getStorageKey = (uid: string) => `galx_cached_developer_keys_${uid}`;

  const fetchKeys = async () => {
    if (!user?.id) {
      setKeys([]);
      return;
    }
    try {
      const res = await resilientFetch<{ keys: any[] }>(`/api/keys?userId=${encodeURIComponent(user.id)}`, { enableCacheFallback: true });
      const activeKeys = res.data?.keys?.filter(k => !k.revoked) || [];
      setKeys(activeKeys);
      if (res.data?.keys) {
        SafeStorage.setJSON(getStorageKey(user.id), res.data.keys);
      }
      if (activeKeys.length > 0 && !selectedKeyId) {
        setSelectedKeyId(activeKeys[0].id);
        loadKeySettings(activeKeys[0]);
      }
    } catch {}
  };

  useEffect(() => {
    if (user?.id) {
      const cached = SafeStorage.getJSON<any[]>(getStorageKey(user.id), []);
      const active = cached.filter(k => !k.revoked);
      if (active.length > 0) {
        setKeys(active);
        setSelectedKeyId(prev => prev || active[0].id);
        loadKeySettings(active[0]);
      }
      fetchKeys();
    }
  }, [user?.id]);

  const loadKeySettings = (key: any) => {
    if (!key) return;
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
      const res = await resilientFetch(`/api/keys/${selectedKeyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
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

  const selectedKey = keys.find(k => k.id === selectedKeyId);

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-zinc-100 font-sans">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'API Keys', href: '/keys' },
            { label: 'Scopes & Policies' }
          ]}
        />

        <ErrorBoundary name="Keys Navigation">
          <KeysSubNav />
        </ErrorBoundary>

        <AuthRequiredGate
          title="Sign In to Configure Key Policies"
          description="Scoped capability policies, token optimization, and auto-expiry guardrails are private to your workspace."
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Scopes &amp; Access Policies</h1>
              <p className="text-xs text-zinc-400 mt-1">
                Configure capability scopes, automatic expiration TTLs, and token optimization per key.
              </p>
            </div>
          </div>

          {savedSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Scopes and expiration policies updated successfully!</span>
            </div>
          )}

          {keys.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl bg-[#0d101c] border border-white/10 space-y-3">
              <Key className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-300">No active keys found</p>
              <p className="text-xs text-zinc-500">Create an API key to configure scoped capabilities and auto-rotation.</p>
              <Link href="/keys" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors">
                Create API Key
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Key Selector Bar */}
              <div className="p-4 rounded-2xl border border-white/10 bg-[#0d101c] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-zinc-400 font-mono uppercase">Target Key:</span>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>{selectedKey?.name || 'Selected Key'}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      selectedKey?.environment === 'live' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {selectedKey?.environment?.toUpperCase() || 'LIVE'}
                    </span>
                  </h3>
                </div>

                <select
                  value={selectedKeyId}
                  onChange={(e) => handleSelectKey(e.target.value)}
                  className="py-2 px-3 rounded-xl bg-black/50 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {keys.map((k) => (
                    <option key={k.id} value={k.id} className="bg-[#0d101c] text-white">
                      {k.keyPrefix || k.prefix}... • {k.name} ({k.environment ? k.environment.toUpperCase() : 'LIVE'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Scopes & Permissions Selector */}
              <div className="p-5 rounded-2xl border border-white/10 bg-[#0d101c] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span>Granular Capability Scopes</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Limit this key's operational authority across platform endpoints.</p>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">
                    {allowedScopes.includes('*') ? 'Full Access (*)' : `${allowedScopes.length} Scopes Active`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                  {AVAILABLE_SCOPES.map((s) => {
                    const isChecked = allowedScopes.includes('*') ? s.id === '*' : allowedScopes.includes(s.id);

                    return (
                      <div
                        key={s.id}
                        onClick={() => handleToggleScope(s.id)}
                        className={`p-3 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                            : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border shrink-0 ${
                          isChecked ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-white/20'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-semibold text-xs text-white">{s.label}</div>
                          <div className="text-[11px] text-zinc-500 font-sans">{s.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expiration & Compaction Policy Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Key Expiration / TTL */}
                <div className="p-5 rounded-2xl border border-white/10 bg-[#0d101c] space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>Automatic Key Expiration (TTL)</span>
                    </h3>
                    <p className="text-xs text-zinc-400">Enforce periodic key rotation policies for compliance.</p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <select
                      value={keyTtlDays}
                      onChange={(e) => setKeyTtlDays(Number(e.target.value))}
                      className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-white focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
                    >
                      <option value={0} className="bg-[#0d101c] text-white">Never Expires (Default)</option>
                      <option value={1} className="bg-[#0d101c] text-white">1 Day (Temporary CI/CD)</option>
                      <option value={7} className="bg-[#0d101c] text-white">7 Days (Sprint / Testing)</option>
                      <option value={30} className="bg-[#0d101c] text-white">30 Days (Monthly Rotation)</option>
                      <option value={90} className="bg-[#0d101c] text-white">90 Days (Quarterly Audit)</option>
                      <option value={365} className="bg-[#0d101c] text-white">365 Days (Annual Certificate)</option>
                    </select>
                    <span className="text-[11px] text-zinc-500 block font-sans">
                      Keys are automatically rendered invalid once their expiration timestamp elapses.
                    </span>
                  </div>
                </div>

                {/* Default Prompt Compaction Policy */}
                <div className="p-5 rounded-2xl border border-white/10 bg-[#0d101c] space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-indigo-400" />
                      <span>Default Prompt Policy</span>
                    </h3>
                    <p className="text-xs text-zinc-400">Configure default preprocessing for requests using this key.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setCompactionMode('raw')}
                      className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                        compactionMode === 'raw'
                          ? 'bg-indigo-600/20 border-indigo-500/50 text-white font-semibold'
                          : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="font-semibold text-white">Raw (Default)</div>
                      <div className="text-[10px] text-zinc-500 font-normal mt-0.5">100% byte fidelity</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCompactionMode('auto')}
                      className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                        compactionMode === 'auto'
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 font-semibold'
                          : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="font-semibold text-white">Compacted</div>
                      <div className="text-[10px] text-zinc-500 font-normal mt-0.5">-64% token reduction</div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Access Policies'}</span>
                </button>
              </div>
            </form>
          )}
        </AuthRequiredGate>
      </main>
    </div>
  );
}

export default withErrorBoundary(BaseKeyPermissionsPage, {
  name: 'Key Permissions Page'
});
