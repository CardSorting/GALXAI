'use client';

import React from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Sparkles,
  Zap,
  TrendingDown,
  Clock,
  CheckCircle2,
  Code2,
  Cpu,
  Layers
} from 'lucide-react';

export default function PromptCachingDocsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'API & Model Reference', href: '/docs/api-reference' },
            { label: '75% Automated Prompt Caching' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Automated 75% Prompt Caching Guide</h1>
            <p className="text-xs text-zinc-400">
              Cut inference costs by 75% and slash Time-to-First-Token (TTFT) by up to 80% with zero code changes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>75% DISCOUNT PASS-THROUGH</span>
            </span>
          </div>
        </div>

        <DocsSubNav />

        {/* Value Proposition Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-emerald-500/30 bg-emerald-500/5">
            <span className="text-emerald-400 text-[10px] uppercase font-sans font-semibold">Cost Reduction</span>
            <div className="text-2xl font-black text-emerald-300">-75% Discount</div>
            <div className="text-[11px] text-emerald-400 font-sans">On all cached prompt prefix tokens</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-cyan-500/30 bg-cyan-500/5">
            <span className="text-cyan-400 text-[10px] uppercase font-sans font-semibold">Latency Acceleration</span>
            <div className="text-2xl font-black text-cyan-300">~65 ms TTFT</div>
            <div className="text-[11px] text-cyan-400 font-sans">Down from 450ms cold prefill</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
            <span className="text-zinc-500 text-[10px] uppercase font-sans">Code Refactoring Needed</span>
            <div className="text-2xl font-black text-white">0 Lines of Code</div>
            <div className="text-[11px] text-zinc-400 font-sans">100% automated prefix discovery</div>
          </div>
        </div>

        {/* How it Works Section */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              How Automated Prefix Caching Works
            </h2>
            <p className="text-xs text-zinc-400">
              When requests share the same prefix of 1,024+ tokens, the gateway matches the pre-computed KV-cache at the hardware layer.
            </p>
          </div>

          <div className="space-y-4 font-sans text-xs text-zinc-300 leading-relaxed">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 font-mono text-xs">
              <div className="text-amber-300 font-bold">1. Minimum Prefix Length:</div>
              <p className="text-zinc-400">
                Prompts with $\ge 1,024$ tokens of identical prefix (e.g. system prompt + tools array + static documentation) are automatically cached in 128-token increment blocks.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 font-mono text-xs">
              <div className="text-cyan-300 font-bold">2. Cache Lifetime & Refresh:</div>
              <p className="text-zinc-400">
                Cached prefixes persist for 5 to 10 minutes following the most recent request. Every subsequent request with the same prefix refreshes the cache TTL.
              </p>
            </div>
          </div>
        </div>

        {/* Best Practices Section */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-400" />
            Prompt Architecture Optimization Tips
          </h2>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <div className="text-white font-bold font-sans">✓ Place Static System Instructions First</div>
              <p className="text-zinc-400 font-sans text-xs">
                Always put your system prompts, agent guidelines, and schema definitions at the very beginning of the <code>messages</code> array.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <div className="text-white font-bold font-sans">✓ Keep Tool Definitions Static</div>
              <p className="text-zinc-400 font-sans text-xs">
                Ensure the <code>tools</code> function list maintains the same key ordering across requests to guarantee full cache hits.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <div className="text-white font-bold font-sans">✓ Append Variable User Content at the End</div>
              <p className="text-zinc-400 font-sans text-xs">
                Place dynamic user queries and ephemeral session state at the end of the prompt to maximize the cached prefix block.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
