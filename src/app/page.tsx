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
  Laptop
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

export default function HomePage() {
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
        <section className="glass-panel rounded-3xl p-6 sm:p-10 relative overflow-hidden text-center space-y-5 border border-amber-500/20 shadow-2xl">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />

          {/* Live GTM Free Credit Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-xs font-mono font-bold text-emerald-300 shadow-lg shadow-emerald-500/10">
            <Flame className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span>WHOLESALE TOKEN CLEARINGHOUSE • ZERO RATE-LIMIT STALLS • $5 FREE INSTANT CREDIT</span>
          </div>

          <div className="space-y-2.5 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Cut Your AI Token Bills by <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">25% to 40%</span>.
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
        <section className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="glass-panel rounded-2xl p-4.5 space-y-1.5 border border-white/10 hover:border-amber-500/30 transition-all">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Coins className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-white">25%–40% Wholesale Pass</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Get direct wholesale discounts on GPT-5.6 and Grok 4.6 with 0% gateway markup.
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
        <section className="space-y-3">
          <ErrorBoundary name="ROI Calculator" autoRetry={true}>
            <RoiCalculator />
          </ErrorBoundary>
        </section>

        {/* ========================================================================= */}
        {/* 4. UNIVERSAL 30-SECOND INTEGRATION WIZARD                                 */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <GuidedSetupWizard />
        </section>

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* ========================================================================= */}
        {/* 5. 100% RISK-FREE REFUND GUARANTEE & TRUST SEALS                          */}
        {/* ========================================================================= */}
        <section className="glass-panel rounded-3xl p-5 sm:p-7 border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-black/40 to-indigo-600/10 shadow-xl space-y-3">
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
              <span>Claim $5 Free Credit</span>
              <ArrowRight className="w-3 h-3 text-black" />
            </Link>
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
