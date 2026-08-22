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
  Server,
  Globe,
  Coins,
  Copy,
  Check,
  Flame,
  Award,
  Clock,
  TrendingDown,
  Building2,
  DollarSign,
  ShieldCheck,
  Percent,
  CheckCheck,
  Gift
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { RoiCalculator } from '@/components/dashboard/RoiCalculator';
import { LiveArbitrageTicker } from '@/components/dashboard/LiveArbitrageTicker';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';
import { WorkloadEstimator } from '@/components/dashboard/WorkloadEstimator';
import { GuidedSetupWizard } from '@/components/dashboard/GuidedSetupWizard';
import { TrustSeals } from '@/components/common/TrustSeals';

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

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-12">
        {/* Hero Section with Aggressive GTM Value Hook */}
        <section className="glass-panel rounded-3xl p-6 sm:p-14 relative overflow-hidden text-center space-y-6 border border-amber-500/20 shadow-2xl">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

          {/* Live GTM Free Credit Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-xs font-mono font-bold text-emerald-300 shadow-lg shadow-emerald-500/10">
            <Flame className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            <span>CLAIM $5 FREE INSTANT KEY • 50% COMPUTE MATCH ON DEPOSITS • 0% ROUTER MARKUP</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Cut Your AI Token Bills by <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">25% to 40%</span>. Guaranteed.
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mx-auto">
              Stop paying retail prices or aggregator surcharge markups. GALXAI delivers direct wholesale pricing with <strong className="text-amber-300 font-bold">sub-15ms automated failover</strong>, <strong className="text-cyan-300 font-bold">75% prompt caching</strong>, and 100% drop-in SDK compatibility.
            </p>
          </div>

          {/* High-Converting CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/keys/new"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 flex items-center gap-2 hover:scale-[1.03] active:scale-98 transition-all cursor-pointer font-mono"
            >
              <Key className="w-4 h-4 text-black" />
              <span>Claim Your $5 Free API Key Now</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>

            <Link
              href="/docs/quickstart"
              className="px-6 py-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/15 text-white font-bold text-xs uppercase tracking-wider shadow-md flex items-center gap-2 transition-all hover:border-white/30 cursor-pointer"
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>30-Second API Quickstart</span>
            </Link>

            <ShareButton
              variant="pill"
              label="Share GALXAI"
              className="py-3.5 px-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold"
            />
          </div>

          {/* Social Proof & Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 max-w-3xl mx-auto border-t border-white/10 font-mono text-xs">
            <div className="space-y-0.5">
              <span className="text-zinc-400 text-[10px] uppercase">Routing Latency</span>
              <div className="text-white font-bold text-sm">&lt; 1ms Overhead</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-zinc-400 text-[10px] uppercase">Service Uptime</span>
              <div className="text-emerald-400 font-bold text-sm">99.99% Enterprise SLA</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-zinc-400 text-[10px] uppercase">Prompt Caching</span>
              <div className="text-cyan-400 font-bold text-sm">75% Automatic Rebate</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-zinc-400 text-[10px] uppercase">Wholesale Savings</span>
              <div className="text-amber-400 font-bold text-sm">25% to 40% OFF Retail</div>
            </div>
          </div>
        </section>

        {/* Real-Time Live Network Arbitrage Ticker */}
        <LiveArbitrageTicker />

        {/* Aggressive Competitor Comparison Ribbon */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-emerald-500/30">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <div className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center justify-center md:justify-start gap-1.5">
                <TrendingDown className="w-4 h-4" />
                <span>Market Disruptor Pricing vs. Competitors</span>
              </div>
              <h2 className="text-lg font-bold text-white">Why Pay Full Retail or Aggregator Surcharges?</h2>
            </div>
            <Link
              href="/pricing"
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all font-mono"
            >
              <span>View Full Pricing Matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs pt-2">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase">Direct OpenAI List</span>
              <div className="text-base font-bold text-zinc-400 line-through">$5.00 / 1M tokens</div>
              <span className="text-[10px] text-zinc-500">Retail rate • Single key rate limits</span>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[10px] text-rose-400 uppercase">Standard Gateways (OpenRouter)</span>
              <div className="text-base font-bold text-zinc-400 line-through">$5.25 / 1M tokens</div>
              <span className="text-[10px] text-rose-400">+5% Extra routing fee markup</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 space-y-1">
              <span className="text-[10px] text-emerald-400 uppercase font-bold">GALXAI Wholesale Gateway</span>
              <div className="text-lg font-black text-emerald-300">$3.75 / 1M tokens</div>
              <span className="text-[10px] text-emerald-400 font-bold">Save 25% Instant • 0% Markup</span>
            </div>
          </div>
        </section>

        {/* Universal 30-Second Guided Setup Wizard for Non-Technical & Technical Users */}
        <GuidedSetupWizard />

        {/* Founding Cohort Rate Lock & Capacity Scarcity Ribbon */}
        <RateLockRibbon />

        {/* Non-Technical Real-World Business Workload Spend Translator */}
        <WorkloadEstimator />

        {/* Interactive Dynamic ROI & Wholesale Arbitrage Calculator */}
        <RoiCalculator />

        {/* 100% Risk-Free Guarantee & Enterprise Assurance Banner */}
        <section className="glass-panel rounded-3xl p-6 sm:p-10 border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-black/40 to-indigo-600/10 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold uppercase border border-emerald-500/30">
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>100% Risk-Free Guarantee</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white">Save at Least 25% on In-Flight AI or Get Refunded</h3>
                <p className="text-xs text-zinc-300 max-w-xl leading-relaxed">
                  Route your production or testing traffic through GALXAI. If you don&apos;t achieve at least 25% net cost reductions compared to direct retail rates within your first 30 days, we will credit 100% of the difference directly back to your compute wallet.
                </p>
              </div>
            </div>

            <Link
              href="/keys/new"
              className="px-6 py-3.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25 shrink-0 whitespace-nowrap font-mono cursor-pointer"
            >
              <span>Get Risk-Free Key ($5 Credit)</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>
          </div>
        </section>

        {/* Consumer-Grade Trust Seals & Confidence Badges */}
        <TrustSeals />

        {/* 4 Enterprise Value Pillars */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-white">Why Developers &amp; Enterprises Choose GALXAI</h2>
            <p className="text-xs text-zinc-400">Zero vendor lock-in. Zero markup. Maximum throughput.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel rounded-3xl p-6 space-y-3 border border-white/10 hover:border-amber-500/30 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Coins className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">1. True Wholesale Rates</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Direct volume wholesaling saves 25% to 40% on every token. Zero gateway surcharge markup.
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-6 space-y-3 border border-white/10 hover:border-cyan-500/30 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">2. 75% Prompt Caching</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Repeated system prompts, system instructions, and RAG contexts automatically receive a 75% discount.
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-6 space-y-3 border border-white/10 hover:border-emerald-500/30 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">3. Sub-15ms Anycast Failover</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Multi-region upstream redundancy routing. If an upstream shard hiccups, your call seamlessly completes in &lt;15ms.
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-6 space-y-3 border border-white/10 hover:border-indigo-500/30 transition-all">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">4. Zero Data Retention</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                100% ephemeral in-flight stream processing. Prompts are never trained on or stored. SOC 2 &amp; HIPAA compliance ready.
              </p>
            </div>
          </div>
        </section>

        {/* 3 Simple Visual Steps */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-white">Get Started in 3 Simple Steps</h2>
            <p className="text-xs text-zinc-400">No complex cloud architecture to manage. Zero credit card needed to begin.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-mono font-bold text-sm">
                01
              </div>
              <h3 className="text-base font-bold text-white">Generate Your Gateway Key</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Sign up in 1 click and receive an instant live developer key (`galx_live_...`) pre-loaded with $5 in free compute credits.
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm">
                02
              </div>
              <h3 className="text-base font-bold text-white">Paste into Your App or IDE</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Point your existing OpenAI Python/Node client or Cursor IDE to `https://api.galx.ai/v1`. Zero syntax refactoring required.
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
                03
              </div>
              <h3 className="text-base font-bold text-white">Keep 25%–40% of Your Budget</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Enjoy wholesale token rates, automatic 75% prompt caching rebates, and high-throughput enterprise execution.
              </p>
            </div>
          </div>
        </section>

        {/* Featured Frontier Models Grid */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-amber-400" />
                Featured Frontier Model Catalog
              </h2>
              <p className="text-xs text-zinc-400">Direct access to the fastest reasoning, coding, and multimodal engines.</p>
            </div>
            <Link
              href="/models"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
            >
              <span>View All 12 Models &amp; Specs →</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredModels.map((m) => {
              const listIn = m.listPricePer1MInput || m.inputPricePer1M;
              const listOut = m.listPricePer1MOutput || m.outputPricePer1M;
              const effIn = m.inputPricePer1M;
              const effOut = m.outputPricePer1M;
              const discPct = Math.round((1 - (effIn + effOut) / (listIn + listOut)) * 100);

              return (
                <div
                  key={m.id}
                  className="glass-panel rounded-3xl p-5 space-y-4 border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">
                        {m.provider}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Save {discPct}%
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white font-mono truncate">{m.id}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2">{m.description}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5 font-mono text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Context:</span>
                      <span className="text-white font-bold">{(m.contextWindowTokens / 1000).toLocaleString()}K tokens</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>GALXAI Rate:</span>
                      <span className="text-emerald-300 font-bold">${m.inputPricePer1M.toFixed(2)} in / ${m.outputPricePer1M.toFixed(2)} out</span>
                    </div>
                    <Link
                      href={`/models/${m.id}`}
                      className="w-full mt-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span>View Model Specs</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
      <FloatingConversionDock />
      <LiveActivityToast />
      <ExitIntentModal />
    </div>
  );
}
