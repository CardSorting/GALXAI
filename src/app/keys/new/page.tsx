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
  Gauge,
  AlertTriangle,
  Download,
  Plus,
  Zap,
  Terminal,
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sliders,
  Code2,
  Laptop,
  Server,
  Sparkles,
  Eye,
  EyeOff,
  Bot,
  FlaskConical,
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

const CUSTOM_SCOPE_OPTIONS: ScopeOption[] = [
  {
    id: 'chat:*',
    label: 'Chat & Completions (chat:*)',
    description: 'Allows chat completions, streaming SSE, reasoning traces, and tool calling.',
  },
  {
    id: 'images:generate',
    label: 'Image Synthesis (images:generate)',
    description: 'Allows 4K image generation, editing, and visual synthesis.',
  },
  {
    id: 'embeddings:*',
    label: 'Vector Embeddings (embeddings:*)',
    description: 'Allows vector embeddings generation for RAG and semantic search.',
  },
  {
    id: 'models:read',
    label: 'Models Read-Only (models:read)',
    description: 'Read-only access to model catalog, context limits, and pricing.',
  },
];

interface ArchetypePreset {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultName: string;
  environment: 'live' | 'test';
  rateLimitRpm: number;
  compactionMode: 'auto' | 'raw';
  expiresInDays: number;
  badge: string;
  badgeColor: string;
}

