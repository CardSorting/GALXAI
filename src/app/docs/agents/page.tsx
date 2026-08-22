'use client';

import React from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { DocsFeedback } from '@/components/dashboard/DocsFeedback';
import {
  Bot,
  Zap,
  Activity,
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Code2,
  Sparkles,
  ArrowRight,
  Terminal
} from 'lucide-react';

export default function AgentsDocsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'AI Agents & Autonomous Swarms' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">AI Agents & Autonomous Swarms Hub</h1>
            <p className="text-xs text-zinc-400">
              High-concurrency infrastructure engineered specifically for agent swarms, tool-calling loops, and autonomous reasoning workflows.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              <span>AGENT SWARM OPTIMIZED</span>
            </span>
          </div>
        </div>

        <DocsSubNav />

        {/* Core Agent Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-indigo-500/30 bg-indigo-500/5">
            <span className="text-indigo-400 text-[10px] uppercase font-sans font-semibold">Failover Speed</span>
            <div className="text-2xl font-black text-indigo-300">&lt; 15 ms Failover</div>
            <div className="text-[11px] text-indigo-400 font-sans">Zero agent crashes on upstream outages</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-emerald-500/30 bg-emerald-500/5">
            <span className="text-emerald-400 text-[10px] uppercase font-sans font-semibold">Agent Tool Caching</span>
            <div className="text-2xl font-black text-emerald-300">75% Prefix Cache</div>
            <div className="text-[11px] text-emerald-400 font-sans">Massive savings on repetitive agent tools</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-cyan-500/30 bg-cyan-500/5">
            <span className="text-cyan-400 text-[10px] uppercase font-sans font-semibold">Concurrency Ceiling</span>
            <div className="text-2xl font-black text-cyan-300">1,200 RPM</div>
            <div className="text-[11px] text-cyan-400 font-sans">Smooth multi-worker parallel execution</div>
          </div>
        </div>

        {/* Why GALXAI for Agents? */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Why Autonomous Agents Need Specialized Gateway Routing
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs text-zinc-300">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="text-white font-bold text-sm">1. Avoiding 429 Rate Limit Death Spirals</div>
              <p className="text-zinc-400 leading-relaxed">
                When 10 sub-agents spawn in parallel, standard API accounts instantly hit 429 rate limit ceilings. GALXAI's continuous token calculus smoothly distributes concurrency with zero artificial minute-boundary throttling.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="text-white font-bold text-sm">2. Sub-15ms Dynamic Route Switching</div>
              <p className="text-zinc-400 leading-relaxed">
                If an upstream provider experiences transient packet loss during a multi-step agent workflow, GALXAI dynamically switches channels in under 15ms so your agent never crashes mid-turn.
              </p>
            </div>
          </div>
        </div>

        {/* Autonomous Swarm Code Pattern */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              Autonomous Agent Loop with Parallel Tool Execution (Python)
            </h3>
            <Link
              href="/docs/cookbook"
              className="text-xs font-mono text-amber-300 hover:underline flex items-center gap-1"
            >
              <span>View all Cookbooks →</span>
            </Link>
          </div>

          <pre className="p-4 rounded-2xl bg-black/60 border border-white/5 font-mono text-xs text-cyan-300 overflow-x-auto">
            <code>{`from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# High-reliability agent turn with automated retry and prompt caching
def execute_agent_step(messages, tools):
    return client.chat.completions.create(
        model="gpt-5.6-sol",
        messages=messages,
        tools=tools,
        tool_choice="auto",
        temperature=0.2
    )`}</code>
          </pre>
        </div>

        <DocsFeedback docTitle="AI Agents & Autonomous Swarms Hub" />
      </main>
    </div>
  );
}
