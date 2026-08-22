'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { DocsFeedback } from '@/components/dashboard/DocsFeedback';
import { QuickstartDocs } from '@/components/dashboard/QuickstartDocs';
import {
  Bot,
  Smile,
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
  DollarSign
} from 'lucide-react';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<'agents' | 'plain_english' | 'all'>('agents');

  const allDocSections = [
    { title: 'AI Agents & Swarms Hub', desc: 'High-concurrency infrastructure engineered for autonomous agent fleets.', href: '/docs/agents', icon: Bot, color: 'text-indigo-400', badge: 'Agents' },
    { title: 'Plain English Guide', desc: 'Simple, zero-jargon guide for non-technical developers and beginners.', href: '/docs/simple', icon: Smile, color: 'text-amber-400', badge: 'Simple' },
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
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'Developer Documentation' }]} />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 relative overflow-hidden border border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <Code2 className="w-3.5 h-3.5" />
              <span>UNIVERSAL DEVELOPER GATEWAY HUB</span>
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white">Documentation & Architecture Center</h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed font-sans">
            GALXAI exposes a standard OpenAI-compatible API surface at <code className="text-cyan-300 font-mono">https://api.galxai.com/v1</code>. Drop it in as a 1-line base URL replacement for any autonomous agent, swarm, or developer application.
          </p>

          {/* Interactive Audience Switcher Tab */}
          <div className="pt-2 flex items-center gap-2 font-mono text-xs overflow-x-auto">
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
              onClick={() => setActiveTab('plain_english')}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'plain_english'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Smile className="w-4 h-4" />
              <span>💡 Plain English (For Dummies / Beginners)</span>
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

        {/* TAB 1: AI AGENTS & SWARMS (DEFAULT VIEW) */}
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
    base_url="https://api.galxai.com/v1",
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

        {/* TAB 2: PLAIN ENGLISH / FOR DUMMIES */}
        {activeTab === 'plain_english' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-amber-500/30 bg-amber-500/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 uppercase">
                    <Smile className="w-3.5 h-3.5" />
                    <span>No Jargon • Plain Language</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white font-sans">
                    The Plain English Guide: How GALXAI Works for Beginners
                  </h2>
                  <p className="text-xs text-zinc-300 font-sans max-w-2xl">
                    Don't understand what an API, token, or rate limit is? Here is everything explained like you're talking to a friend over coffee.
                  </p>
                </div>

                <Link
                  href="/docs/simple"
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0"
                >
                  <span>Read Full Plain Guide →</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-sans text-xs">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-amber-400 font-bold text-xs">1. Get a Key</span>
                  <p className="text-zinc-300">Click "Create Key" to get a personal access code.</p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-cyan-400 font-bold text-xs">2. Paste in Cursor or App</span>
                  <p className="text-zinc-300">Change the URL in your app to <code>https://api.galxai.com/v1</code>.</p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-emerald-400 font-bold text-xs">3. Save 25%–40%</span>
                  <p className="text-zinc-300">Get the exact same answers for wholesale discounted prices.</p>
                </div>
              </div>
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

        <DocsFeedback docTitle="GALXAI Developer Documentation Center" />
      </main>
    </div>
  );
}