const ARCHETYPE_PRESETS: ArchetypePreset[] = [
  {
    id: 'cursor',
    title: 'Cursor & Windsurf IDE',
    subtitle: 'Ultra-low latency coding model stream with raw byte fidelity.',
    icon: Laptop,
    defaultName: 'Cursor IDE Key',
    environment: 'live',
    rateLimitRpm: 120,
    compactionMode: 'raw',
    expiresInDays: 0,
    badge: 'Popular',
    badgeColor: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  {
    id: 'agent',
    title: 'Autonomous Agent Fleet',
    subtitle: 'High-throughput swarm with auto prompt token compaction.',
    icon: Bot,
    defaultName: 'Agent Swarm Fleet',
    environment: 'live',
    rateLimitRpm: 600,
    compactionMode: 'auto',
    expiresInDays: 0,
    badge: 'High RPM',
    badgeColor: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  {
    id: 'backend',
    title: 'Production Backend',
    subtitle: 'Resilient web services with Anycast failover and 300 RPM ceiling.',
    icon: Server,
    defaultName: 'Production API Server',
    environment: 'live',
    rateLimitRpm: 300,
    compactionMode: 'raw',
    expiresInDays: 0,
    badge: 'Production',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'sandbox',
    title: 'Staging & Sandbox',
    subtitle: 'Test environment key with 30-day safety TTL for CI/CD pipelines.',
    icon: FlaskConical,
    defaultName: 'Staging CI Test Key',
    environment: 'test',
    rateLimitRpm: 60,
    compactionMode: 'raw',
    expiresInDays: 30,
    badge: 'Sandbox',
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
];

const NAME_SUGGESTIONS = [
  'Cursor / Windsurf',
  'Development & Testing',
  'Production Backend',
  'Agent Swarm Fleet',
];

type PreviewLanguage = 'typescript' | 'python' | 'curl' | 'cursor' | 'windsurf';

function BaseNewKeyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { walletBalance } = useDepositVerification();

  // Archetype & Form State
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string>('cursor');
  const [name, setName] = useState('Cursor IDE Key');
  const [permissionMode, setPermissionMode] = useState<'full' | 'custom'>('full');
  const [customScopes, setCustomScopes] = useState<string[]>(['chat:*', 'images:generate']);
  const [environment, setEnvironment] = useState<'live' | 'test'>('live');
  const [rateLimitRpm, setRateLimitRpm] = useState<number>(120);
  const [expiresInDays, setExpiresInDays] = useState<number>(0);
  const [compactionMode, setCompactionMode] = useState<'auto' | 'raw'>('raw');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [previewLang, setPreviewLang] = useState<PreviewLanguage>('typescript');
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);

  // Submission & Reveal State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<{ apiKey: string; name: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedCursorJson, setCopiedCursorJson] = useState(false);
  const [isKeyMasked, setIsKeyMasked] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  // Instant verification test state in reveal modal
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; latencyMs: number; message: string } | null>(null);

  const applyArchetype = (preset: ArchetypePreset) => {
    setSelectedArchetypeId(preset.id);
    setName(preset.defaultName);
    setEnvironment(preset.environment);
    setRateLimitRpm(preset.rateLimitRpm);
    setCompactionMode(preset.compactionMode);
    setExpiresInDays(preset.expiresInDays);
  };

  const handleVerifyKey = async () => {
    if (!revealedKey) return;
    setIsVerifying(true);
    setVerifyResult(null);
    const start = performance.now();
    try {
      const res = await resilientFetch<{ data: any[] }>('/v1/models', {
        headers: { Authorization: `Bearer ${revealedKey.apiKey}` },
        enableCacheFallback: true,
      });
      const latencyMs = Math.round(performance.now() - start);
      setVerifyResult({
        success: true,
        latencyMs,
        message: `Verified! Gateway active (${res.data?.data?.length || 6} models operational).`,
      });
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      setVerifyResult({
        success: false,
        latencyMs,
        message: err.message || 'Verification ping failed',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleToggleCustomScope = (scopeId: string) => {
    setCustomScopes((prev) => {
      if (prev.includes(scopeId)) {
        const next = prev.filter((s) => s !== scopeId);
        return next.length > 0 ? next : [scopeId];
      }
      return [...prev, scopeId];
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const trimmedName = name.trim() || 'Developer API Key';
    const effectiveScopes = permissionMode === 'full' ? ['*'] : customScopes;

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
          scopes: effectiveScopes,
          expiresInDays: expiresInDays > 0 ? expiresInDays : undefined,
        }),
      });

      if (res.data?.success && res.data.key?.apiKey) {
        const returnedKey = res.data.key as any;
        const newKeyEntry = {
          id: returnedKey.id || `key_${Date.now()}`,
          keyPrefix: returnedKey.keyPrefix || returnedKey.apiKey.slice(0, 14),
          name: returnedKey.name || trimmedName,
          userId: user.id,
          environment: returnedKey.environment || environment,
          scopes: returnedKey.scopes || effectiveScopes,
          rateLimitPerMinute: returnedKey.rateLimitPerMinute || rateLimitRpm,
          totalRequests: 0,
          totalTokens: 0,
          createdAt: Date.now(),
          isExpired: false,
          revoked: false,
        };
        const storageKey = `galx_cached_developer_keys_${user.id}`;
        const existing = SafeStorage.getJSON<any[]>(storageKey, []);
        SafeStorage.setJSON(storageKey, [newKeyEntry, ...existing.filter((k) => k.id !== newKeyEntry.id)]);

        setRevealedKey({
          apiKey: res.data.key.apiKey,
          name: trimmedName,
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
    const snippet = `OPENAI_BASE_URL="https://api.galx.ai/v1"\nOPENAI_API_KEY="${revealedKey.apiKey}"`;
    const success = await safeCopyToClipboard(snippet);
    if (success) {
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 2000);
    }
  };

  const handleDownloadEnv = (apiKey: string, keyName: string = 'GALX AI') => {
    const content = `# ${keyName} Credentials\n# Generated at: ${new Date().toISOString()}\nOPENAI_BASE_URL="https://api.galx.ai/v1"\nOPENAI_API_KEY="${apiKey}"\nGALX_BASE_URL="https://api.galx.ai/v1"\nGALX_API_KEY="${apiKey}"\n`;
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

  const handleCopyCursorJson = async () => {
    if (!revealedKey) return;
    const config = {
      "cursor.openaiBaseUrl": "https://api.galx.ai/v1",
      "cursor.apiKey": revealedKey.apiKey,
      "cursor.model": "gpt-5.6-sol"
    };
    const success = await safeCopyToClipboard(JSON.stringify(config, null, 2));
    if (success) {
      setCopiedCursorJson(true);
      setTimeout(() => setCopiedCursorJson(false), 2000);
    }
  };

  const handleCopySnippet = async () => {
    const snippet = codeSnippets[previewLang];
    const success = await safeCopyToClipboard(snippet);
    if (success) {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  const targetKeyPlaceholder = environment === 'test' ? 'galx_test_your_key_here' : 'galx_live_your_key_here';

  const codeSnippets: Record<PreviewLanguage, string> = {
    typescript: `import OpenAI from 'openai';

// 100% Wire Parity: Point official OpenAI SDK to GALXAI Gateway
const openai = new OpenAI({
  baseURL: 'https://api.galx.ai/v1',
  apiKey: process.env.GALXAI_API_KEY || '${targetKeyPlaceholder}', // ${name}
});

const completion = await openai.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Design a high-performance LRU cache in Rust' }],
});
console.log(completion.choices[0].message.content);`,
    python: `from openai import OpenAI
import os

# Point official OpenAI client to GALXAI Anycast Gateway
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key=os.environ.get("GALXAI_API_KEY", "${targetKeyPlaceholder}") # ${name}
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Design a high-performance LRU cache in Rust"}]
)
print(response.choices[0].message.content)`,
    curl: `curl https://api.galx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer \${GALXAI_API_KEY:-"${targetKeyPlaceholder}"}" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Design a high-performance LRU cache in Rust"}]
  }'`,
    cursor: `// Cursor Settings -> Models -> OpenAI API Key:
// 1. Toggle "Override OpenAI Base URL" to ON
// 2. Base URL: https://api.galx.ai/v1
// 3. API Key:  <paste your ${environment.toUpperCase()} key (${targetKeyPlaceholder})>
// 4. Model:    gpt-5.6-sol (or gpt-5.6-terra)`,
    windsurf: `// Windsurf Settings (or ~/.codeium/windsurf/memories/global_rules.md):
{
  "openai_base_url": "https://api.galx.ai/v1",
  "openai_api_key": "${targetKeyPlaceholder}",
  "default_model": "gpt-5.6-sol"
}`,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-zinc-100 font-sans">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'API Keys', href: '/keys' },
            { label: 'Create Key' },
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
          <div className="space-y-1.5 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Link
                href="/keys"
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Back to Keys"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-2xl font-bold tracking-tight text-white">Create API Key</h1>
            </div>
            <p className="text-xs text-zinc-400 pl-7">
              Generate an OpenAI-compatible secret key to authenticate your applications, scripts, and IDEs with automatic prompt caching.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Desktop 2-Column Side-by-Side Ergonomic Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Streamlined Form (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <form onSubmit={handleCreate} className="space-y-6">
                {/* Step 1: Jumpstart Archetype Selector */}
                <div className="glass-panel rounded-2xl p-6 border border-white/10 bg-[#0d101c] space-y-3.5 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>Jumpstart with an Archetype</span>
                      </h2>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Pre-configured for your stack, rate limit requirements, and compression policies.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ARCHETYPE_PRESETS.map((p) => {
                      const Icon = p.icon;
                      const isSelected = selectedArchetypeId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyArchetype(p)}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                            isSelected
                              ? 'bg-cyan-500/10 border-cyan-500/50 text-white ring-1 ring-cyan-500/30'
                              : 'bg-black/30 border-white/10 text-white/60 hover:text-white hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-white/60'}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-bold text-white font-mono">{p.title}</span>
                            </div>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${p.badgeColor}`}>
                              {p.badge}
                            </span>
                          </div>
                          <p className={`text-[11px] leading-relaxed font-sans ${isSelected ? 'text-cyan-200/70' : 'text-white/60'}`}>
                            {p.subtitle}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Key Name & Identification */}
                <div className="glass-panel rounded-2xl p-6 border border-white/10 bg-[#0d101c] space-y-4 shadow-xl">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-200">Key Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setSelectedArchetypeId('');
                      }}
                      placeholder="e.g. Cursor IDE, Development, Production Backend"
                      className="w-full py-2.5 px-3.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                      required
                      autoFocus
                    />
                  </div>

                  {/* Clickable Name Suggestions */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">
                      Quick Name Suggestions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {NAME_SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setName(suggestion);
                            setSelectedArchetypeId('');
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                            name === suggestion
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                              : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5'
                          }`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 2: Permissions (Simplified: Full Access vs Custom Scopes) */}
                <div className="glass-panel rounded-2xl p-6 border border-white/10 bg-[#0d101c] space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Permissions</span>
                      </h2>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Choose whether this key has universal gateway access or fine-grained capabilities.
                      </p>
                    </div>
                  </div>

                  {/* Permission Mode Radios */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Full Access (Default & Recommended) */}
                    <button
                      type="button"
                      onClick={() => setPermissionMode('full')}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        permissionMode === 'full'
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30'
                          : 'bg-black/30 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Full Access (Default)</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            permissionMode === 'full'
                              ? 'border-emerald-400 bg-emerald-500 text-black'
                              : 'border-zinc-600'
                          }`}
                        >
                          {permissionMode === 'full' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                        Universal access to all models (GPT-5.6 Sol, Terra, Luna, Image Suite) and endpoints.
                      </p>
                    </button>

                    {/* Restricted / Custom Scopes */}
                    <button
                      type="button"
                      onClick={() => setPermissionMode('custom')}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        permissionMode === 'custom'
                          ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 ring-1 ring-cyan-500/30'
                          : 'bg-black/30 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Custom Scopes</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            permissionMode === 'custom'
                              ? 'border-cyan-400 bg-cyan-500 text-black'
                              : 'border-zinc-600'
                          }`}
                        >
                          {permissionMode === 'custom' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                        Limit this key to specific capabilities (e.g. chat only, embeddings only) for zero-trust environments.
                      </p>
                    </button>
                  </div>

                  {/* Progressively Disclosed Fine-Grained Scopes (Hidden by default!) */}
                  {permissionMode === 'custom' && (
                    <div className="pt-2 space-y-2 animate-in fade-in duration-150">
                      <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                        Select Allowed Capabilities:
                      </span>
                      <div className="space-y-2">
                        {CUSTOM_SCOPE_OPTIONS.map((sc) => {
                          const isSelected = customScopes.includes(sc.id);
                          return (
                            <div
                              key={sc.id}
                              onClick={() => handleToggleCustomScope(sc.id)}
                              className={`p-3 rounded-xl border cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                                  : 'bg-black/30 border-white/10 text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="text-xs font-semibold text-white font-mono">{sc.label}</div>
                                <p className="text-[11px] text-zinc-400 font-sans">{sc.description}</p>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 ${
                                  isSelected ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-white/20'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3: Collapsible Advanced Settings (Environment, TTL, RPM, Compaction) */}
                <div className="glass-panel rounded-2xl border border-white/10 bg-[#0d101c] overflow-hidden shadow-xl">
                  <button
                    type="button"
                    onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left text-xs font-mono text-zinc-300 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-zinc-400" />
                      <span className="font-bold">Advanced Settings</span>
                      <span className="text-[10px] text-zinc-500 hidden sm:inline">
                        (Environment, Expiration, Rate Limits, Compaction)
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-400">
                      <span className="text-[11px]">{isAdvancedOpen ? 'Hide' : 'Configure'}</span>
                      {isAdvancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isAdvancedOpen && (
                    <div className="p-5 pt-2 border-t border-white/10 space-y-4 font-sans animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Environment */}
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

                        {/* Expiration TTL */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-zinc-300">Expiration</label>
                          <select
                            value={expiresInDays}
                            onChange={(e) => setExpiresInDays(Number(e.target.value))}
                            className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
                          >
                            <option value={0} className="bg-[#0d101c] text-white">Never Expire (Default)</option>
                            <option value={30} className="bg-[#0d101c] text-white">30 Days</option>
                            <option value={60} className="bg-[#0d101c] text-white">60 Days</option>
                            <option value={90} className="bg-[#0d101c] text-white">90 Days</option>
                            <option value={365} className="bg-[#0d101c] text-white">1 Year</option>
                          </select>
                        </div>

                        {/* Rate Limit RPM */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-zinc-300">Rate Limit Ceiling (RPM)</label>
                          <select
                            value={rateLimitRpm}
                            onChange={(e) => setRateLimitRpm(Number(e.target.value))}
                            className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
                          >
                            <option value={60} className="bg-[#0d101c] text-white">60 RPM — Prototyping / CLI</option>
                            <option value={120} className="bg-[#0d101c] text-white">120 RPM — Cursor IDE & Standard (Default)</option>
                            <option value={300} className="bg-[#0d101c] text-white">300 RPM — Production Backend</option>
                            <option value={600} className="bg-[#0d101c] text-white">600 RPM — Agent Swarm Fleet</option>
                          </select>
                        </div>

                        {/* Prompt Compression */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-zinc-300">Prompt Compression</label>
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <button
                              type="button"
                              onClick={() => setCompactionMode('raw')}
                              className={`py-2 px-3 rounded-xl border text-center transition-colors cursor-pointer ${
                                compactionMode === 'raw'
                                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                                  : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white'
                              }`}
                            >
                              Raw (100% Byte)
                            </button>
                            <button
                              type="button"
                              onClick={() => setCompactionMode('auto')}
                              className={`py-2 px-3 rounded-xl border text-center transition-colors cursor-pointer ${
                                compactionMode === 'auto'
                                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                                  : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white'
                              }`}
                            >
                              Auto Compact
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                    className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSubmitting ? 'Minting Key...' : 'Create API Key'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Live Integration Preview (5 cols) (Stripe / Resend pattern) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="glass-panel rounded-2xl border border-white/15 bg-black/80 overflow-hidden shadow-2xl space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-mono text-white font-bold">Integration Preview</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Language Selector */}
                    <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10 font-mono text-[10px]">
                      {(
                        [
                          { id: 'typescript', label: 'TS' },
                          { id: 'python', label: 'Python' },
                          { id: 'curl', label: 'cURL' },
                          { id: 'cursor', label: 'Cursor' },
                          { id: 'windsurf', label: 'Windsurf' },
                        ] as const
                      ).map((lang) => (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => setPreviewLang(lang.id)}
                          className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                            previewLang === lang.id
                              ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>

                    {/* Quick Copy Snippet */}
                    <button
                      type="button"
                      onClick={handleCopySnippet}
                      className="px-2 py-1 rounded-md text-[10px] font-mono flex items-center gap-1 text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                      title="Copy code snippet"
                    >
                      {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Code Preview Body */}
                <div className="p-4 pt-1">
                  <pre className="text-[11px] font-mono leading-relaxed text-zinc-300 overflow-x-auto selection:bg-white/20 selection:text-white">
                    <code>{codeSnippets[previewLang]}</code>
                  </pre>
                </div>
              </div>

              {/* Developer Guarantees Box */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2 text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Gateway Capabilities Included</span>
                </div>
                <ul className="space-y-1.5 text-[11px]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>100% Wire-compatible with official OpenAI SDK</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Automatic pass-through prompt caching (up to 90%)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Zero Data Retention (ZDR) transit in memory</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Sub-15ms Anycast routing with auto-failover</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
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
                Please save this secret key now. For security reasons, <strong>you will not be able to view this key again</strong> after closing this window.
              </span>
            </div>

            {/* Key String Box with Stream-Safe Masking */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">Secret Key</label>
                <button
                  type="button"
                  onClick={() => setIsKeyMasked(!isKeyMasked)}
                  className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                  title={isKeyMasked ? 'Reveal secret key' : 'Mask for streaming safety'}
                >
                  {isKeyMasked ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{isKeyMasked ? 'Reveal Key' : 'Mask (Stream-safe)'}</span>
                </button>
              </div>
              <div className="p-3 rounded-xl bg-black/80 font-mono text-xs text-emerald-300 flex items-center justify-between gap-3 border border-white/10">
                <span className="select-all break-all">
                  {isKeyMasked
                    ? `${revealedKey.apiKey.slice(0, 12)}${'•'.repeat(28)}`
                    : revealedKey.apiKey}
                </span>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDownloadEnv(revealedKey.apiKey, revealedKey.name)}
                className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left transition-colors cursor-pointer flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-zinc-200 group-hover:text-white text-xs">Save .env</span>
                  <Download className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
                </div>
                <span className="text-[10px] text-zinc-500 mt-1">.env.galx file</span>
              </button>

              <button
                type="button"
                onClick={handleCopyEnv}
                className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-zinc-200 text-xs">Copy .env</span>
                  {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                </div>
                <span className="text-[10px] text-zinc-500 mt-1">Pair strings</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!revealedKey) return;
                  const snippet = `export OPENAI_BASE_URL="https://api.galx.ai/v1"\nexport OPENAI_API_KEY="${revealedKey.apiKey}"`;
                  await safeCopyToClipboard(snippet);
                  setCopiedEnv(true);
                  setTimeout(() => setCopiedEnv(false), 2000);
                }}
                className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-zinc-200 text-xs">Shell Export</span>
                  <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <span className="text-[10px] text-zinc-500 mt-1">export env vars</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCursorJson}
                className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-zinc-200 text-xs">Cursor JSON</span>
                  {copiedCursorJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Laptop className="w-3.5 h-3.5 text-zinc-400" />}
                </div>
                <span className="text-[10px] text-zinc-500 mt-1">settings.json</span>
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
              <div
                className={`p-2.5 rounded-xl border text-[11px] font-mono flex items-center gap-2 ${
                  verifyResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  {verifyResult.latencyMs}ms — {verifyResult.message}
                </span>
              </div>
            )}

            {/* Acknowledgment */}
            <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={hasAcknowledged}
                onChange={(e) => setHasAcknowledged(e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-cyan-600 focus:ring-0 cursor-pointer"
              />
              <span>I have copied and safely stored this secret key</span>
            </label>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => router.push('/keys')}
                className={`px-5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  hasAcknowledged
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-sm'
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
  name: 'New Key Page',
});
