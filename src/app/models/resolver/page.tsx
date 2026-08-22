'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { ModelCatalog, EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';
import { Cpu, Search, CheckCircle2, ArrowRight, Zap, Rocket, Terminal } from 'lucide-react';

export default function ModelResolverPage() {
  const [query, setQuery] = useState('sol');

  const resolved = ModelCatalog.resolveModel(query.trim());

  const quickAliases = ['sol', 'terra', 'luna', 'grok', 'grok-4.5', 'gpt-image-2', 'dalle-3', 'imagine'];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Models', href: '/models' },
            { label: '0ms Model Alias Resolver' }
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-3 relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Cpu className="w-3.5 h-3.5" />
            <span>0MS MODEL ALIAS & CANONICAL RESOLVER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Universal Model Resolver</h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Test how GALXAI resolves shorthand aliases, provider prefixes, and legacy model strings to canonical frontier specifications in 0ms.
          </p>
        </div>

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
                placeholder="Type an alias (e.g. sol, grok, dalle)..."
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
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  resolved.provider === 'xai-grok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {resolved.provider === 'xai-grok' ? <Rocket className="w-5 h-5" /> : <Zap className="w-5 h-5 fill-amber-400" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{resolved.name}</h2>
                  <p className="text-xs text-zinc-400 font-mono">Canonical ID: <strong className="text-cyan-300">{resolved.id}</strong></p>
                </div>
              </div>

              <Link
                href={`/models/${resolved.id}`}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>View Model Specs</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 font-mono text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-zinc-500 text-[9px] uppercase block">Provider</span>
                <span className="text-white font-bold uppercase">{resolved.provider}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-zinc-500 text-[9px] uppercase block">Upstream ID</span>
                <span className="text-zinc-300 font-bold">{resolved.upstreamId}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-zinc-500 text-[9px] uppercase block">Context Window</span>
                <span className="text-cyan-300 font-bold">{resolved.contextWindowTokens.toLocaleString()} tok</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-zinc-500 text-[9px] uppercase block">Resolution Latency</span>
                <span className="text-emerald-400 font-bold">&lt; 0.05ms</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-3xl p-8 text-center text-zinc-500 text-xs font-mono">
            No matching model found for "{query}". Try "sol", "grok", or "dalle".
          </div>
        )}
      </main>
    </div>
  );
}
