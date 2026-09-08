import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createBreadcrumbSchema } from '@/lib/seo/jsonld';
import { Shield, Zap, Globe, Cpu, Award, ArrowRight, Layers, Lock, Users } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'About GALXAI — Universal AI Router & Wholesale Compute Substrate',
  description: 'Learn about GALXAI’s mission to democratize frontier AI compute with wholesale clearinghouse pricing, sub-15ms Anycast routing, 75% prompt caching, and zero data retention.',
  canonicalPath: '/about',
  keywords: [
    'About GALXAI',
    'AI Model Router Mission',
    'Wholesale AI Compute',
    'Zero Data Retention Infrastructure',
    'OpenAI Compatible Gateway',
    'AI Systems Architecture Group',
  ],
});

export default function AboutPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-foreground flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <JsonLd
        data={[
          createBreadcrumbSchema([
            { name: 'Home', url: SITE_CONFIG.url },
            { name: 'About', url: `${SITE_CONFIG.url}/about` },
          ]),
        ]}
      />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 w-full space-y-16">
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero Header */}
        <header className="space-y-5 border-b border-white/10 pb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>MISSION &amp; ARCHITECTURAL PRINCIPLES</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Building the Universal Substrate for Autonomous AI Systems
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 max-w-3xl leading-relaxed">
            GALXAI was founded on a simple thesis: developers building next-generation agent swarms, coding engines, and multimodal applications should never be held back by retail markups, regional downtime, or artificial rate limit bottlenecks.
          </p>
        </header>

        {/* Key Metrics / Value Propositions */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-cyan-400 font-mono">25%–40%</div>
            <div className="text-xs text-zinc-400 font-semibold">Wholesale Savings</div>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">&lt;15ms</div>
            <div className="text-xs text-zinc-400 font-semibold">Anycast Edge TTFT</div>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">75%</div>
            <div className="text-xs text-zinc-400 font-semibold">Prompt Cache Rebate</div>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-sky-400 font-mono">99.99%</div>
            <div className="text-xs text-zinc-400 font-semibold">Active-Active Uptime</div>
          </div>
        </section>

        {/* The 3 Core Pillars */}
        <section className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Our Core Engineering Pillars</h2>
            <p className="text-sm text-zinc-400">Deterministic design choices that set GALXAI apart from traditional API proxies.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 rounded-3xl bg-zinc-900/40 border border-white/10 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Wholesale Clearinghouse</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                By pooling enterprise compute volume across global GPU clusters, we secure institutional wholesale rate cards and pass 100% of these savings directly to builders with $0 seat fees.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-zinc-900/40 border border-white/10 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Zero Data Retention (ZDR)</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                We operate strictly on volatile ephemeral RAM buffers. Customer prompt strings, vector embeddings, and LLM completions are never written to disk or used for foundation model training.
              </p>
            </div>

            <div className="p-7 rounded-3xl bg-zinc-900/40 border border-white/10 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Predictive Failover Shield</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Use the status page to check service availability. API errors include guidance for your next step.
              </p>
            </div>
          </div>
        </section>

        {/* Compliance & Security Standards */}
        <section className="p-8 rounded-3xl bg-zinc-900/30 border border-white/10 space-y-6">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Enterprise Governance &amp; Security Architecture</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-zinc-300">
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <div className="font-bold text-white">SOC 2 Type II Aligned</div>
              <div className="text-zinc-500">Continuous Security Control Monitoring</div>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <div className="font-bold text-white">ISO/IEC 27001:2022</div>
              <div className="text-zinc-500">Information Security Management Framework</div>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <div className="font-bold text-white">HIPAA BAA Compliant</div>
              <div className="text-zinc-500">Zero PHI Retention Architecture</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-indigo-950/40 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-bold text-white">Ready to connect to the universal gateway?</h3>
            <p className="text-xs text-zinc-400">Generate an instant API key in 10 seconds with $5 free test credit.</p>
          </div>
          <Link
            href="/keys"
            className="px-6 py-3 rounded-2xl bg-cyan-400 text-black font-bold text-xs font-mono flex items-center gap-2 hover:bg-cyan-300 transition-all shrink-0 cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            <span>Get Instant API Key</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
