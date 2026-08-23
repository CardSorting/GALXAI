import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Shield,
  Zap,
  Activity,
  Cpu,
  Power,
  Coins,
  Terminal,
} from 'lucide-react';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'How It Works — Wholesale AI Compute, P-AHT & 429 Burst Shield',
  description: 'Understand multi-account pooled volume arbitrage, continuous hydraulic headroom (P-AHT), 75% prompt caching pass-through, and zero-residual cryptographic lifecycle.',
  canonicalPath: '/how-it-works',
  keywords: [
    'How GALXAI Works',
    'Wholesale AI Compute Arbitrage',
    'Predictive Adaptive Headroom',
    'AI Token Volume Discount',
    '429 Burst Shield',
  ],
});

export default function HowItWorksPage() {
  const steps = [
    {
      num: '01',
      title: 'Wholesale Tier Consolidation & Volume Arbitrage',
      desc: 'GALXAI aggregates distributed developer request volume into enterprise-tier compute streams, securing 25%–40% wholesale discounts below retail list and passing them directly to your API key.',
      icon: Coins,
      tag: 'WHOLESALE ARBITRAGE',
    },
    {
      num: '02',
      title: 'Predictive Adaptive Hydraulic Headroom (P-AHT)',
      desc: 'When high-concurrency requests or agent swarms spike, the router continuously models token capacity across pooled enterprise accounts. If one upstream tier approaches limits, traffic effortlessly deflects in <1ms without 429 rate limit stalls.',
      icon: Activity,
      tag: '429 BURST IMMUNITY',
    },
    {
      num: '03',
      title: 'Continuous Prompt Caching & 75% Pass-Through',
      desc: 'Shared system instructions, tool schemas, and document RAG prefixes (>1,024 tokens) are automatically matched against warm upstream caches, returning 75% prompt caching savings directly to your wallet.',
      icon: Zap,
      tag: '75% CACHE REBATE',
    },
    {
      num: '04',
      title: 'Zero-Hesitation Payload Normalization',
      desc: 'Accepts raw text, GET query parameters, aspect ratios, and shorthand model aliases with zero 400 errors. 1:1 shims drop seamlessly into OpenAI, Anthropic, Cursor, and Vercel AI SDK.',
      icon: Terminal,
      tag: 'ZERO DEVELOPER FRICTION',
    },
    {
      num: '05',
      title: 'Immediate Heap Memory Zeroization & Disconnect',
      desc: 'Requests stream over ephemeral encrypted pipes. As the final SSE chunk flushes to your client, the RAM buffer is overwritten with 0x00 and immediately freed. No prompts, answers, or weights are ever written to disk.',
      icon: Power,
      tag: 'ABSOLUTE PRIVACY',
    },
  ];

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'How GALXAI Works: Wholesale Arbitrage, P-AHT & Zero-Residual Routing',
        description: 'Comprehensive overview of multi-account wholesale pooling, continuous hydraulic headroom, and prompt caching.',
        path: '/how-it-works',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'How It Works', url: '/how-it-works' },
      ]),
    ],
  };

  return (
    <div className="min-h-screen flex flex-col">
      <JsonLd data={pageSchema} />
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Overview' },
            { label: 'How It Works' },
          ]}
        />

        {/* Hero Banner */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-black/40 to-black/60 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <Cpu className="w-3.5 h-3.5" />
            <span>THE ENGINE UNDER THE HOOD</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            How GALXAI Delivers 25%–40% Wholesale AI Compute
          </h1>

          <p className="text-sm text-zinc-300 max-w-2xl leading-relaxed">
            From pooled volume arbitrage and continuous hydraulic rate buffering to 75% prompt caching pass-through and volatile heap zeroization, here is how the universal router operates.
          </p>
        </div>

        {/* 5-Step Process Cards */}
        <div className="space-y-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-3 relative overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-amber-400/60 font-mono">{step.num}</span>
                    <h2 className="text-base sm:text-lg font-bold text-white">{step.title}</h2>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-zinc-300 self-start sm:self-auto">
                    {step.tag}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Block */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Ready to connect your first project?</h3>
            <p className="text-xs text-zinc-400">Mint a live key in 1 click with $5 in free introductory compute.</p>
          </div>

          <Link
            href="/keys/new"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs font-mono uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 self-start sm:self-auto shrink-0"
          >
            <Zap className="w-3.5 h-3.5 fill-black" />
            <span>Mint Live API Key →</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
