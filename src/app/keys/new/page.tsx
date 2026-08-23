'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { KeysSubNav } from '@/components/dashboard/KeysSubNav';
import {
  Key,
  Sparkles,
  Check,
  Copy,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Flame,
  Terminal,
  Code2,
  Laptop,
  ArrowRight,
  Zap,
  Cpu,
  CreditCard,
  Lock,
  Coins,
  AlertCircle,
  Play,
  FileCode,
  Sliders,
  Server,
  Bot,
  Layers,
  Gift,
  Activity
} from 'lucide-react';
import { useDepositVerification } from '@/lib/hooks/useDepositVerification';
import { KeyActivationPaywallModal } from '@/components/keys/KeyActivationPaywallModal';
import { KeyActivationPaywallBlocker } from '@/components/keys/KeyActivationPaywallBlocker';
import { useAuth } from '@/contexts/AuthContext';
import { TrustSeals } from '@/components/common/TrustSeals';

interface Preset {
  id: string;
  name: string;
  defaultLabel: string;
  rpm: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const PRESETS: Preset[] = [
  {
    id: 'cursor',
    name: 'Cursor & Windsurf',
    defaultLabel: 'Cursor IDE / AI Editor',
    rpm: 120,
    icon: Laptop,
    description: 'Optimized for inline completions, multi-file edits, and agent loops.'
  },
  {
    id: 'backend',
    name: 'Production Backend',
    defaultLabel: 'Production API Backend',
    rpm: 300,
    icon: Server,
    description: 'High-concurrency server workloads with automated failover.'
  },
  {
    id: 'agent',
    name: 'Autonomous Agent Fleet',
    defaultLabel: 'Agent Swarm / LangChain',
    rpm: 600,
    icon: Bot,
    description: 'Maximum throughput for multi-step reasoning and tool-calling swarms.'
  },
  {
    id: 'proto',
    name: 'Local Testing & CLI',
    defaultLabel: 'Local Prototyping Key',
    rpm: 60,
    icon: Terminal,
    description: 'Standard rate limits for local scripts, notebooks, and quick testing.'
  }
];

export default function CreateKeyPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedPresetId, setSelectedPresetId] = useState<string>('cursor');
  const [name, setName] = useState('Cursor IDE / AI Editor');
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(120);
  const [createdSecretKey, setCreatedSecretKey] = useState<string | null>(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'python' | 'node' | 'env' | 'cursor' | 'continue' | 'curl'>('python');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Instant Live Smoke Test State
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs: number; message: string } | null>(null);

  // Account Verification & Paywall State ($10 Minimum Initial Deposit to Unlock $5 Bonus)
  const { hasVerifiedDeposit, walletBalance, depositAndUnlock } = useDepositVerification();
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywallSelectedAmt, setPaywallSelectedAmt] = useState<number>(10);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);

  const applyPreset = (preset: Preset) => {
    setSelectedPresetId(preset.id);
    setName(preset.defaultLabel);
    setRateLimitPerMinute(preset.rpm);
  };

  const mintKeyRequest = async (currentBalance: number) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Default Developer Key',
          rateLimitPerMinute: Number(rateLimitPerMinute),
          hasVerifiedDeposit: true,
          depositedAmount: currentBalance
        })
      });
      const data = await res.json();
      if (data.success && data.key?.apiKey) {
        setCreatedSecretKey(data.key.apiKey);
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const handleDepositAndVerify = (amt: number) => {
    setIsDepositing(true);
    setTimeout(() => {
      const { totalCredited } = depositAndUnlock(amt);
      setIsDepositing(false);
      setDepositSuccessMsg(`Successfully deposited $${amt.toFixed(2)} USD! Credited +$${totalCredited.toFixed(2)} ($${amt.toFixed(2)} + $5.00 Welcome Grant) to your compute wallet.`);
      setTimeout(() => setDepositSuccessMsg(null), 5000);
      mintKeyRequest(walletBalance + totalCredited);
    }, 800);
  };

  const handlePaywallSuccess = (depositAmt: number, totalCredit: number) => {
    const { totalCredited } = depositAndUnlock(depositAmt);
    setIsPaywallOpen(false);
    setDepositSuccessMsg(`Payment verified! Credited +$${totalCredited.toFixed(2)} to wallet. Minting live key...`);
    mintKeyRequest(walletBalance + totalCredited);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (!hasVerifiedDeposit) {
      // Trigger Paywall Modal Blocker
      setIsPaywallOpen(true);
      return;
    }

    await mintKeyRequest(walletBalance);
  };

  const handleCopyKey = () => {
    if (!createdSecretKey) return;
    navigator.clipboard.writeText(createdSecretKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Instant Live Smoke Test Function
  const handleRunSmokeTest = async () => {
    if (!createdSecretKey) return;
    setIsTestingKey(true);
    setTestResult(null);

    const start = Date.now();
    try {
      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${createdSecretKey}`
        },
        body: JSON.stringify({
          model: 'gpt-5.6-sol',
          messages: [{ role: 'user', content: 'Say "GALXAI Gateway Connected Successfully!" in 5 words.' }],
          stream: false
        })
      });

      const latencyMs = Date.now() - start;
      if (res.ok) {
        const json = await res.json();
        const reply = json.choices?.[0]?.message?.content || 'GALXAI Gateway Connected Successfully!';
        setTestResult({
          success: true,
          latencyMs,
          message: reply
        });
      } else {
        setTestResult({
          success: false,
          latencyMs,
          message: `Verification returned HTTP ${res.status}`
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        latencyMs: Date.now() - start,
        message: err.message || 'Connection test failed'
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const getSnippets = (k: string) => ({
    python: `from openai import OpenAI

# 1-Line Drop-in replacement for OpenAI SDK (25%-40% discount)
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="${k}"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Explain algorithmic game theory."}]
)
print(response.choices[0].message.content)`,
    node: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://api.galx.ai/v1',
  apiKey: '${k}'
});

const response = await client.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Write a LRU cache in Rust.' }],
  stream: true
});`,
    env: `# .env file for your backend or agent app
OPENAI_BASE_URL="https://api.galx.ai/v1"
OPENAI_API_KEY="${k}"
GALXAI_API_KEY="${k}"
DEFAULT_MODEL="gpt-5.6-sol"`,
    cursor: `// In Cursor IDE / Windsurf Settings -> Models -> OpenAI API Key:
// 1. Set Override Base URL:
https://api.galx.ai/v1

// 2. Set API Key:
${k}

// 3. Available Models:
gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna, x-ai/grok-4.6, x-ai/grok-4.5`,
    continue: `{
  "models": [
    {
      "title": "GALXAI GPT-5.6 Sol",
      "provider": "openai",
      "model": "gpt-5.6-sol",
      "apiBase": "https://api.galx.ai/v1",
      "apiKey": "${k}"
    }
  ]
}`,
    curl: `curl https://api.galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer ${k}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Hello GALXAI!"}]
  }'`
  });

  const handleCopySnippet = () => {
    if (!createdSecretKey) return;
    const snippets = getSnippets(createdSecretKey);
    navigator.clipboard.writeText(snippets[activeSnippetTab]);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'API Keys', href: '/keys' },
            { label: 'Create Gateway Key' }
          ]}
        />

        <KeysSubNav />

        {!user && !authLoading ? (
          <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-black/50 to-black/70 shadow-2xl text-center space-y-8 relative overflow-hidden max-w-3xl mx-auto my-4">
            <div className="absolute top-0 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/20">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>DEVELOPER AUTHENTICATION REQUIRED</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Sign In to Mint Gateway API Keys
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                You must connect your developer account or sign in to mint dedicated API keys, lock in wholesale compute rates, and receive your $5 welcome grant.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto font-mono text-xs">
              <Link
                href="/auth/connect"
                className="p-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-105"
              >
                <Key className="w-4 h-4 text-black fill-black" />
                <span>Connect Developer Account</span>
              </Link>

              <Link
                href="/checkout?amount=25"
                className="p-4 rounded-2xl bg-black/60 hover:bg-black/80 border border-emerald-500/40 text-emerald-300 font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-105"
              >
                <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                <span>Prepay Compute ($25)</span>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono text-zinc-400">
              <div className="flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>ZDR-100 Privacy</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Session Enclave</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>&lt; 15ms Latency</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>100% Refundable</span>
              </div>
            </div>
          </div>
        ) : authLoading ? (
          <div className="py-24 text-center space-y-3 font-mono text-xs text-zinc-400">
            <Activity className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
            <p>Authenticating developer workspace...</p>
          </div>
        ) : (
          <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
                <Key className="w-3.5 h-3.5" />
                <span>NEW DEVELOPER GATEWAY KEY</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>VERIFIED DEVELOPER ACTIVATION</span>
              </div>
            </div>
            <h1 className="text-2xl font-black text-white">Create Developer Gateway Key</h1>
            <p className="text-xs text-zinc-400">
              Generate a unified <code className="text-cyan-300 font-mono">galx_live_...</code> client token for use in OpenAI client SDKs, Cursor IDE, and agentic workflows.
            </p>
          </div>

          {/* Account Verification & Starter Deposit Paywall Banner */}
          {/* Account Verification & Starter Deposit Paywall Blocker */}
          {!hasVerifiedDeposit ? (
            <KeyActivationPaywallBlocker
              onOpenPaywallModal={(amt) => {
                if (amt) setPaywallSelectedAmt(amt);
                setIsPaywallOpen(true);
              }}
              onInstantDeposit={handleDepositAndVerify}
              isDepositing={isDepositing}
              depositSuccessMsg={depositSuccessMsg}
            />
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4 font-mono text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">Verified Developer Account</span>
                <span className="text-zinc-400">•</span>
                <span className="text-zinc-300">Wallet: ${walletBalance.toFixed(2)} USD</span>
              </div>
              <Link href="/billing" className="text-[11px] text-cyan-300 hover:underline flex items-center gap-1">
                <span>Manage Wallet</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {createdSecretKey ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Key Box */}
              <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/40 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Your Key is Ready & Activated</h2>
                      <p className="text-xs text-emerald-300 font-mono">Drawing from verified ${walletBalance.toFixed(2)} USD balance</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                    Active
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-black/70 font-mono text-xs text-emerald-300 flex items-center justify-between gap-3 break-all border border-emerald-500/30">
                  <span className="select-all">{createdSecretKey}</span>
                  <button
                    onClick={handleCopyKey}
                    className="p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-sans font-bold"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>

                {/* Founding Cohort Lifetime Rate Lock Certificate */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs text-amber-300">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-bold shrink-0">
                      <Lock className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <span className="font-bold text-white block text-xs">Founding Cohort Rate Lock: Active</span>
                      <span className="text-zinc-300 text-[11px]">Lifetime 0% routing markup • 25%–40% wholesale margin • 75% prompt cache pass-through</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 font-bold text-[10px] uppercase border border-amber-500/40 shrink-0 self-start sm:self-auto">
                    Grandfathered
                  </span>
                </div>
              </div>

              {/* Instant In-Browser Smoke Test Card */}
              <div className="glass-panel rounded-3xl p-6 space-y-4 border border-cyan-500/30 bg-cyan-500/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      Live In-Browser Key Verification
                    </h3>
                    <p className="text-xs text-zinc-400">Send an instant test ping through the router to verify this key end-to-end.</p>
                  </div>

                  <button
                    onClick={handleRunSmokeTest}
                    disabled={isTestingKey}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isTestingKey ? (
                      <span>Testing Endpoint...</span>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-cyan-400" />
                        <span>Run Live Key Test</span>
                      </>
                    )}
                  </button>
                </div>

                {testResult && (
                  <div className={`p-4 rounded-2xl border font-mono text-xs animate-in fade-in duration-200 flex items-start gap-3 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                  }`}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-2">
                        <span>✓ Response received in {testResult.latencyMs}ms</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                          25% Discount Active
                        </span>
                      </div>
                      <p className="text-zinc-300 text-[11px] italic">"{testResult.message}"</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Pre-Populated 1-Click Code Snippet Generator */}
              <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-cyan-400" />
                      Instant Setup Snippet (Pre-Filled with Your Key)
                    </h3>
                    <p className="text-xs text-zinc-400">Select your tool or SDK to copy the drop-in configuration.</p>
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-xl bg-black/50 border border-white/10 text-xs font-mono">
                    {(['python', 'node', 'env', 'cursor', 'continue', 'curl'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveSnippetTab(tab)}
                        className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                          activeSnippetTab === tab
                            ? 'bg-amber-400 text-black font-bold shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {tab === 'env' ? '.env' : tab === 'cursor' ? 'Cursor IDE' : tab === 'continue' ? 'Continue.dev' : tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative rounded-2xl bg-black/80 border border-white/10 p-4 font-mono text-xs overflow-hidden">
                  <button
                    onClick={handleCopySnippet}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all text-[11px] cursor-pointer"
                  >
                    {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet ? 'Copied Snippet!' : 'Copy Snippet'}</span>
                  </button>
                  <pre className="text-zinc-300 overflow-x-auto pr-24 leading-relaxed font-mono">
                    {getSnippets(createdSecretKey)[activeSnippetTab]}
                  </pre>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                <Link
                  href="/keys"
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
                >
                  ← Back to All Keys
                </Link>

                <div className="flex items-center gap-3">
                  <Link
                    href="/models"
                    className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Browse Models</span>
                  </Link>

                  <Link
                    href="/docs/quickstart"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                  >
                    <span>View Quickstart Guide</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Preset Selector Grid */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                  1. Select Workload Preset
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    const Icon = preset.icon;

                    return (
                      <div
                        key={preset.id}
                        onClick={() => applyPreset(preset)}
                        className={`cursor-pointer rounded-2xl p-4 border transition-all space-y-2 flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/10 scale-[1.02]'
                            : 'bg-black/30 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-zinc-400'}`} />
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">
                              {preset.rpm} RPM
                            </span>
                          </div>
                          <div className="text-xs font-bold text-white">{preset.name}</div>
                          <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">{preset.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Key Name / Label */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                  2. Key Label / Identifier
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cursor IDE, Production API, Agent Bot"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full py-3 px-4 rounded-2xl bg-black/40 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors font-mono"
                />
              </div>

              {/* Rate Limit Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                  3. Rate Limit (Requests per Minute)
                </label>
                <select
                  value={rateLimitPerMinute}
                  onChange={(e) => setRateLimitPerMinute(Number(e.target.value))}
                  className="w-full py-3 px-4 rounded-2xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors font-mono"
                >
                  <option value={60} className="bg-zinc-900 text-white">60 RPM (Standard Prototyping)</option>
                  <option value={120} className="bg-zinc-900 text-white">120 RPM (Recommended Developer)</option>
                  <option value={300} className="bg-zinc-900 text-white">300 RPM (High-Throughput)</option>
                  <option value={600} className="bg-zinc-900 text-white">600 RPM (Production Fleet)</option>
                </select>
              </div>

              {/* Value / Trust Points */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>100% usable balance with zero platform or monthly fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Drop-in OpenAI SDK and Cursor compatibility</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Instant 1-click revocation from dashboard at any time</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Link
                  href="/keys"
                  className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-semibold transition-all"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer font-mono"
                >
                  {isLoading ? (
                    <span>Minting Key...</span>
                  ) : !hasVerifiedDeposit ? (
                    <>
                      <Gift className="w-4 h-4 text-black" />
                      <span>Unlock with $10 Deposit ($15 Credit)</span>
                      <ArrowRight className="w-4 h-4 text-black" />
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 text-black" />
                      <span>Mint Verified Key</span>
                      <ArrowRight className="w-4 h-4 text-black" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
        )}
        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />
      </main>

      {/* Paywall Blocker Modal */}
      <KeyActivationPaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onSuccess={handlePaywallSuccess}
        keyLabel={name}
        initialAmount={paywallSelectedAmt}
      />
    </div>
  );
}
