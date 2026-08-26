import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRightLeft, ArrowRight, ShieldCheck, Zap, Layers, CheckCircle2 } from 'lucide-react';
import { MIGRATION_GUIDES_DATA } from '@/lib/data/migrationData';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTopicHubGraph } from '@/lib/seo/jsonld';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

export const metadata: Metadata = constructMetadata({
  title: 'Cloud AI Migration Center — 30-Second Zero Code Refactor',
  description:
    'Step-by-step 30-second migration guides to switch to GALXAI from Azure OpenAI, AWS Bedrock, Google Vertex AI, Anthropic Direct, and OpenRouter for instant 25%–40% token savings.',
  canonicalPath: '/migrate',
  keywords: [
    'AI Cloud Migration',
    'Azure OpenAI Migration',
    'AWS Bedrock Alternative',
    'Google Vertex AI Migration',
    'OpenRouter to GALXAI',
    'Drop-in OpenAI Gateway',
  ],
});

export default function MigrateHubPage() {
  const hubSchema = createTopicHubGraph({
    canonicalPath: '/migrate',
    title: 'GALXAI Cloud AI Migration Center — 30-Second Zero Code Refactor',
    description:
      'Zero code refactor migration guides for transitioning enterprise AI workloads to the GALXAI wholesale clearinghouse.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Migrate', url: '/migrate' },
    ],
    items: MIGRATION_GUIDES_DATA.map((m) => ({
      name: m.headline,
      description: m.description,
      url: `/migrate/${m.slug}`,
    })),
  });

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <JsonLd data={hubSchema} />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Migration Center', href: '/migrate' }]} />

        {/* Header & Hero */}
        <header className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-mono font-bold tracking-wide">
            <ArrowRightLeft className="w-4 h-4 text-orange-400" />
            <span>30-SECOND SEAMLESS CUTOVER</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Cloud Provider <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">Migration Center</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Switch from costly cloud provider markups to GALXAI&apos;s wholesale clearinghouse with zero architectural rewrites: simply update your API base URL and token key.
          </p>
        </header>

        {/* Migration Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MIGRATION_GUIDES_DATA.map((guide) => (
            <Link
              key={guide.slug}
              href={`/migrate/${guide.slug}`}
              className="group relative rounded-2xl border border-white/10 bg-[#0d111a]/80 hover:bg-[#121724]/90 p-6 flex flex-col justify-between transition-all hover:border-orange-500/40 hover:shadow-xl hover:shadow-orange-500/5 cursor-pointer backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-orange-300">
                    From {guide.sourceProvider}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    -{guide.estimatedCostReductionPct}% Token Cost
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-orange-300 transition-colors mb-2">
                  {guide.headline}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-6">
                  {guide.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">{guide.badge}</span>
                <div className="flex items-center gap-1 text-orange-400 group-hover:translate-x-1 transition-transform">
                  <span>Start Migration</span>
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
