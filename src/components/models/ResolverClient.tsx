'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { ModelCatalog } from '@/core/router/ModelCatalog';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';
import { Cpu, Search, CheckCircle2, ArrowRight, Zap, Rocket } from 'lucide-react';

export function ResolverClient() {
  const [query, setQuery] = useState('sol');

  const resolved = ModelCatalog.resolveModel(query.trim());

  const quickAliases = [
    'gpt-5',
    'sol',
    'terra',
    'luna',
    'claude-3-7-sonnet',
    'deepseek-r1',
    'o3-mini',
    'fast',
    'cheap',
    'coding',
    'image',
    'embedding',
    'dalle-3',
    'openai/gpt-5.6-sol:latest',
    '@anthropic/claude-3-5-sonnet',
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Models', href: '/models' },
            { label: '0ms Model Alias Resolver' },
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-3 relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Cpu className="w-3.5 h-3.5" />
            <span>0MS MODEL ALIAS &amp; CANONICAL RESOLVER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Universal Model Resolver</h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Test how GALXAI resolves shorthand aliases, provider prefixes, and legacy model strings to canonical frontier specifications in 0ms.
          </p>
        </div>

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* Search Input */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">Test Model String or Alias</label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type an alias (e.g. sol, terra, luna, dalle)..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Quick Preset Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-zinc-500 font-mono">Quick Try:</span>
            {quickAliases.map((alias) => (
              <button
                key={alias}
                onClick={() => setQuery(alias)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[11px] font-mono cursor-pointer transition-colors"
              >
                {alias}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution Output Card */}
        {resolved ? (
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-cyan-500/30 space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Zap className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400">Input: &quot;{query}&quot; →</span>
                    <span className="text-base font-bold text-white font-mono">{resolved.id}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Resolved in 0ms (In-Memory Trie)
                  </span>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/30">
                -{resolved.discountPercentage}% OFF
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Provider</span>
                <span className="text-white font-bold">{resolved.provider}</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Context Window</span>
                <span className="text-cyan-300 font-bold">{resolved.category === 'image' ? '1024x1024' : `${(resolved.contextWindowTokens / 1000).toLocaleString()}K`}</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Wholesale In / 1M</span>
                <span className="text-emerald-300 font-bold">${resolved.inputPricePer1M.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Wholesale Out / 1M</span>
                <span className="text-emerald-300 font-bold">${resolved.outputPricePer1M.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                href={`/models/${resolved.id.replace('/', '-')}`}
                className="text-xs font-mono text-cyan-300 hover:text-cyan-200 flex items-center gap-1"
              >
                <span>View full specs for {resolved.id}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>

              <Link
                href="/keys/new"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black text-xs font-bold font-mono flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>Deploy This Model ($5 Free)</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-3xl p-8 text-center space-y-2 border border-rose-500/20 bg-rose-500/5">
            <p className="text-sm text-zinc-300 font-mono">No direct match for &quot;{query}&quot;.</p>
            <p className="text-xs text-zinc-500">
              Try shorthand aliases like <strong className="text-zinc-300">sol</strong>, <strong className="text-zinc-300">terra</strong>, <strong className="text-zinc-300">luna</strong>, or <strong className="text-zinc-300">dalle</strong>.
            </p>
          </div>
        )}

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
      <FloatingConversionDock />
      <LiveActivityToast />
      <ExitIntentModal />
    </div>
  );
}
