import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Scale, ArrowRight, ShieldCheck, Zap, DollarSign, CheckCircle2 } from 'lucide-react';
import { COMPETITOR_ALTERNATIVES } from '@/lib/data/alternativesData';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTopicHubGraph } from '@/lib/seo/jsonld';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

export const metadata: Metadata = constructMetadata({
  title: 'AI Gateway Competitor Alternatives & Feature Comparisons',
  description:
    'Comprehensive feature-by-feature and pricing comparisons between GALXAI and OpenRouter, Portkey, Together AI, LiteLLM, Helicone, Martian, and Azure OpenAI.',
  canonicalPath: '/alternatives',
  keywords: [
    'AI Gateway Alternatives',
    'OpenRouter Alternative',
    'Together AI Alternative',
    'Portkey AI Alternative',
    'LiteLLM Alternative',
    'Wholesale AI Gateway',
  ],
});

export default function AlternativesHubPage() {
  const hubSchema = createTopicHubGraph({
    canonicalPath: '/alternatives',
    title: 'GALXAI AI Gateway Competitor Alternatives & Feature Comparisons',
    description:
      'Objective architectural comparisons and pricing breakdowns showing why developers choose GALXAI over traditional AI proxy providers.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Alternatives', url: '/alternatives' },
    ],
    items: COMPETITOR_ALTERNATIVES.map((a) => ({
      name: a.competitorName,
      description: a.description,
      url: `/alternatives/${a.slug}`,
    })),
  });

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <JsonLd data={hubSchema} />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Alternatives', href: '/alternatives' }]} />

        {/* Header & Hero */}
        <header className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-mono font-bold tracking-wide">
            <Scale className="w-4 h-4 text-purple-400" />
            <span>OBJECTIVE MARKET MATRIX</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Competitor <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">Alternatives</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            See how GALXAI&apos;s institutional wholesale rates, 75% prompt caching pass-through, and zero-trust RAM architecture compare to standard retail AI proxies.
          </p>
        </header>

        {/* Alternatives Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {COMPETITOR_ALTERNATIVES.map((alt) => (
            <Link
              key={alt.slug}
              href={`/alternatives/${alt.slug}`}
              className="group relative rounded-2xl border border-white/10 bg-[#0d111a]/80 hover:bg-[#121724]/90 p-6 flex flex-col justify-between transition-all hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/5 cursor-pointer backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-purple-300">
                    vs {alt.competitorName}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    {alt.badge}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors mb-2">
                  GALXAI vs {alt.competitorName}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-6">
                  {alt.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500 truncate max-w-[180px]">0% Fee Clearinghouse</span>
                <div className="flex items-center gap-1 text-purple-400 group-hover:translate-x-1 transition-transform">
                  <span>Compare Details</span>
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
