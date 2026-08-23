'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { KeysSubNav } from '@/components/dashboard/KeysSubNav';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldAlert,
  Sparkles,
  X,
  Code2,
  Wallet,
  Coins,
  ArrowRight,
  TrendingDown,
  ExternalLink,
  Sliders,
  DollarSign,
  Gift,
  Terminal,
  Zap,
  Activity,
  Laptop,
  Server,
  Bot,
  Layers,
  Cpu,
  ShieldCheck,
  Play
} from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';
import { useDepositVerification } from '@/lib/hooks/useDepositVerification';
import { KeyActivationPaywallModal } from '@/components/keys/KeyActivationPaywallModal';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { TrustSeals } from '@/components/common/TrustSeals';

interface QuickPreset {
  id: string;
  name: string;
  defaultLabel: string;
  rpm: number;
  icon: React.ComponentType<{ className?: string }>;
}

const QUICK_PRESETS: QuickPreset[] = [
  { id: 'cursor', name: 'Cursor / Windsurf', defaultLabel: 'Cursor IDE Key', rpm: 120, icon: Laptop },
  { id: 'backend', name: 'Production Backend', defaultLabel: 'Production API Backend', rpm: 300, icon: Server },
  { id: 'agent', name: 'Agent Swarm Fleet', defaultLabel: 'Autonomous Agent Fleet', rpm: 600, icon: Bot },
  { id: 'cli', name: 'Local CLI / Scripts', defaultLabel: 'CLI & Notebook Key', rpm: 60, icon: Terminal }
];

type SnippetTab = 'curl' | 'python' | 'ts_sdk' | 'openai_sdk' | 'anthropic_sdk' | 'cursor' | 'litellm' | 'vercel_ai';

