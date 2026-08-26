import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle, ArrowRight, ShieldCheck, Clock, Zap, CheckCircle2 } from 'lucide-react';
import { POSTMORTEMS_DATA } from '@/lib/data/postmortemsData';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTopicHubGraph } from '@/lib/seo/jsonld';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

export const metadata: Metadata = constructMetadata({
  title: 'AI Incident Postmortems & Outage Rerouting Telemetry',
  description:
    'Transparent technical postmortems detailing how GALXAI absorbed major upstream model provider outages, rate limit storms, and cross-region latency spikes without customer downtime.',
  canonicalPath: '/postmortems',
  keywords: [
    'AI Outage Postmortems',
    'OpenAI Downtime Case Studies',
    'AI Failover Telemetry',
    'Incident Analysis AI Gateway',
    'Zero Downtime Architecture',
  ],
});

export default function PostmortemsHubPage() {
  const hubSchema = createTopicHubGraph({
    canonicalPath: '/postmortems',
    title: 'GALXAI AI Incident Postmortems & Outage Rerouting Telemetry',
    description:
      'In-depth technical postmortems and real-world telemetry reports on upstream outage absorption and resilience engineering.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Postmortems', url: '/postmortems' },
    ],
    items: POSTMORTEMS_DATA.map((p) => ({
      name: p.title,
      description: p.description,
      url: `/postmortems/${p.slug}`,
    })),
  });

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <JsonLd data={hubSchema} />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Postmortems', href: '/postmortems' }]} />

        {/* Header & Hero */}
        <header className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold tracking-wide">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>TRANSPARENT SYSTEM TELEMETRY</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Incident <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">Postmortems</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Detailed case studies and telemetry timelines demonstrating how GALXAI active failover and Anycast routing preserved application uptime during major upstream cloud outages.
          </p>
        </header>

        {/* Postmortems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {POSTMORTEMS_DATA.map((postmortem) => (
            <Link
              key={postmortem.slug}
              href={`/postmortems/${postmortem.slug}`}
              className="group relative rounded-2xl border border-white/10 bg-[#0d111a]/80 hover:bg-[#121724]/90 p-6 flex flex-col justify-between transition-all hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5 cursor-pointer backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-amber-300">
                    {postmortem.incidentDate}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    {postmortem.impactMetrics.slaAvailability} Uptime
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors mb-2">
                  {postmortem.title}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-6">
                  {postmortem.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">{postmortem.impactMetrics.downtimeDuration} Outage</span>
                <div className="flex items-center gap-1 text-amber-400 group-hover:translate-x-1 transition-transform">
                  <span>Read Case Study</span>
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
