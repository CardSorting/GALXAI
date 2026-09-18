import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Cpu, ArrowRight, Zap, Layers, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { CAPABILITIES_DATA } from '@/lib/data/capabilitiesData';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTopicHubGraph } from '@/lib/seo/jsonld';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

export const metadata: Metadata = constructMetadata({
  title: 'Architectural Capabilities & Edge Engine Features',
  description:
    'Deep dive into GALXAI core gateway capabilities: 1M token context windows, zero data retention, 75% prompt caching, distributed edge routing, and predictive headroom governance.',
  canonicalPath: '/capabilities',
  keywords: [
    'AI Gateway Capabilities',
    '1M Context Window LLM',
    'Zero Data Retention AI',
    'Prompt Caching Gateway',
    'Distributed Edge AI Routing',
    'Predictive Rate Limiting',
    'Constrained Structured Decoding',
  ],
});

export default function CapabilitiesHubPage() {
  const hubSchema = createTopicHubGraph({
    canonicalPath: '/capabilities',
    title: 'GALXAI Architectural Capabilities & Edge Gateway Features',
    description:
      'Explore core architectural capabilities powering the GALXAI sub-millisecond AI gateway and clearinghouse.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Capabilities', url: '/capabilities' },
    ],
    items: CAPABILITIES_DATA.map((c) => ({
      name: c.title,
      description: c.description,
      url: `/capabilities/${c.slug}`,
    })),
  });

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <JsonLd data={hubSchema} />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Capabilities', href: '/capabilities' }]} />

        {/* Header & Hero */}
        <header className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-mono font-bold tracking-wide">
            <Cpu className="w-4 h-4 text-violet-400" />
            <span>GATEWAY ARCHITECTURAL ENGINE</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Architectural <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">Capabilities</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            High-performance distributed systems engineering powering sub-millisecond routing, cryptographic zero retention, and continuous token headroom.
          </p>
        </header>

        {/* Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITIES_DATA.map((cap) => (
            <Link
              key={cap.slug}
              href={`/capabilities/${cap.slug}`}
              className="group relative rounded-2xl border border-white/10 bg-[#0d111a]/80 hover:bg-[#121724]/90 p-6 flex flex-col justify-between transition-all hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-500/5 cursor-pointer backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-violet-300">
                    Feature Spec
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold">
                    {cap.badge}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors mb-2">
                  {cap.title}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-6">
                  {cap.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">{cap.benchmarkMetric.value} {cap.benchmarkMetric.label}</span>
                <div className="flex items-center gap-1 text-violet-400 group-hover:translate-x-1 transition-transform">
                  <span>Explore Specs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
