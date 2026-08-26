'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import {
  Key,
  Terminal,
  ArrowRight,
  Coins,
  Copy,
  Check,
  Flame,
  ShieldCheck,
  CheckCheck,
  Laptop,
  Zap,
  Activity,
  Cpu,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { RoiCalculator } from '@/components/dashboard/RoiCalculator';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { GuidedSetupWizard } from '@/components/dashboard/GuidedSetupWizard';
import { TrustSeals } from '@/components/common/TrustSeals';
import { HeroZenithConsole } from '@/components/dashboard/HeroZenithConsole';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { FAQS } from '@/lib/data/faqData';

export function HomeClient() {
  const [copiedCli, setCopiedCli] = useState(false);

  const handleCopyCli = async () => {
    const success = await safeCopyToClipboard('npx galxai "Explain continuous token caching in 10 words"');
    if (success) {
      setCopiedCli(true);
      setTimeout(() => setCopiedCli(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION & LIVE CLEARINGHOUSE STREAMER                             */}
        {/* ========================================================================= */}
        <section id="hero-summary" className="glass-panel rounded-3xl p-6 sm:p-10 relative overflow-hidden text-center space-y-5 border border-amber-500/20 shadow-2xl">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />

          {/* Live GTM Free Credit Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-xs font-mono font-bold text-emerald-300 shadow-lg shadow-emerald-500/10">
            <Flame className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span>WHOLESALE TOKEN CLEARINGHOUSE • ZERO RATE-LIMIT STALLS • $5 FREE INSTANT CREDIT</span>
          </div>

          <div className="space-y-2.5 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Cut Your AI Token Bills by <span className="text-amber-400 font-black">25% to 40%</span>.
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mx-auto font-sans">
              Drop in your existing OpenAI, Anthropic, or Cursor configuration to get <strong className="text-amber-300 font-bold">direct wholesale pricing</strong>, <strong className="text-cyan-300 font-bold">75% prompt caching</strong>, and <strong className="text-emerald-300 font-bold">zero rate-limit stalls</strong> with zero code rewrites.
            </p>
          </div>

          {/* Zero-Install Instant CLI Bar & Quick CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1 font-mono text-xs">
            <div className="p-2 rounded-2xl bg-black/60 border border-white/15 flex items-center justify-between gap-2 max-w-md w-full shadow-inner">
              <div className="flex items-center gap-2 pl-2 text-zinc-300 truncate">
                <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-zinc-500 select-none">$</span>
                <span className="text-emerald-300 font-bold truncate">npx galxai &quot;Explain caching in 10 words&quot;</span>
              </div>
              <button
                onClick={handleCopyCli}
                className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer text-[11px]"
              >
                {copiedCli ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCli ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <Link
              href="/keys/new"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-1.5 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer shrink-0"
            >
              <Key className="w-3.5 h-3.5 text-black" />
              <span>Claim Free $5 Key</span>
              <ArrowRight className="w-3.5 h-3.5 text-black" />
            </Link>

            <ShareButton
              variant="pill"
              label="Share"
              className="py-2.5 px-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold"
            />
          </div>

          {/* Interactive Zenith-Tier Live Arbitrage & Execution Console */}
          <div className="pt-2 max-w-5xl mx-auto text-left">
            <ErrorBoundary name="Hero Zenith Console" autoRetry={true}>
              <HeroZenithConsole />
            </ErrorBoundary>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. THE 4 SUPERPOWERS GALXAI ADDS TO YOUR STACK                            */}
        {/* ========================================================================= */}
        <section id="core-value-proposition" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Why Modern Engineering Teams Route Through GALXAI</span>
            </h2>
            <span className="text-xs text-zinc-500 font-mono">1-Line Setup</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="glass-panel rounded-2xl p-4.5 space-y-1.5 border border-white/10 hover:border-amber-500/30 transition-all">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Coins className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-white">25%–40% Wholesale Pass</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Get direct wholesale discounts on OpenAI GPT-5.6 with 0% gateway markup.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-4.5 space-y-1.5 border border-white/10 hover:border-cyan-500/30 transition-all">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-white">Zero Rate Limit Stalls</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                High-availability automatic failover ensures your autonomous agent loops never crash from 429 errors.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-4.5 space-y-1.5 border border-white/10 hover:border-indigo-500/30 transition-all">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Laptop className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-white">1 Key for All Stacks</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                One wallet powers Cursor, Windsurf, Claude Code, Python, and TypeScript with unified logs.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-4.5 space-y-1.5 border border-white/10 hover:border-emerald-500/30 transition-all">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Terminal className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-white">75% Prompt Cache Rebate</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Shared prompt prefixes stay warm in Anycast RAM, slashing recurring context costs by 75%.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. DYNAMIC MONTHLY ROI SAVINGS CALCULATOR                                 */}
        {/* ========================================================================= */}
        <section id="savings-calculator" className="space-y-3">
          <ErrorBoundary name="ROI Calculator" autoRetry={true}>
            <RoiCalculator />
          </ErrorBoundary>
        </section>

        {/* ========================================================================= */}
        {/* 4. UNIVERSAL 30-SECOND INTEGRATION WIZARD                                 */}
        {/* ========================================================================= */}
        <section id="developer-quickstart" className="space-y-3">
          <GuidedSetupWizard />
        </section>

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* ========================================================================= */}
        {/* 5. 100% RISK-FREE REFUND GUARANTEE & TRUST SEALS                          */}
        {/* ========================================================================= */}
        <section id="guarantee" className="glass-panel rounded-3xl p-5 sm:p-7 border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-black/40 to-indigo-600/10 shadow-xl space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 text-left">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold uppercase border border-emerald-500/30">
                  <CheckCheck className="w-3 h-3" />
                  <span>100% Risk-Free Guarantee</span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-white">Save at Least 25% on In-Flight AI or Get Refunded</h3>
                <p className="text-xs text-zinc-300 max-w-xl leading-relaxed font-sans">
                  Route your traffic through GALXAI. If you don&apos;t save at least 25% vs direct provider list prices in 30 days, we credit 100% of the difference directly back to your balance.
                </p>
              </div>
            </div>

            <Link
              href="/keys/new"
              className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/25 shrink-0 whitespace-nowrap font-mono cursor-pointer"
            >
              <span>Claim Key ($5 Credit)</span>
              <ArrowRight className="w-3 h-3 text-black" />
            </Link>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. BEYOND-THE-FOLD INTERACTIVE DEVELOPER TOOL SUITE & pSEO MATRIX         */}
        {/* ========================================================================= */}
        <section id="developer-tools-matrix" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-8 border border-cyan-500/20 bg-gradient-to-b from-cyan-950/20 via-black/40 to-black/60 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>INTERACTIVE DEVELOPER LAUNCHPAD</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
                Engineered for High-Throughput AI Builders
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl font-sans">
                Explore free browser-based architectural simulators, token calculators, and head-to-head frontier model benchmarks.
              </p>
            </div>

            <Link
              href="/docs/quickstart"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold border border-white/10 flex items-center gap-2 self-start md:self-auto transition-all"
            >
              <span>Read API Docs →</span>
            </Link>
          </div>

          {/* Interactive Tools Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase font-bold text-cyan-400 tracking-wider">
                Free Developer Tools &amp; Simulators
              </span>
              <span className="text-[11px] font-mono text-zinc-500">100% Client-Side • Instant Output</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  title: 'Context Window Visualizer',
                  desc: 'Model 1M token capacities, AST code lines, and 75% prompt caching breakpoints.',
                  badge: '1M TOKENS',
                  href: '/tools/context-window-visualizer',
                  tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
                },
                {
                  title: 'Latency & TTFT Estimator',
                  desc: 'Simulate Anycast edge TLS termination vs origin round-trip streaming velocity.',
                  badge: '<12MS TTFT',
                  href: '/tools/latency-estimator',
                  tagColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
                },
                {
                  title: 'Token Counter Studio',
                  desc: 'Inspect Byte-Pair Encoding subwords for o200k_base and cl100k_base vocabularies.',
                  badge: 'BPE STUDIO',
                  href: '/tools/token-counter',
                  tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                },
                {
                  title: 'Prompt Caching Calculator',
                  desc: 'Calculate exact 75% prefix caching discounts across high-volume agent prompts.',
                  badge: '-75% SAVINGS',
                  href: '/tools/prompt-caching-calculator',
                  tagColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
                },
                {
                  title: 'Model Cost Comparator',
                  desc: 'Compare token rates across 15+ frontier models with instant wholesale pricing.',
                  badge: 'ARBITRAGE',
                  href: '/tools/model-cost-comparator',
                  tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                },
                {
                  title: 'JSON Schema Generator',
                  desc: 'Generate Zod and Pydantic schemas for guaranteed structured JSON outputs.',
                  badge: 'STRUCTURED',
                  href: '/tools/json-schema-generator',
                  tagColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
                },
                {
                  title: 'Function Calling Studio',
                  desc: 'Build and validate parallel tool-calling schemas for multi-agent workflows.',
                  badge: 'AGENT TOOLS',
                  href: '/tools/function-calling-builder',
                  tagColor: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
                },
                {
                  title: 'Prompt Compressor',
                  desc: 'Compress repetitive instructions by up to 35% without losing semantic intent.',
                  badge: '-35% TOKENS',
                  href: '/tools/prompt-compressor',
                  tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
                },
              ].map((tool, idx) => (
                <Link
                  key={idx}
                  href={tool.href}
                  className="p-4 rounded-2xl bg-black/50 border border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.03] transition-all group flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${tool.tagColor}`}>
                        {tool.badge}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 font-sans transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans line-clamp-2">
                      {tool.desc}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 font-semibold">Launch Tool →</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Model Matchups & Alternatives Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase">Head-to-Head Model Matchups</span>
                <Link href="/models/compare" className="text-[11px] font-mono text-zinc-400 hover:text-white">
                  All Comparisons →
                </Link>
              </div>
              <div className="space-y-1.5 font-mono text-xs">
                {[
                  { name: 'GPT-5.6 Sol vs GPT-5.6 Terra', href: '/models/vs/gpt-5.6-sol-vs-gpt-5.6-terra', delta: 'Flagship vs Workhorse' },
                  { name: 'GPT-5.6 Sol vs GPT-5.6 Luna', href: '/models/vs/gpt-5.6-sol-vs-gpt-5.6-luna', delta: 'Reasoning vs Velocity' },
                  { name: 'GPT-5.6 Terra vs GPT-5.6 Luna', href: '/models/vs/gpt-5.6-terra-vs-gpt-5.6-luna', delta: 'Balanced vs Velocity' },
                  { name: 'GPT-Image-2 vs GPT-Image-1.5', href: '/models/vs/openai-gpt-image-2-vs-openai-gpt-image-1.5', delta: '4K Studio vs Agile' },
                ].map((m, idx) => (
                  <Link
                    key={idx}
                    href={m.href}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-[11px]"
                  >
                    <span>{m.name}</span>
                    <span className="text-amber-300 font-sans text-[10px]">{m.delta} →</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">Gateway Alternative Portals</span>
                <Link href="/pricing" className="text-[11px] font-mono text-zinc-400 hover:text-white">
                  Wholesale Rates →
                </Link>
              </div>
              <div className="space-y-1.5 font-mono text-xs">
                {[
                  { name: 'Portkey vs GALXAI', href: '/alternatives/portkey', delta: '0% Surcharge vs Enterprise Fees' },
                  { name: 'Together AI vs GALXAI', href: '/alternatives/together-ai', delta: 'Wholesale vs Retail Compute' },
                  { name: 'OpenRouter vs GALXAI', href: '/alternatives/openrouter', delta: '0% Fee vs +5.5% Markup' },
                  { name: 'LiteLLM vs GALXAI', href: '/alternatives/litellm', delta: 'Managed Anycast vs Self-Host Ops' },
                ].map((alt, idx) => (
                  <Link
                    key={idx}
                    href={alt.href}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-[11px]"
                  >
                    <span>{alt.name}</span>
                    <span className="text-cyan-300 font-sans text-[10px]">{alt.delta} →</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. BEYOND-THE-FOLD DEVELOPER KNOWLEDGE & FAQ                              */}
        {/* ========================================================================= */}
        <section id="faq" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Frequently Asked Questions &amp; Technical Architecture</span>
              </h2>
              <p className="text-xs text-zinc-400">Everything you need to know about wholesale pricing, 75% caching, and zero data retention.</p>
            </div>

            <Link
              href="/faq"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
            >
              <span>View All FAQs →</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAQS.slice(0, 6).map((faq) => (
              <div
                key={faq.id}
                className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2"
              >
                <h3 className="text-xs font-bold text-white font-sans flex items-start gap-2">
                  <span className="text-amber-400 font-mono">Q:</span>
                  <span>{faq.q}</span>
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans pl-5">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Consumer-Grade Trust Seals & Confidence Badges */}
        <TrustSeals />
      </main>

      {/* Floating Conversion Dock */}
      <ErrorBoundary name="Floating Conversion Dock">
        <FloatingConversionDock />
      </ErrorBoundary>
    </div>
  );
}
