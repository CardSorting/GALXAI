'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { DocsFeedback } from '@/components/dashboard/DocsFeedback';
import { QuickstartDocs } from '@/components/dashboard/QuickstartDocs';
import {
  Smile,
  Bot,
  Code2,
  BookOpen,
  Layers,
  ShieldCheck,
  Zap,
  Radio,
  Terminal,
  Cpu,
  ArrowRight,
  Sparkles,
  Gauge,
  Lock,
  Flame,
  AlertTriangle,
  BookMarked,
  Lightbulb,
  CheckCircle2,
  Wrench,
  Database,
  ArrowLeftRight,
  DollarSign,
  Copy,
  Check,
  Laptop,
  MessageSquare
} from 'lucide-react';
import { JargonBuster } from '@/components/common/JargonBuster';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { ShareButton } from '@/components/common/ShareButton';
import { ReadingProgressBar } from '@/components/common/ReadingProgressBar';
import { NoCodeSandboxWidget } from '@/components/dashboard/NoCodeSandboxWidget';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';

export default function DocsPage() {
  // Default to Plain English Strategy for immediate clarity
  const [activeTab, setActiveTab] = useState<'plain_english' | 'agents' | 'all'>('plain_english');
  const [monthlySpend, setMonthlySpend] = useState<number>(100);
  const [selectedTool, setSelectedTool] = useState<'cursor' | 'chat_app' | 'python' | 'nocode'>('cursor');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const calculatedWholesale = Math.round(monthlySpend * 0.62);
  const annualSavings = Math.round((monthlySpend - calculatedWholesale) * 12);

  const toolSnippets = {
    cursor: {
      title: 'Cursor IDE / Windsurf Setup',
      desc: 'In Cursor Settings > Models > OpenAI API Key, toggle "Override OpenAI Base URL":',
      code: `Base URL: https://api.galx.ai/v1\nAPI Key: galx_live_your_key_here\nModels: gpt-5.6-sol, gpt-5.6-terra, x-ai/grok-4.5`
    },
    chat_app: {
      title: 'ChatGPT-Style Web UIs (LibreChat / TypingMind / OpenWebUI)',
      desc: 'In App Settings > OpenAI API Configuration:',
      code: `Custom Endpoint: https://api.galx.ai/v1\nAPI Key: galx_live_your_key_here`
    },
    python: {
      title: 'Python / Node.js Script (1-Line Drop-in)',
      desc: 'Use the official OpenAI SDK with 1 changed line:',
      code: `from openai import OpenAI\n\n# 1-Line Drop-in wholesale discount replacement\nclient = OpenAI(\n    base_url="https://api.galx.ai/v1",\n    api_key="galx_live_your_key_here"\n)`
    },
    nocode: {
      title: 'No-Code Workflow (Make.com / Zapier / Dify)',
      desc: 'In your HTTP Request or OpenAI module:',
      code: `URL: https://api.galx.ai/v1/chat/completions\nHeader: Authorization: Bearer galx_live_your_key_here\nHeader: Content-Type: application/json`
    }
  };

  const handleCopyToolSnippet = async () => {
    await safeCopyToClipboard(toolSnippets[selectedTool].code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const allDocSections = [
    { title: 'Plain English Guide', desc: 'Simple, zero-jargon guide for non-technical developers and beginners.', href: '/docs/simple', icon: Smile, color: 'text-amber-400', badge: 'Simple' },
    { title: 'AI Agents & Swarms Hub', desc: 'High-concurrency infrastructure engineered for autonomous agent fleets.', href: '/docs/agents', icon: Bot, color: 'text-indigo-400', badge: 'Agents' },
    { title: '30-Second Quickstart', desc: 'Mint your API key and run your first completion in under 30 seconds.', href: '/docs/quickstart', icon: Zap, color: 'text-amber-400' },
    { title: '1-Click Zero-Code Migration', desc: 'Switch from OpenAI, OpenRouter, LiteLLM, or Bedrock with 1 env variable.', href: '/docs/migration', icon: ArrowLeftRight, color: 'text-emerald-400' },
    { title: 'Production Cookbooks', desc: 'Tested recipes for Multi-Agent Swarms, 500K RAG, and Batch pipelines.', href: '/docs/cookbook', icon: BookMarked, color: 'text-cyan-400', badge: 'Recipes' },
    { title: 'Function Calling & Tools', desc: 'Parallel tool execution and multi-turn agent loops with 75% tool caching.', href: '/docs/function-calling', icon: Wrench, color: 'text-emerald-400' },
    { title: 'Vector Embeddings', desc: 'High-throughput vector generation for semantic search (2,048 batch size).', href: '/docs/embeddings', icon: Database, color: 'text-indigo-400' },
    { title: 'Python SDK Deep Dive', desc: 'AsyncIO gathering, Pydantic response models, and HTTPX connection pools.', href: '/docs/sdks/python', icon: Code2, color: 'text-cyan-400' },
    { title: 'TypeScript SDK Deep Dive', desc: 'Type-safe Zod schema parsing and Vercel AI SDK integration.', href: '/docs/sdks/typescript', icon: Terminal, color: 'text-amber-300' },
    { title: 'Cursor & IDE Setup', desc: 'Configure Cursor, Windsurf, and Continue.dev with sub-second latency.', href: '/docs/ide-setup', icon: Terminal, color: 'text-emerald-400' },
    { title: 'SSE Streaming Guide', desc: 'Low-latency token streaming with sub-15ms Time-To-First-Token.', href: '/docs/streaming', icon: Radio, color: 'text-indigo-400' },
    { title: 'Guaranteed JSON Outputs', desc: 'Constrained decoding enforcing 100% adherence to complex schemas.', href: '/docs/structured-outputs', icon: Sparkles, color: 'text-cyan-400' },
    { title: 'REST API Reference', desc: 'Complete OpenAPI reference for chat, models, image, and management routes.', href: '/docs/api-reference', icon: Cpu, color: 'text-rose-400' },
    { title: 'Model Capability Guide', desc: 'Benchmark comparison across all 12 supported frontier models.', href: '/docs/models-guide', icon: Flame, color: 'text-amber-300' },
    { title: '75% Prompt Caching', desc: 'Prefix caching mechanics that cut inference costs by 75% automatically.', href: '/docs/prompt-caching', icon: Sparkles, color: 'text-emerald-400' },
    { title: 'Errors & Failover', desc: 'HTTP status codes, exponential backoff with jitter, and sub-15ms failover.', href: '/docs/error-handling', icon: AlertTriangle, color: 'text-orange-400' },
    { title: 'Router Architecture', desc: 'Continuous token-bucket calculus, AAD isolation, and circuit breakers.', href: '/docs/architecture', icon: Layers, color: 'text-indigo-400' },
    { title: 'Security & Zero-Retention', desc: 'AES-256-GCM vaulting, ephemeral RAM transit, and memory zeroization.', href: '/docs/security-spec', icon: Lock, color: 'text-cyan-400' },
    { title: 'Rate Limits & Quotas', desc: 'Continuous fractional token calculus and concurrency governor guide.', href: '/docs/rate-limits', icon: Gauge, color: 'text-amber-400' }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <ReadingProgressBar />
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'Developer Documentation' }]} />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 relative overflow-hidden border border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                <Smile className="w-3.5 h-3.5" />
                <span>SIMPLE & APPROACHABLE DEVELOPER GUIDE</span>
              </span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Documentation"
              title="GALXAI Documentation & Quickstart Center"
              description="Learn how to save 25%–40% on GPT-5.6 and Grok 4.5 with 0-code drop-in integrations."
            />
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white">Documentation & Quick Start Center</h1>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed font-sans">
            Get instant access to top frontier AI models with 25%–40% wholesale savings, sub-15ms routing, and 0 code refactoring.
          </p>

          {/* Interactive Audience Switcher Tab */}
          <div className="pt-2 flex items-center gap-2 font-mono text-xs overflow-x-auto">
            <button
              onClick={() => setActiveTab('plain_english')}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'plain_english'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Smile className="w-4 h-4" />
              <span>🔰 Plain English & 0-Code Guide</span>
            </button>

            <button
              onClick={() => setActiveTab('agents')}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'agents'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>🤖 AI Agents & Autonomous Swarms</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>🛠️ All 19 Technical Guides</span>
            </button>
          </div>
        </div>

        <DocsSubNav />

        {/* TAB 1: PLAIN ENGLISH STRATEGY (DEFAULT VIEW) */}
        {activeTab === 'plain_english' && (
          <div className="space-y-8">
            {/* Interactive Layman Simulator Widget */}
            <NoCodeSandboxWidget />

            {/* 1-Minute Plain English Hero Card */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-amber-500/30 bg-amber-500/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 uppercase">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>The 60-Second Explanation</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white font-sans">
                    What is GALXAI and How Does it Save Me Money?
                  </h2>
                  <p className="text-xs text-zinc-300 font-sans max-w-2xl">
                    GALXAI is a high-speed discount gateway. You use the exact same frontier AI models you already love (GPT-5.6, Grok 4.5), but pay wholesale prices with 0 code changes.
                  </p>
                </div>

                <Link
                  href="/docs/simple"
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 shadow-lg shadow-amber-500/20"
                >
                  <span>Read Full Plain Guide →</span>
                </Link>
              </div>

              {/* 3 Step Card Process */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans text-xs">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-black font-black text-xs flex items-center justify-center font-mono">1</span>
                    <span className="font-bold text-white text-sm">Mint an API Key</span>
                  </div>
                  <p className="text-zinc-400">
                    Click <Link href="/keys/new" className="text-cyan-300 hover:underline">Create Key</Link> to generate your personal key in 1 click.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-400 text-black font-black text-xs flex items-center justify-center font-mono">2</span>
                    <span className="font-bold text-white text-sm">Paste into Your App</span>
                  </div>
                  <p className="text-zinc-400">
                    Point your app's base URL to <code className="text-cyan-300 font-mono">https://api.galx.ai/v1</code>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-400 text-black font-black text-xs flex items-center justify-center font-mono">3</span>
                    <span className="font-bold text-white text-sm">Cut 25%–40% Off Bills</span>
                  </div>
                  <p className="text-zinc-400">
                    Get identical answers and code at wholesale discounted rates immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Live Savings Calculator */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    Interactive Monthly Savings Estimator
                  </h3>
                  <p className="text-xs text-zinc-400 font-sans">Slide to match your current monthly AI budget:</p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-zinc-400 font-mono">ESTIMATED ANNUAL SAVINGS</span>
                  <div className="text-2xl font-black text-emerald-300 font-mono">+${annualSavings.toLocaleString()} / year</div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <input
                  type="range"
                  min="20"
                  max="1000"
                  step="20"
                  value={monthlySpend}
                  onChange={(e) => setMonthlySpend(Number(e.target.value))}
                  className="w-full h-2 bg-black/60 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 font-mono text-xs">
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <span className="text-zinc-500 text-[10px] uppercase font-sans">Current Retail Cost</span>
                    <div className="text-base font-bold text-rose-400">${monthlySpend} / mo</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/30 space-y-0.5">
                    <span className="text-emerald-400 text-[10px] uppercase font-sans">GALXAI Wholesale Cost</span>
                    <div className="text-base font-bold text-emerald-300">${calculatedWholesale} / mo</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5 col-span-2 sm:col-span-1 flex flex-col justify-between">
                    <div>
                      <span className="text-zinc-500 text-[10px] uppercase font-sans">Discount Pass-Through</span>
                      <div className="text-base font-bold text-amber-300">~38% Off</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>Calculated based on pooled token volume rates</span>
                  <ShareButton
                    variant="pill"
                    label="Share This Estimate"
                    title={`I could save $${annualSavings.toLocaleString()} / year on AI with GALXAI!`}
                    description={`Calculating $${monthlySpend}/mo spend -> saves $${annualSavings.toLocaleString()}/yr using GALXAI universal AI model router.`}
                  />
                </div>
              </div>
            </div>

            {/* Interactive "Where do you want to use GALXAI?" Selector */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-cyan-400" />
                    Where do you want to use GALXAI? (1-Click Instructions)
                  </h3>
                  <p className="text-xs text-zinc-400 font-sans">Select your tool for instant configuration instructions:</p>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 font-mono text-xs overflow-x-auto">
                  <button
                    onClick={() => setSelectedTool('cursor')}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all whitespace-nowrap ${selectedTool === 'cursor' ? 'bg-amber-400 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                  >
                    Cursor / Windsurf
                  </button>
                  <button
                    onClick={() => setSelectedTool('chat_app')}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all whitespace-nowrap ${selectedTool === 'chat_app' ? 'bg-amber-400 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                  >
                    ChatGPT Web UI
                  </button>
                  <button
                    onClick={() => setSelectedTool('python')}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all whitespace-nowrap ${selectedTool === 'python' ? 'bg-amber-400 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                  >
                    Python Script
                  </button>
                  <button
                    onClick={() => setSelectedTool('nocode')}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all whitespace-nowrap ${selectedTool === 'nocode' ? 'bg-amber-400 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                  >
                    No-Code / Zapier
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/50 border border-white/5 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-zinc-300 font-sans text-xs">
                  <span>{toolSnippets[selectedTool].desc}</span>
                  <button
                    onClick={handleCopyToolSnippet}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5"
                  >
                    {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <pre className="p-3 rounded-xl bg-black/70 border border-white/5 text-cyan-300 overflow-x-auto">
                  <code>{toolSnippets[selectedTool].code}</code>
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI AGENTS & SWARMS */}
        {activeTab === 'agents' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-indigo-500/30 bg-indigo-500/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-300 uppercase">
                    <Bot className="w-3.5 h-3.5" />
                    <span>Agent Fleet Substrate</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white font-sans">
                    Engineered for High-Concurrency Autonomous AI Agents
                  </h2>
                  <p className="text-xs text-zinc-300 font-sans max-w-2xl">
                    Autonomous agents need sub-15ms TTFT, parallel tool execution, zero 429 rate limit dropouts, and 75% prompt caching on repetitive system prompts.
                  </p>
                </div>

                <Link
                  href="/docs/agents"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold flex items-center gap-2 transition-all shrink-0"
                >
                  <span>Full Agents Guide →</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-indigo-400 text-[10px] uppercase font-sans">Failover Speed</span>
                  <div className="text-lg font-bold text-white">&lt; 15 ms Auto-Reroute</div>
                  <p className="text-[11px] text-zinc-400 font-sans">Swarm never crashes mid-turn</p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-emerald-400 text-[10px] uppercase font-sans">Tool Prefix Caching</span>
                  <div className="text-lg font-bold text-emerald-300">75% Tool Discount</div>
                  <p className="text-[11px] text-zinc-400 font-sans">Massive savings on agent schemas</p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-cyan-400 text-[10px] uppercase font-sans">Throughput Governor</span>
                  <div className="text-lg font-bold text-cyan-300">Continuous Token Refill</div>
                  <p className="text-[11px] text-zinc-400 font-sans">No top-of-minute 429 spikes</p>
                </div>
              </div>
            </div>

            {/* Quickstart agent snippet */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-amber-400" />
                  1-Line Agent Client Initialization (Python / LangChain / CrewAI)
                </h3>
                <Link href="/docs/cookbook" className="text-xs font-mono text-cyan-300 hover:underline">
                  View Multi-Agent Swarm Recipe →
                </Link>
              </div>

              <pre className="p-4 rounded-2xl bg-black/60 border border-white/5 font-mono text-xs text-cyan-300 overflow-x-auto">
                <code>{`from openai import OpenAI

# 1-Line Drop-in for any AI Agent Framework
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Call Flagship Reasoning Engine for Agent Planning
response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[
        {"role": "system", "content": "You are an autonomous software agent."},
        {"role": "user", "content": "Plan and execute architecture refactoring."}
    ],
    temperature=0.2
)`}</code>
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3 or COMMON: ALL DOCUMENTATION GUIDES GRID */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Complete Documentation & SDK Guides</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allDocSections.map((sec) => {
              const Icon = sec.icon;
              return (
                <Link
                  key={sec.href}
                  href={sec.href}
                  className="glass-card rounded-3xl p-6 border border-white/5 space-y-3 flex flex-col justify-between group hover:border-indigo-500/40 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${sec.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {sec.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-zinc-300">
                          {sec.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {sec.title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                      {sec.desc}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-indigo-400 font-semibold pt-2">
                    <span>Read guide</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Quickstart Interactive Snippets */}
        <QuickstartDocs />

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />

        <DocsFeedback docTitle="GALXAI Developer Documentation Center" />
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
      <FloatingConversionDock />
      <LiveActivityToast />
      <ExitIntentModal />
    </div>
  );
}
