'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';
import {
  Zap,
  Rocket,
  Shield,
  Key,
  Terminal,
  Code2,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Activity,
  CreditCard,
  Lock,
  GitCompare,
  Swords,
  Server,
  Globe
} from 'lucide-react';

export default function HomePage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/pool/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {});
  }, []);

  const featuredModels = EXCLUSIVE_MODEL_CATALOG.filter(m => m.category === 'llm');
  const imageModels = EXCLUSIVE_MODEL_CATALOG.filter(m => m.category === 'image');

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-16">
        {/* Hero Section */}
        <section className="glass-panel rounded-3xl p-6 sm:p-14 relative overflow-hidden text-center space-y-6">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/20 via-cyan-500/15 to-emerald-500/20 rounded-full blur-[140px] pointer-events-none" />

          {/* Live Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs font-mono font-semibold text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>UNIVERSAL AI GATEWAY • 99.99% UPTIME • SUB-SECOND LATENCY</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              One Unified API for the World's Best AI Models
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl mx-auto">
              Access flagship <strong className="text-amber-300 font-semibold">OpenAI Codex</strong> (GPT-5.6 Sol, Terra, Luna) and <strong className="text-emerald-300 font-semibold">xAI Grok 4.5</strong> through a single standard endpoint. High concurrency, automated failover, and transparent per-token billing.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/keys/new"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-2 hover:scale-[1.02] active:scale-98 transition-all"
            >
              <Key className="w-4 h-4 text-black" />
              <span>Get API Key</span>
            </Link>

            <Link
              href="/playground"
              className="px-6 py-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-white font-bold text-xs uppercase tracking-wider shadow-md flex items-center gap-2 transition-all hover:border-white/20"
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Try in Playground</span>
            </Link>

            <Link
              href="/models"
              className="px-5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <span>Explore Models & Pricing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 max-w-3xl mx-auto border-t border-white/10 font-mono text-xs">
            <div className="space-y-0.5">
              <span className="text-zinc-500 text-[10px] uppercase">Routing Latency</span>
              <div className="text-white font-bold text-sm">&lt; 20ms Overhead</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-zinc-500 text-[10px] uppercase">Service Uptime</span>
              <div className="text-emerald-400 font-bold text-sm">99.99% SLA</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-zinc-500 text-[10px] uppercase">Max Context</span>
              <div className="text-cyan-300 font-bold text-sm">500K Tokens</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-zinc-500 text-[10px] uppercase">API Standard</span>
              <div className="text-amber-300 font-bold text-sm">OpenAI Drop-in</div>
            </div>
          </div>
        </section>

        {/* 3-Step Quickstart */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-white">Start Building in 60 Seconds</h2>
            <p className="text-xs text-zinc-400">Zero custom SDKs needed. Drop in as a 1-line base URL replacement.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="glass-card rounded-3xl p-6 border border-white/5 space-y-3 relative overflow-hidden group">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black text-sm">
                01
              </div>
              <h3 className="text-base font-bold text-white">1. Generate API Key</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Create a universal <code className="text-cyan-300 font-mono">galx_live_...</code> bearer token with configurable rate limits.
              </p>
              <Link
                href="/keys/new"
                className="text-xs text-amber-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform"
              >
                <span>Create Key</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Step 2 */}
            <div className="glass-card rounded-3xl p-6 border border-white/5 space-y-3 relative overflow-hidden group">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-black text-sm">
                02
              </div>
              <h3 className="text-base font-bold text-white">2. Select Your Model</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Choose from state-of-the-art coding engines, massive 500K context reasoning, or high-fidelity image models.
              </p>
              <Link
                href="/models"
                className="text-xs text-cyan-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform"
              >
                <span>View Models</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Step 3 */}
            <div className="glass-card rounded-3xl p-6 border border-white/5 space-y-3 relative overflow-hidden group">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black text-sm">
                03
              </div>
              <h3 className="text-base font-bold text-white">3. Send Requests</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Point your standard OpenAI Python / TypeScript client to <code className="text-emerald-300 font-mono">http://localhost:3000/v1</code>.
              </p>
              <Link
                href="/docs"
                className="text-xs text-emerald-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform"
              >
                <span>Read Docs</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Models Grid */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                Featured Models & Pricing
              </h2>
              <p className="text-xs text-zinc-400">Exact per-token pricing with zero hidden fees.</p>
            </div>
            <Link
              href="/models"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
            >
              <span>View All 12 Models</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredModels.map((model) => {
              const isGrok = model.provider === 'xai-grok';
              return (
                <div
                  key={model.id}
                  className="glass-card rounded-3xl p-6 border border-white/5 space-y-4 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isGrok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {isGrok ? <Rocket className="w-4 h-4" /> : <Zap className="w-4 h-4 fill-amber-400" />}
                        </div>
                        <div>
                          <Link href={`/models/${model.id.replace('/', '-')}`} className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                            {model.id}
                          </Link>
                          <p className="text-[10px] text-zinc-500 font-mono uppercase">{model.name}</p>
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold border border-indigo-500/30">
                        {model.contextWindowTokens / 1000}K Context
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                      {model.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between font-mono text-xs">
                    <div className="space-x-2">
                      <span className="text-zinc-400">${model.inputPricePer1M.toFixed(2)}/1M in</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-400">${model.outputPricePer1M.toFixed(2)}/1M out</span>
                    </div>

                    <Link
                      href={`/playground?model=${model.id}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-sans font-semibold flex items-center gap-1"
                    >
                      <span>Try</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 1-Line Code Preview */}
        <section className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-amber-400" />
              Standard Client Integration
            </h2>
            <Link href="/docs" className="text-xs text-zinc-400 hover:text-white font-mono">
              View Full SDK Docs →
            </Link>
          </div>

          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-zinc-200 border border-white/10 overflow-x-auto selection:bg-amber-500 selection:text-black">
            <code>{`from openai import OpenAI

# Initialize client with GALXAI universal endpoint
client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="galx_live_your_gateway_key"
)

# Route instantly across Sol, Terra, Luna, or Grok
response = client.chat.completions.create(
    model="gpt-5.6-sol", # or "x-ai/grok-4.5"
    messages=[{"role": "user", "content": "Explain distributed caching."}],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="", flush=True)`}</code>
          </pre>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-white/5 py-8 text-center text-xs text-zinc-400 space-y-2">
        <div className="flex items-center justify-center gap-4">
          <Link href="/models" className="hover:text-white">Models</Link>
          <Link href="/playground" className="hover:text-white">Playground</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/docs" className="hover:text-white">Docs</Link>
          <Link href="/keys" className="hover:text-white">API Keys</Link>
          <Link href="/faq" className="hover:text-white">FAQ</Link>
          <Link href="/status" className="hover:text-white">Status</Link>
        </div>
        <p className="text-[11px] text-zinc-400 font-mono">
          GALXAI — Universal AI Model Router & API Gateway
        </p>
      </footer>
    </div>
  );
}
