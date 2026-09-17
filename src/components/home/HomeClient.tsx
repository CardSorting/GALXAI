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
  Scale,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { RoiCalculator } from '@/components/dashboard/RoiCalculator';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { GuidedSetupWizard } from '@/components/dashboard/GuidedSetupWizard';
import { TrustSeals } from '@/components/common/TrustSeals';
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
        {/* STORYBOARD PROGRESSION TRACK (DESKTOP)                                    */}
        {/* ========================================================================= */}
        <nav aria-label="Storyboard Progression" className="hidden lg:flex items-center justify-between p-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-[11px] font-mono shadow-xl">
          {[
            { id: 'hero-summary', label: '01 / Gateway' },
            { id: 'core-value-proposition', label: '02 / Architecture' },
            { id: 'savings-calculator', label: '03 / Savings Math' },
            { id: 'developer-quickstart', label: '04 / Drop-In Setup' },
            { id: 'why-switch', label: '05 / Why Switch' },
            { id: 'guarantee', label: '06 / Risk Reversal' },
            { id: 'faq', label: '07 / FAQ' },
          ].map((step, idx, arr) => (
            <React.Fragment key={step.id}>
              <a
                href={`#${step.id}`}
                className="px-2.5 py-1 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors font-bold whitespace-nowrap"
              >
                {step.label}
              </a>
              {idx < arr.length - 1 && <span className="text-zinc-600">→</span>}
            </React.Fragment>
          ))}
        </nav>

        {/* ========================================================================= */}
        {/* ACT 1: HERO HOOK & LIVE EDGE ROUTER                                       */}
        {/* ========================================================================= */}
        <section id="hero-summary" className="glass-panel rounded-3xl p-6 sm:p-10 relative overflow-hidden text-center space-y-5 border border-amber-500/20 shadow-2xl">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />

          {/* Live GTM Free Credit Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-xs font-mono font-bold text-emerald-300 shadow-lg shadow-emerald-500/10">
            <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span>$5 FREE COMPUTE • 0% GATEWAY MARKUP</span>
          </div>

          <div className="space-y-2.5 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Cut AI Token Costs by <span className="text-amber-400 font-black">25% to 40%</span>.
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mx-auto font-sans">
              Drop-in gateway for OpenAI, Cursor, and Anthropic. <strong className="text-amber-300 font-bold">Wholesale rates</strong>, <strong className="text-cyan-300 font-bold">75% prompt caching</strong>, and <strong className="text-emerald-300 font-bold">zero 429 stalls</strong>.
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
              href="/keys"
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
        </section>

        {/* ========================================================================= */}
        {/* ACT 2: THE ARCHITECTURE & VALUE PROPOSITIONS                              */}
        {/* ========================================================================= */}
        <section id="core-value-proposition" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                02 / ARCHITECTURE
              </span>
              <h2 className="text-lg font-bold text-white">
                How GALXAI Eliminates AI Token Markup
              </h2>
            </div>
            <span className="text-xs text-zinc-500 font-mono hidden sm:inline">0 Code Changes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="glass-panel rounded-2xl p-4.5 space-y-1.5 border border-white/10 hover:border-amber-500/30 transition-all">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Coins className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-white">Sustainable Rates</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Predictable, low-overhead developer rates on GALX Nova and Nova-image.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-4.5 space-y-1.5 border border-white/10 hover:border-cyan-500/30 transition-all">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-white">Zero 429 Stalls</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Automatic high-availability failover prevents agent loops from hitting rate limits.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-4.5 space-y-1.5 border border-white/10 hover:border-indigo-500/30 transition-all">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Laptop className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-white">1 Key for All Stacks</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                One balance powers Cursor, Windsurf, Claude Code, Python, and TypeScript.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-4.5 space-y-1.5 border border-white/10 hover:border-emerald-500/30 transition-all">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Terminal className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-white">75% Prompt Caching</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                100% of upstream prefix caching discounts passed directly to your wallet.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* ACT 3: UNIT ECONOMICS & SAVINGS CALCULATOR                                */}
        {/* ========================================================================= */}
        <section id="savings-calculator" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              03 / SAVINGS MATH
            </span>
            <span className="text-xs font-mono text-zinc-400">Calculate Exact Dollar Reductions</span>
          </div>
          <ErrorBoundary name="ROI Calculator" autoRetry={true}>
            <RoiCalculator />
          </ErrorBoundary>
        </section>

        {/* ========================================================================= */}
        {/* ACT 4: DROP-IN SETUP (30 SECONDS)                                         */}
        {/* ========================================================================= */}
        <section id="developer-quickstart" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
              04 / DROP-IN SETUP
            </span>
            <span className="text-xs font-mono text-zinc-400">Point baseURL to https://galx.ai/v1</span>
          </div>
          <GuidedSetupWizard />
        </section>

        {/* ========================================================================= */}
        {/* ACT 5: WHY SWITCH (GATEWAY COMPARISON)                                     */}
        {/* ========================================================================= */}
        <section id="why-switch" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5 border border-amber-500/20 bg-gradient-to-b from-amber-950/10 via-black/40 to-black/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold uppercase">
                <Scale className="w-3 h-3 text-amber-400" />
                <span>05 / WHY SWITCH</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Why Switch to GALXAI vs Existing Gateways
              </h2>
            </div>

            <Link
              href="/pricing"
              className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline self-start sm:self-auto"
            >
              <span>View Wholesale Pricing →</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
            <Link
              href="/alternatives/openrouter"
              className="p-4 rounded-2xl bg-black/50 border border-white/10 hover:border-amber-500/40 hover:bg-white/[0.03] transition-all group space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-white group-hover:text-amber-300 transition-colors">vs OpenRouter</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">0% Fee</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                  0% platform fee and wholesale rates vs OpenRouter&apos;s +5.5% token surcharge.
                </p>
              </div>
              <span className="text-[10px] text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                <span>Compare OpenRouter</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </Link>

            <Link
              href="/alternatives/portkey"
              className="p-4 rounded-2xl bg-black/50 border border-white/10 hover:border-amber-500/40 hover:bg-white/[0.03] transition-all group space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-white group-hover:text-amber-300 transition-colors">vs Portkey</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">No Seats</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                  Pay-as-you-go wholesale rates with zero enterprise seat minimums or lock-in.
                </p>
              </div>
              <span className="text-[10px] text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                <span>Compare Portkey</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </Link>

            <Link
              href="/alternatives/together-ai"
              className="p-4 rounded-2xl bg-black/50 border border-white/10 hover:border-amber-500/40 hover:bg-white/[0.03] transition-all group space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-white group-hover:text-amber-300 transition-colors">vs Together AI</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">-25% to -40%</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                  Wholesale volume pricing on flagship OpenAI and Claude models vs retail list rates.
                </p>
              </div>
              <span className="text-[10px] text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                <span>Compare Together</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </Link>

            <Link
              href="/alternatives/litellm"
              className="p-4 rounded-2xl bg-black/50 border border-white/10 hover:border-amber-500/40 hover:bg-white/[0.03] transition-all group space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-white group-hover:text-amber-300 transition-colors">vs LiteLLM</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Managed</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                  Managed edge routing with automatic failover vs self-hosted proxy operations.
                </p>
              </div>
              <span className="text-[10px] text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                <span>Compare LiteLLM</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* ACT 6: 100% RISK REVERSAL                                                 */}
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
                  <span>06 / 100% Risk Reversal</span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-white">Save at Least 25% or Get Refunded</h3>
                <p className="text-xs text-zinc-300 max-w-xl leading-relaxed font-sans">
                  If you don&apos;t save at least 25% vs provider list prices in your first 30 days, we refund 100% of the difference.
                </p>
              </div>
            </div>

            <Link
              href="/keys"
              className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/25 shrink-0 whitespace-nowrap font-mono cursor-pointer"
            >
              <span>Claim Key ($5 Credit)</span>
              <ArrowRight className="w-3 h-3 text-black" />
            </Link>
          </div>
        </section>

        {/* Consumer-Grade Trust Seals & Confidence Badges */}
        <TrustSeals />

        {/* ========================================================================= */}
        {/* ACT 7: FREQUENTLY ASKED QUESTIONS                                         */}
        {/* ========================================================================= */}
        <section id="faq" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold uppercase">
                <HelpCircle className="w-3 h-3 text-amber-400" />
                <span>07 / FAQ</span>
              </div>
              <h2 className="text-lg font-bold text-white">
                Frequently Asked Questions
              </h2>
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
