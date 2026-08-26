import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, ArrowRight, ShieldCheck, Zap, RefreshCw, Layers } from 'lucide-react';
import { RELIABILITY_DATA } from '@/lib/data/reliabilityData';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTopicHubGraph } from '@/lib/seo/jsonld';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

export const metadata: Metadata = constructMetadata({
  title: 'AI Reliability, Active Failover & Resilience Engineering',
  description:
    'Engineering guides for zero-downtime AI architecture: active-active multi-region failover, circuit breakers, rate limit mitigation, and 99.99% SLA uptime on GALXAI.',
  canonicalPath: '/reliability',
  keywords: [
    'AI Reliability Engineering',
    'OpenAI Outage Failover',
    'AI Circuit Breaker Architecture',
    'Rate Limit Mitigation',
    'Zero Downtime LLM',
    'High Availability AI Gateway',
  ],
});

export default function ReliabilityHubPage() {
  const hubSchema = createTopicHubGraph({
    canonicalPath: '/reliability',
    title: 'GALXAI AI Reliability, Active Failover & Resilience Engineering',
    description:
      'High-availability engineering guides and active failover patterns ensuring 99.99% uptime for AI applications.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Reliability', url: '/reliability' },
    ],
    items: RELIABILITY_DATA.map((r) => ({
      name: r.title,
      description: r.description,
      url: `/reliability/${r.slug}`,
    })),
  });

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <JsonLd data={hubSchema} />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Reliability', href: '/reliability' }]} />

        {/* Header & Hero */}
        <header className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold tracking-wide">
            <Activity className="w-4 h-4 text-blue-400" />
            <span>99.99% SLA RESILIENCE ENGINEERING</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            High Availability &amp; <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">Resilience</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Architectural patterns, circuit breaker policies, and active-active failover mechanisms designed to keep AI systems running during upstream cloud disruptions.
          </p>
        </header>

        {/* Reliability Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {RELIABILITY_DATA.map((item) => (
            <Link
              key={item.slug}
              href={`/reliability/${item.slug}`}
              className="group relative rounded-2xl border border-white/10 bg-[#0d111a]/80 hover:bg-[#121724]/90 p-6 flex flex-col justify-between transition-all hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5 cursor-pointer backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-blue-300">
                    SLA Pattern
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                    {item.badge}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors mb-2">
                  {item.title}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-6">
                  {item.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">{item.uptimeGuarantee}</span>
                <div className="flex items-center gap-1 text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span>Read Guide</span>
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
