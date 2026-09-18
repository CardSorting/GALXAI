import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Swords, ArrowRight, ShieldCheck, Zap, DollarSign, Brain } from 'lucide-react';
import { CURATED_MATCHUPS } from '@/lib/data/comparisonData';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTopicHubGraph } from '@/lib/seo/jsonld';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

export const metadata: Metadata = constructMetadata({
  title: 'Frontier AI Model Matchups & Head-to-Head Comparisons',
  description:
    'Detailed head-to-head model comparisons evaluating reasoning depth, token speed, and wholesale pricing on the GALX platform.',
  canonicalPath: '/models/vs',
  keywords: [
    'AI Model Comparisons',
    'GALX Nova vs Legacy Models',
    'GALX Nova Performance',
    'AI Gateway Benchmarks',
    'LLM Benchmark Comparison',
    'Token Economics Matchups',
  ],
});

export default function ModelMatchupsHubPage() {
  const hubSchema = createTopicHubGraph({
    canonicalPath: '/models/vs',
    title: 'GALXAI Frontier AI Model Matchups & Head-to-Head Comparisons',
    description:
      'Curated head-to-head comparisons of frontier AI models evaluating reasoning depth, token velocity, and token economics.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Models', url: '/models' },
      { name: 'Matchups', url: '/models/vs' },
    ],
    items: CURATED_MATCHUPS.map((m) => ({
      name: m.headline,
      description: m.description,
      url: `/models/vs/${m.slug}`,
    })),
  });

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <JsonLd data={hubSchema} />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Models', href: '/models' },
            { label: 'Model Matchups', href: '/models/vs' },
          ]}
        />

        {/* Header & Hero */}
        <header className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold tracking-wide">
            <Swords className="w-4 h-4 text-amber-400" />
            <span>HEAD-TO-HEAD MODEL MATRIX</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Frontier Model <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">Matchups</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            In-depth technical evaluations comparing reasoning depth, token velocity, context window capacity, and wholesale economics across OpenAI frontier engines.
          </p>
        </header>

        {/* Matchups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CURATED_MATCHUPS.map((matchup) => (
            <Link
              key={matchup.slug}
              href={`/models/vs/${matchup.slug}`}
              className="group relative rounded-2xl border border-white/10 bg-[#0d111a]/80 hover:bg-[#121724]/90 p-6 flex flex-col justify-between transition-all hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5 cursor-pointer backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-amber-300">
                    {matchup.modelAId} vs {matchup.modelBId}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    Direct Comparison
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors mb-2">
                  {matchup.headline}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-6">
                  {matchup.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500 truncate max-w-[180px]">{matchup.verdict.costDifferenceSummary}</span>
                <div className="flex items-center gap-1 text-amber-400 group-hover:translate-x-1 transition-transform">
                  <span>View Matchup</span>
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