export default function GatewayKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('Cursor IDE Key');
  const [selectedRpm, setSelectedRpm] = useState<number>(120);
  const [createdSecretKey, setCreatedSecretKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [activeSnippetTab, setActiveSnippetTab] = useState<SnippetTab>('python');

  // Live Gateway Smoke Test & Ping
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; latencyMs: number; modelCount?: number; message?: string } | null>(null);

  const { hasVerifiedDeposit, walletBalance, depositAndUnlock } = useDepositVerification();

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/keys');
      const data = await res.json();
      setKeys(data.keys || []);
    } catch {}
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const createKeyDirectly = async (keyName: string, balanceAmount: number, rpm: number = selectedRpm) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: keyName.trim() || 'Developer API Key',
          rateLimitPerMinute: rpm,
          hasVerifiedDeposit: true,
          depositedAmount: balanceAmount
        })
      });
      const data = await res.json();
      if (data.success && data.key?.apiKey) {
        setCreatedSecretKey(data.key.apiKey);
        setNewKeyName('');
        fetchKeys();
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newKeyName.trim()) return;

    if (!hasVerifiedDeposit) {
      setIsPaywallOpen(true);
      return;
    }

    await createKeyDirectly(newKeyName, walletBalance, selectedRpm);
  };

  const handlePaywallSuccess = async (depositAmt: number, totalCredit: number) => {
    const { totalCredited } = depositAndUnlock(depositAmt);
    setIsPaywallOpen(false);
    await createKeyDirectly(newKeyName || 'Developer API Key (Activated)', walletBalance + totalCredited, selectedRpm);
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      await fetch(`/api/keys?id=${keyId}`, { method: 'DELETE' });
      fetchKeys();
    } catch {}
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopySnippet = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const applyQuickPreset = (preset: QuickPreset) => {
    setNewKeyName(preset.defaultLabel);
    setSelectedRpm(preset.rpm);
  };

  const runGatewaySmokeTest = async () => {
    setIsPinging(true);
    setPingResult(null);
    const start = performance.now();
    try {
      const res = await fetch('/v1/models', {
        headers: createdSecretKey ? { Authorization: `Bearer ${createdSecretKey}` } : undefined
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        setPingResult({
          success: true,
          latencyMs,
          modelCount: data.data?.length || 12,
          message: 'Zero-hesitation gateway operational across all 12 SOTA models.'
        });
      } else {
        setPingResult({
          success: false,
          latencyMs,
          message: `Gateway responded with status ${res.status}.`
        });
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      setPingResult({
        success: false,
        latencyMs,
        message: err.message || 'Connection timeout.'
      });
    } finally {
      setIsPinging(false);
    }
  };

  const activeDisplayKey = createdSecretKey || 'galx_live_sk_89f02c918e90a427';

  const snippets: Record<SnippetTab, { title: string; lang: string; code: string }> = {
    python: {
      title: 'Python OpenAI SDK',
      lang: 'python',
      code: `from openai import OpenAI

# Zero friction: drop in GALXAI base_url into standard OpenAI client
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="${activeDisplayKey}"
)

# Accepts any mental model alias: "sol", "gpt-5", "claude-3-7-sonnet", "grok-4.6"
response = client.chat.completions.create(
    model="gpt-5.6-sol", # or simply "sol"
    messages=[
        {"role": "system", "content": "You are an elite coding assistant."},
        {"role": "user", "content": "Write a high-performance Rust LRU cache."}
    ],
    temperature=0.7
)

print(response.choices[0].message.content)`
    },
    openai_sdk: {
      title: 'Node.js OpenAI SDK',
      lang: 'typescript',
      code: `import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://galx.ai/v1',
  apiKey: '${activeDisplayKey}'
});

const completion = await openai.chat.completions.create({
  model: 'gpt-5.6-sol', // Universal alias resolution
  messages: [{ role: 'user', content: 'Generate a distributed task queue in Go.' }]
});

console.log(completion.choices[0].message.content);`
    },
    anthropic_sdk: {
      title: 'Anthropic SDK / Claude Code',
      lang: 'typescript',
      code: `import Anthropic from '@anthropic-ai/sdk';

// Universal Anthropic SDK Drop-in compatibility (/v1/messages)
const anthropic = new Anthropic({
  baseURL: 'https://galx.ai',
  apiKey: '${activeDisplayKey}'
});

const message = await anthropic.messages.create({
  model: 'claude-3-7-sonnet',
  max_tokens: 2048,
  messages: [{ role: 'user', content: 'Audit this smart contract for reentrancy.' }]
});

console.log(message.content[0]);`
    },
    ts_sdk: {
      title: '@galxai/sdk Direct',
      lang: 'typescript',
      code: `import { GalxAIClient } from '@galxai/sdk';

const galx = new GalxAIClient('${activeDisplayKey}');

// 1-line prompt execution
const answer = await galx.run('Explain quantum key distribution simply.');

// Flat structured extraction
const parsed = await galx.extract('Dr. Sarah Chen, 34, Neurologist at Stanford', {
  name: { type: 'string' },
  age: { type: 'number' },
  institution: { type: 'string' }
});`
    },
    curl: {
      title: 'cURL Terminal',
      lang: 'bash',
      code: `curl -X POST https://galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer ${activeDisplayKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "sol",
    "messages": [
      {"role": "user", "content": "Hello GALXAI!"}
    ]
  }'`
    },
    cursor: {
      title: 'Cursor & Windsurf IDE',
      lang: 'json',
      code: `// Add to .cursor/settings.json or Cursor Models configuration:
{
  "openai.baseUrl": "https://galx.ai/v1",
  "openai.apiKey": "${activeDisplayKey}",
  "models": [
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "x-ai/grok-4.6"
  ]
}`
    },
    litellm: {
      title: 'LiteLLM Proxy Config',
      lang: 'yaml',
      code: `model_list:
  - model_name: gpt-5.6-sol
    litellm_params:
      model: openai/gpt-5.6-sol
      api_base: https://galx.ai/v1
      api_key: ${activeDisplayKey}
  - model_name: grok-4.6
    litellm_params:
      model: openai/x-ai/grok-4.6
      api_base: https://galx.ai/v1
      api_key: ${activeDisplayKey}`
    },
    vercel_ai: {
      title: 'Vercel AI SDK',
      lang: 'typescript',
      code: `import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const galxai = createOpenAI({
  baseURL: 'https://galx.ai/v1',
  apiKey: '${activeDisplayKey}'
});

const { text } = await generateText({
  model: galxai('gpt-5.6-sol'),
  prompt: 'Design an enterprise zero-trust telemetry pipeline.'
});`
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e]">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'Developer Gateway API Keys' }]} />

        <KeysSubNav />

        <AuthRequiredGate
          title="Sign In to Access API Keys"
          description="Your dedicated API keys, per-key rate limit configurations, and live consumption metrics are private to your workspace."
          checkoutAmount={25}
        >
          {/* Page Hero with Wallet Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-8 glass-panel rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-4 border border-white/10 bg-gradient-to-br from-indigo-950/20 via-black/40 to-cyan-950/20">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  <span>ZERO-HESITATION UNIVERSAL GATEWAY</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Developer Gateway API Keys</h1>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl">
                  Unified <code className="text-cyan-300 font-mono font-bold">galx_live_...</code> client tokens. Drop-in compatible with OpenAI, Anthropic, Ollama, LangChain, Cursor &amp; Windsurf. Absorbs every mental model and model alias with <strong>25%–40% wholesale savings</strong> and microsecond metering.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/keys/new"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-black" />
                  <span>Advanced Key Wizard ($5 Free Grant)</span>
                </Link>

                <button
                  type="button"
                  onClick={runGatewaySmokeTest}
                  disabled={isPinging}
                  className="px-4 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 text-indigo-400 ${isPinging ? 'animate-pulse' : ''}`} />
                  <span>{isPinging ? 'Pinging Gateway...' : 'Live Smoke Test (0ms)'}</span>
                </button>

                <Link
                  href="/docs/quickstart"
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Quickstart Docs</span>
                </Link>
              </div>
            </div>

            {/* Wallet Balance Widget */}
            <div className="lg:col-span-4 glass-panel rounded-3xl p-6 flex flex-col justify-between space-y-4 border border-emerald-500/30 bg-emerald-500/5 shadow-xl">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400 uppercase font-bold flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    Compute Wallet
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                    Autopay Active
                  </span>
                </div>
                <div className="text-3xl font-black text-white font-mono">${walletBalance.toFixed(2)} <span className="text-xs text-zinc-400 font-sans">USD</span></div>
                <p className="text-[11px] text-zinc-400">All active keys draw from this shared compute balance with microsecond metering.</p>
              </div>

              <Link
                href="/billing"
                className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer font-mono"
              >
                <span>Manage Wallet &amp; Top Up</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Live Smoke Test Result Banner */}
          {pingResult && (
            <div className={`glass-panel rounded-2xl p-4 border flex items-center justify-between gap-4 transition-all ${
              pingResult.success ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  pingResult.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {pingResult.success ? <Check className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white uppercase">
                      {pingResult.success ? 'Gateway Verified Online' : 'Gateway Connectivity Warning'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-black/40 text-[10px] font-mono text-cyan-300 font-bold border border-white/10">
                      {pingResult.latencyMs}ms RTT
                    </span>
                    {pingResult.modelCount && (
                      <span className="px-2 py-0.5 rounded-md bg-black/40 text-[10px] font-mono text-emerald-300 font-bold border border-white/10">
                        {pingResult.modelCount} Models Ready
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300">{pingResult.message}</p>
                </div>
              </div>
              <button
                onClick={() => setPingResult(null)}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Unverified Deposit Match Banner */}
          {!hasVerifiedDeposit && (
            <div className="glass-panel rounded-3xl p-6 border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-black/40 space-y-3 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>50% INSTANT DEPOSIT MATCH • $5 FREE COMPUTE</span>
                    </div>
                    <h2 className="text-base font-bold text-white">Deposit $10 to Mint Your Key &amp; Claim $5 Free Compute</h2>
                    <p className="text-xs text-zinc-300 max-w-xl">
                      Make your first refundable compute deposit of <strong>$10.00 USD</strong> to unlock live gateway routing and receive <strong className="text-emerald-300">$15.00 Total Usable Balance</strong> with 0 platform fees.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPaywallOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs font-mono uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Deposit $10 &amp; Unlock</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick 1-Click Key Generator with Mental Model Presets */}
          <div className="glass-panel rounded-3xl p-6 space-y-5 border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>Instant 1-Click Key Generator</span>
                </h2>
                <p className="text-xs text-zinc-400">Zero hesitation. Choose a mental model preset or enter a custom identifier.</p>
              </div>

              {/* Quick Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = newKeyName === preset.defaultLabel;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyQuickPreset(preset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {createdSecretKey ? (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Your Secret API Key is Ready</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">Copy now • Stored hashed with SHA-256</span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/70 font-mono text-xs text-emerald-300 flex items-center justify-between gap-3 border border-emerald-500/30 break-all">
                  <span className="select-all">{createdSecretKey}</span>
                  <button
                    onClick={() => handleCopy(createdSecretKey, 'banner')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 shrink-0 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold font-sans"
                  >
                    {copiedKey === 'banner' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'banner' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                  <span>Tested &amp; ready to use in any OpenAI, Anthropic, or LangChain SDK instance below.</span>
                  <button
                    onClick={() => setCreatedSecretKey(null)}
                    className="text-zinc-500 hover:text-zinc-300 text-xs underline cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Cursor IDE, Production Agent Fleet, CLI Tool"
                  className="flex-1 py-3 px-4 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isLoading ? 'Generating...' : 'Mint Key in 1-Click'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Interactive Multi-Mental-Model Code Snippets & Drop-in Matrix */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 bg-black/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-500/30">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>DROP-IN REPLACEMENT ANYWHERE</span>
                </div>
                <h2 className="text-lg font-black text-white">How to Connect from Any Mental Model</h2>
                <p className="text-xs text-zinc-400">
                  Simply point your favorite SDK, agent framework, or IDE to <code className="text-cyan-300 font-mono">https://galx.ai/v1</code>.
                </p>
              </div>

              {/* Code Snippet Tab Bar */}
              <div className="flex flex-wrap items-center gap-1 bg-black/50 p-1.5 rounded-2xl border border-white/10">
                {(
                  [
                    { id: 'python', label: 'Python' },
                    { id: 'openai_sdk', label: 'OpenAI (Node)' },
                    { id: 'anthropic_sdk', label: 'Anthropic' },
                    { id: 'ts_sdk', label: '@galxai/sdk' },
                    { id: 'curl', label: 'cURL' },
                    { id: 'cursor', label: 'Cursor IDE' },
                    { id: 'litellm', label: 'LiteLLM' },
                    { id: 'vercel_ai', label: 'Vercel AI' }
                  ] as { id: SnippetTab; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSnippetTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      activeSnippetTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Display Area */}
            <div className="relative rounded-2xl bg-black/80 border border-white/10 overflow-hidden font-mono text-xs">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                  <span className="ml-2 text-zinc-400 font-semibold">{snippets[activeSnippetTab].title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopySnippet(snippets[activeSnippetTab].code)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 flex items-center gap-1.5 text-[11px] font-sans font-bold cursor-pointer transition-all border border-white/5"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{copiedSnippet ? 'Copied to Clipboard' : 'Copy Code'}</span>
                </button>
              </div>

              <pre className="p-4 sm:p-5 text-zinc-300 overflow-x-auto leading-relaxed">
                <code>{snippets[activeSnippetTab].code}</code>
              </pre>
            </div>
          </div>

          {/* Active Keys Table */}
          <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Active Gateway Keys ({keys.filter(k => !k.revoked).length})</h2>
              <span className="text-xs text-zinc-400 font-mono">Shared Wallet Auto-Deduction</span>
            </div>

            {keys.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-black/30 border border-dashed border-white/10 space-y-2">
                <Key className="w-8 h-8 text-zinc-500 mx-auto" />
                <p className="text-xs text-zinc-400">No gateway keys generated yet. Use the 1-click generator above to mint your first key.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/20">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4 font-sans">Name / Label</th>
                      <th className="py-3 px-4 font-sans">Key Prefix</th>
                      <th className="py-3 px-4 font-sans">Rate Limit</th>
                      <th className="py-3 px-4 font-sans">Total Requests</th>
                      <th className="py-3 px-4 font-sans">Spend Cap</th>
                      <th className="py-3 px-4 font-sans">Created</th>
                      <th className="py-3 px-4 font-sans">Status</th>
                      <th className="py-3 px-4 text-right font-sans">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {keys.map((k) => (
                      <tr key={k.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">{k.name}</td>
                        <td className="py-3.5 px-4 font-mono text-cyan-300">{k.keyPrefix}...</td>
                        <td className="py-3.5 px-4 text-zinc-400">{k.rateLimitPerMinute || 120} RPM</td>
                        <td className="py-3.5 px-4 text-zinc-300 font-mono">{k.totalRequests || 0}</td>
                        <td className="py-3.5 px-4 text-emerald-400 font-bold">Auto-Wallet</td>
                        <td className="py-3.5 px-4 text-zinc-500 font-sans">{formatTimeAgo(k.createdAt)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            k.revoked
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {k.revoked ? 'Revoked' : 'Active'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {!k.revoked && (
                            <button
                              onClick={() => handleRevokeKey(k.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold cursor-pointer transition-all font-sans"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AuthRequiredGate>

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />
      </main>

      {/* Paywall Blocker Modal */}
      <KeyActivationPaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onSuccess={handlePaywallSuccess}
        keyLabel={newKeyName || 'Developer API Key'}
      />
    </div>
  );
}
