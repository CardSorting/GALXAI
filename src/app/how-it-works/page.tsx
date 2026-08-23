import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Shield,
  Zap,
  Layers,
  Activity,
  CheckCircle2,
  Lock,
  Cpu,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Power,
  Coins,
  ShieldCheck,
  Terminal
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'How It Works — Wholesale AI Compute & 429 Burst Shield',
  description: 'Understand the multi-account pooled volume arbitrage, continuous hydraulic headroom (P-AHT), and zero-residual cryptographic lifecycle.',
};

export default function HowItWorksPage() {
  const steps = [
    {
      num: '01',
      title: 'Wholesale Tier Consolidation & Volume Arbitrage',
      desc: 'GALXAI aggregates distributed developer request volume into enterprise-tier compute streams, securing 25%–40% wholesale discounts below retail list and passing them directly to your API key.',
      icon: Coins,
      tag: 'WHOLESALE ARBITRAGE'
    },
    {
      num: '02',
      title: 'Predictive Adaptive Hydraulic Headroom (P-AHT)',
      desc: 'When high-concurrency requests or agent swarms spike, the router continuously models token capacity across pooled enterprise accounts. If one upstream tier approaches limits, traffic effortlessly deflects in <1ms without 429 rate limit stalls.',
      icon: Activity,
      tag: '429 BURST IMMUNITY'
    },
    {
      num: '03',
      title: 'Continuous Prompt Caching & 75% Pass-Through',
      desc: 'Shared system instructions, tool schemas, and document RAG prefixes (>1,024 tokens) are automatically matched against warm upstream caches, returning 75% prompt caching savings directly to your wallet.',
      icon: Zap,
      tag: '75% CACHE REBATE'
    },
    {
      num: '04',
      title: 'Zero-Hesitation Payload Normalization',
      desc: 'Accepts raw text, GET query parameters, aspect ratios, and shorthand model aliases with zero 400 errors. 1:1 shims drop seamlessly into OpenAI, Anthropic, Cursor, and Vercel AI SDK.',
      icon: Terminal,
      tag: 'ZERO DEVELOPER FRICTION'
    },
    {
      num: '05',
      title: 'Immediate Heap Memory Zeroization & Disconnect',
      desc: 'When an SSE token stream finishes, decrypted RAM buffers are overwritten with binary zeroes in an unconditional finally block. Pressing Disconnect aborts active leases in <40ms.',
      icon: Power,
      tag: '0% RESIDUAL MEMORY'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs items={[{ label: 'How Routing Works' }]} />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>WHOLESALE CLEARINGHOUSE & 429 RESILIENCE ARCHITECTURE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">How GALXAI Slashes Token Bills &amp; Eliminates 429 Stalls</h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            A transparent architectural walkthrough of how GALXAI consolidates volume, cycles quotas across pooled accounts, and executes with sub-millisecond overhead.
          </p>
        </div>

        {/* 5-Step Lifecycle Visual */}
        <section className="space-y-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="glass-card rounded-3xl p-6 sm:p-8 border border-white/5 flex flex-col sm:flex-row items-start gap-6 relative overflow-hidden group"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-lg shrink-0 group-hover:scale-105 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-mono text-cyan-400 font-bold">STAGE {step.num}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold border border-indigo-500/30">
                      {step.tag}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">{step.title}</h2>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        {/* CTA Footer */}
        <div className="glass-panel rounded-3xl p-8 text-center space-y-4">
          <h3 className="text-xl font-bold text-white">Ready to Cut Your AI Bill by 25%–40%?</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Claim your $5 free test credit and deploy in 30 seconds with a 1-line configuration change.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/keys/new"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 font-mono"
            >
              Get $5 Free Live Key
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
