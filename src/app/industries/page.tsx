import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, ArrowRight, ShieldCheck, Zap, Layers, CheckCircle2 } from 'lucide-react';
import { INDUSTRIES_DATA } from '@/lib/data/industriesData';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTopicHubGraph } from '@/lib/seo/jsonld';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

export const metadata: Metadata = constructMetadata({
  title: 'Vertical Industry AI Workflows',
  description:
    'Tailored enterprise AI workflow guidance for Healthcare, FinTech, Legal, Cybersecurity, E-Commerce, and public-sector teams on GALXAI.',
  canonicalPath: '/industries',
  keywords: [
    'Vertical AI Workflows',
    'Healthcare AI Workflows',
    'Financial AI Workflows',
    'Legal AI Review',
    'Security Operations AI',
    'Public-Sector AI',
  ],
});

export default function IndustriesHubPage() {
  const hubSchema = createTopicHubGraph({
    canonicalPath: '/industries',
    title: 'GALXAI Vertical Industry AI Workflows',
    description:
      'Enterprise AI workflows with sector-specific considerations, operating practices, and integration examples.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Industries', url: '/industries' },
    ],
    items: INDUSTRIES_DATA.map((ind) => ({
      name: ind.sectorName,
      description: ind.description,
      url: `/industries/${ind.slug}`,
    })),
  });

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-white">
      <JsonLd data={hubSchema} />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Industries', href: '/industries' }]} />

        {/* Header & Hero */}
        <header className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold tracking-wide">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>VERTICAL ENTERPRISE WORKFLOWS</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Industry <span className="text-amber-300">AI Workflows</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Sector-specific AI workflow guidance, review practices, and integration examples tailored for enterprise workloads.
          </p>
        </header>

        {/* Industries Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INDUSTRIES_DATA.map((ind) => (
            <Link
              key={ind.slug}
              href={`/industries/${ind.slug}`}
              className="group relative rounded-2xl border border-white/10 bg-[#0d111a]/80 hover:bg-[#121724]/90 p-6 flex flex-col justify-between transition-all hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5 cursor-pointer backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-amber-300">
                    {ind.recommendedModels[0]?.name || 'Frontier AI'}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                    {ind.badge}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors mb-2">
                  {ind.sectorName}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-6">
                  {ind.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">{ind.regulatoryCompliance[0] || 'SOC 2'}</span>
                <div className="flex items-center gap-1 text-amber-400 group-hover:translate-x-1 transition-transform">
                  <span>Explore Sector</span>
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
