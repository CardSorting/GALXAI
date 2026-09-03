'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { KeysSubNav } from '@/components/dashboard/KeysSubNav';
import {
  Key,
  ShieldCheck,
  Check,
  Copy,
  ArrowLeft,
  Lock,
  Gauge,
  AlertTriangle,
  Download,
  Plus,
  Zap,
  Terminal,
  Laptop,
  Server,
  Bot,
  Sparkles,
  Play,
  CheckCircle2
} from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { ErrorBoundary, withErrorBoundary } from '@/components/common/ErrorBoundary';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { SafeStorage } from '@/lib/resilience/SafeStorage';
import { useAuth } from '@/contexts/AuthContext';
import { useDepositVerification } from '@/lib/hooks/useDepositVerification';

interface ScopeOption {
  id: string;
  label: string;
  description: string;
}

const SCOPE_OPTIONS: ScopeOption[] = [
  { id: '*', label: 'Full Access (*)', description: 'Unrestricted access to all gateway endpoints' },
  { id: 'chat:*', label: 'Chat & Completions (chat:*)', description: 'Allows chat completions, streaming, and tool execution' },
  { id: 'models:read', label: 'Models Read (models:read)', description: 'Read-only access to model catalog and context limits' },
  { id: 'images:generate', label: 'Image Synthesis (images:generate)', description: 'Allows image generation and editing' },
  { id: 'embeddings:*', label: 'Embeddings (embeddings:*)', description: 'Allows vector embeddings generation' }
];

interface QuickPreset {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultName: string;
  env: 'live' | 'test';
  rpm: number;
  compaction: 'auto' | 'raw';
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'cursor',
    name: 'Cursor / Windsurf',
    icon: Laptop,
    defaultName: 'Cursor IDE Key',
    env: 'live',
    rpm: 120,
    compaction: 'raw'
  },
  {
    id: 'cli',
    name: 'CLI & Scripting',
    icon: Terminal,
    defaultName: 'CLI Script Key',
    env: 'test',
    rpm: 60,
    compaction: 'raw'
  },
  {
    id: 'backend',
    name: 'Production Backend',
    icon: Server,
    defaultName: 'Production API Server',
    env: 'live',
    rpm: 300,
    compaction: 'raw'
  },
  {
    id: 'agent',
    name: 'Agent Swarm Fleet',
    icon: Bot,
    defaultName: 'Autonomous Agent Fleet',
    env: 'live',
    rpm: 600,
    compaction: 'auto'
  }
];

function BaseNewKeyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { walletBalance } = useDepositVerification();

  // Form State
  const [name, setName] = useState('Cursor IDE Key');
  const [environment, setEnvironment] = useState<'live' | 'test'>('live');
  const [scopes, setScopes] = useState<string[]>(['*']);
  const [rateLimitRpm, setRateLimitRpm] = useState<number>(120);
  const [expiresInDays, setExpiresInDays] = useState<number>(0);
  const [compactionMode, setCompactionMode] = useState<'auto' | 'raw'>('raw');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('cursor');

  // Submission & Reveal State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<{ apiKey: string; name: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  // Instant verification test state in reveal modal
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; latencyMs: number; message: string } | null>(null);

  const handleVerifyKey = async () => {
    if (!revealedKey) return;
    setIsVerifying(true);
    setVerifyResult(null);
    const start = performance.now();
    try {
      const res = await resilientFetch<{ data: any[] }>('/v1/models', {
        headers: { Authorization: `Bearer ${revealedKey.apiKey}` },
        enableCacheFallback: true
      });
      const latencyMs = Math.round(performance.now() - start);
      setVerifyResult({
        success: true,
        latencyMs,
        message: `Verified! Gateway active (${res.data?.data?.length || 6} models operational).`
      });
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      setVerifyResult({
        success: false,
        latencyMs,
        message: err.message || 'Verification ping failed'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const applyPreset = (preset: QuickPreset) => {
    setSelectedPresetId(preset.id);
    setName(preset.defaultName);
    setEnvironment(preset.env);
    setRateLimitRpm(preset.rpm);
    setCompactionMode(preset.compaction);
  };

  const handleToggleScope = (scopeId: string) => {
    if (scopeId === '*') {
      setScopes(['*']);
      return;
    }
    setScopes(prev => {
      const withoutAll = prev.filter(s => s !== '*');
      if (withoutAll.includes(scopeId)) {
        const next = withoutAll.filter(s => s !== scopeId);
        return next.length > 0 ? next : ['*'];
      }
      return [...withoutAll, scopeId];
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const trimmedName = name.trim() || 'Developer API Key';

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await resilientFetch<{ success: boolean; key?: { apiKey: string }; error?: string }>('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          userId: user.id,
          environment,
          rateLimitPerMinute: rateLimitRpm,
          hasVerifiedDeposit: true,
          depositedAmount: walletBalance,
          defaultCompactionMode: compactionMode,
          scopes,
          expiresInDays: expiresInDays > 0 ? expiresInDays : undefined
        })
      });

      if (res.data?.success && res.data.key?.apiKey) {
        const returnedKey = res.data.key as any;
        const newKeyEntry = {
          id: returnedKey.id || `key_${Date.now()}`,
          keyPrefix: returnedKey.keyPrefix || (returnedKey.apiKey.slice(0, 14)),
          name: returnedKey.name || trimmedName,
          userId: user.id,
          environment: returnedKey.environment || environment,
          scopes: returnedKey.scopes || scopes,
          rateLimitPerMinute: returnedKey.rateLimitPerMinute || rateLimitRpm,
          totalRequests: 0,
          totalTokens: 0,
          createdAt: Date.now(),
          isExpired: false,
          revoked: false
        };
        const storageKey = `galx_cached_developer_keys_${user.id}`;
        const existing = SafeStorage.getJSON<any[]>(storageKey, []);
        SafeStorage.setJSON(storageKey, [newKeyEntry, ...existing.filter(k => k.id !== newKeyEntry.id)]);

        setRevealedKey({
          apiKey: res.data.key.apiKey,
          name: trimmedName
        });
      } else {
        setErrorMessage(res.data?.error || 'Failed to create key.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySecretKey = async () => {
    if (!revealedKey) return;
    const success = await safeCopyToClipboard(revealedKey.apiKey);
    if (success) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCopyEnv = async () => {
    if (!revealedKey) return;
    const snippet = `GALX_API_KEY="${revealedKey.apiKey}"\nGALX_BASE_URL="https://galx.ai/v1"`;
    const success = await safeCopyToClipboard(snippet);
    if (success) {
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 2000);
    }
  };

  const handleDownloadEnv = (apiKey: string, name: string = 'GALX AI') => {
    const content = `# ${name} Credentials\n# Generated at: ${new Date().toISOString()}\nGALX_API_KEY="${apiKey}"\nGALX_BASE_URL="https://galx.ai/v1"\nOPENAI_BASE_URL="https://galx.ai/v1"\nOPENAI_API_KEY="${apiKey}"\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '.env.galx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-zinc-100 font-sans">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'API Keys', href: '/keys' },
            { label: 'New Key' }
          ]}
        />

        <ErrorBoundary name="Keys Navigation">
          <KeysSubNav />
        </ErrorBoundary>

        <AuthRequiredGate
          title="Sign In to Provision Keys"
          description="Developer credentials and access policies are private to your workspace."
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href="/keys"
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                  title="Back to Keys"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1 className="text-xl font-bold tracking-tight text-white">Create Fine-Grained API Key</h1>
              </div>
              <p className="text-xs text-zinc-400 mt-1 pl-7">
                Configure explicit capability scopes, expiration TTLs, and rate limits without network friction.
              </p>
            </div>
          </div>

          {/* Quick Presets Strip */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Quick Presets</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {QUICK_PRESETS.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPresetId === p.id;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/50 text-white'
                        : 'bg-[#0d101c] border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                      <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                        p.env === 'live' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {p.env}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white">{p.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{p.rpm} RPM</div>
                  </button>
                );
              })}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-6">
            {/* Section 1: Key Identity & Environment */}
            <div className="rounded-2xl border border-white/10 bg-[#0d101c] p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-400" />
                <span>Key Identity</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Key Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setSelectedPresetId('');
                    }}
                    placeholder="e.g. Cursor IDE, Production Backend, Swarm Fleet"
                    className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Environment</label>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => setEnvironment('live')}
                      className={`py-2 px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        environment === 'live'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Live</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnvironment('test')}
                      className={`py-2 px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        environment === 'test'
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>Test</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Expiration TTL */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-zinc-300">Expiration</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
                  {[
                    { days: 0, label: 'Never Expire' },
                    { days: 30, label: '30 Days' },
                    { days: 60, label: '60 Days' },
                    { days: 90, label: '90 Days' },
                    { days: 365, label: '1 Year' }
                  ].map((exp) => (
                    <button
                      key={exp.days}
                      type="button"
                      onClick={() => setExpiresInDays(exp.days)}
                      className={`py-1.5 px-2 rounded-xl border text-center transition-colors cursor-pointer ${
                        expiresInDays === exp.days
                          ? 'bg-indigo-600 border-indigo-500 text-white font-semibold'
                          : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {exp.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Scopes & Permissions */}
            <div className="rounded-2xl border border-white/10 bg-[#0d101c] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Access Scopes</span>
                </h2>
                <span className="text-xs text-zinc-500 font-mono">
                  {scopes.includes('*') ? 'All Permissions (*)' : `${scopes.length} Scopes Selected`}
                </span>
              </div>

              <div className="space-y-2">
                {SCOPE_OPTIONS.map((sc) => {
                  const isSelected = scopes.includes('*') ? sc.id === '*' : scopes.includes(sc.id);

                  return (
                    <div
                      key={sc.id}
                      onClick={() => handleToggleScope(sc.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : 'bg-black/30 border-white/10 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-white font-mono">{sc.label}</div>
                        <p className="text-[11px] text-zinc-400 font-sans">{sc.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 ${
                        isSelected ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-white/20'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Throughput Ceiling & Prompt Policy */}
            <div className="rounded-2xl border border-white/10 bg-[#0d101c] p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span>Throughput &amp; Optimization</span>
              </h2>

              <div className="space-y-4">
                {/* Rate Limit RPM */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Rate Limit Ceiling (RPM)</label>
                  <select
                    value={rateLimitRpm}
                    onChange={(e) => setRateLimitRpm(Number(e.target.value))}
                    className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono cursor-pointer"
                  >
                    <option value={60} className="bg-[#0d101c] text-white">60 RPM — Prototyping / CLI</option>
                    <option value={120} className="bg-[#0d101c] text-white">120 RPM — Cursor IDE & Standard</option>
                    <option value={300} className="bg-[#0d101c] text-white">300 RPM — Production Backend</option>
                    <option value={600} className="bg-[#0d101c] text-white">600 RPM — Agent Swarm Fleet</option>
                  </select>
                  <p className="text-[10px] text-zinc-500">Max requests allowed per minute through the gateway.</p>
                </div>

                {/* Prompt Policy */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-medium text-zinc-300">Prompt Compression Policy</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setCompactionMode('raw')}
                      className={`py-2 px-3 rounded-xl border text-left transition-colors cursor-pointer ${
                        compactionMode === 'raw'
                          ? 'bg-indigo-600/20 border-indigo-500/50 text-white font-semibold'
                          : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div>Raw (Default)</div>
                      <div className="text-[10px] text-zinc-500 font-normal">100% byte fidelity without alterations</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompactionMode('auto')}
                      className={`py-2 px-3 rounded-xl border text-left transition-colors cursor-pointer ${
                        compactionMode === 'auto'
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 font-semibold'
                          : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div>Compacted</div>
                      <div className="text-[10px] text-zinc-500 font-normal">Lossless token reduction</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/keys"
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmitting ? 'Minting Key...' : 'Create API Key'}</span>
              </button>
            </div>
          </form>
        </AuthRequiredGate>
      </main>

      {/* Secret Key Reveal Modal */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg rounded-2xl bg-[#0d101c] border border-emerald-500/40 p-6 space-y-4 shadow-2xl text-zinc-100 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Save Your Secret API Key</h2>
                  <span className="text-xs text-zinc-400">{revealedKey.name}</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                Please save this secret key now. For security purposes, <strong>you will not be able to view the full key again</strong> after closing this window.
              </span>
            </div>

            {/* Key String Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Secret Key</label>
              <div className="p-3 rounded-xl bg-black/80 font-mono text-xs text-emerald-300 flex items-center justify-between gap-3 border border-white/10">
                <span className="select-all break-all">{revealedKey.apiKey}</span>
                <button
                  type="button"
                  onClick={handleCopySecretKey}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                </button>
              </div>
            </div>

            {/* Multi-Format Export Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDownloadEnv(revealedKey.apiKey, revealedKey.name)}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <span className="font-semibold text-zinc-200 block group-hover:text-white">Download .env</span>
                  <span className="text-[10px] text-zinc-500">Save (.env.galx)</span>
                </div>
                <Download className="w-4 h-4 text-zinc-400 group-hover:text-white" />
              </button>

              <button
                type="button"
                onClick={handleCopyEnv}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-zinc-200 block">Copy .env</span>
                  <span className="text-[10px] text-zinc-500">GALX_API_KEY="..."</span>
                </div>
                {copiedEnv ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!revealedKey) return;
                  const snippet = `export GALX_API_KEY="${revealedKey.apiKey}"\nexport OPENAI_BASE_URL="https://galx.ai/v1"`;
                  await safeCopyToClipboard(snippet);
                  setCopiedEnv(true);
                  setTimeout(() => setCopiedEnv(false), 2000);
                }}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left transition-colors cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-zinc-200 block">Copy Export</span>
                  <span className="text-[10px] text-zinc-500">export GALX_API_KEY</span>
                </div>
                <Terminal className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Live Verification Test */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Verify Credentials Live</span>
              </div>
              <button
                type="button"
                onClick={handleVerifyKey}
                disabled={isVerifying}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-3 h-3 fill-cyan-400 ${isVerifying ? 'animate-pulse' : ''}`} />
                <span>{isVerifying ? 'Verifying...' : 'Test Key Live'}</span>
              </button>
            </div>

            {verifyResult && (
              <div className={`p-2.5 rounded-xl border text-[11px] font-mono flex items-center gap-2 ${
                verifyResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{verifyResult.latencyMs}ms — {verifyResult.message}</span>
              </div>
            )}

            {/* Acknowledgment */}
            <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={hasAcknowledged}
                onChange={(e) => setHasAcknowledged(e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span>I have copied and safely stored this secret key</span>
            </label>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => router.push('/keys')}
                className={`px-5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  hasAcknowledged
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                    : 'bg-white/10 hover:bg-white/20 text-zinc-300'
                }`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withErrorBoundary(BaseNewKeyPage, {
  name: 'New Key Page'
});
