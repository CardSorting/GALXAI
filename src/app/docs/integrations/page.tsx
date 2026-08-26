import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Blocks, ArrowRight, ShieldCheck, Laptop, Terminal, Sparkles } from 'lucide-react';
import { INTEGRATION_GUIDES } from '@/lib/data/integrationsData';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTopicHubGraph } from '@/lib/seo/jsonld';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

export const metadata: Metadata = constructMetadata({
  title: 'Framework & IDE Integrations Directory',
  description:
    'Drop-in setup guides for connecting GALXAI to Cursor IDE, Windsurf, Claude Code, Cline, Continue.dev, LangChain, LlamaIndex, Dify, and Vercel AI SDK.',
  canonicalPath: '/docs/integrations',
  keywords: [
    'AI Framework Integrations',
    'Cursor IDE Setup',
    'Windsurf Base URL',
    'Claude Code Integration',
    'LangChain Gateway Setup',
    'Vercel AI SDK Drop-in',
    'LlamaIndex Model Router',
  ],
});

export default function IntegrationsHubPage() {
  const hubSchema = createTopicHubGraph({
    canonicalPath: '/docs/integrations',
    title: 'GALXAI Framework & IDE Integrations Directory',
    description:
      'Step-by-step connection walkthroughs and environment configuration guides for modern AI developer tools and agent frameworks.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Docs', url: '/docs' },
      { name: 'Integrations', url: '/docs/integrations' },
    ],
    items: INTEGRATION_GUIDES.map((i) => ({
      name: i.name,
      description: i.headline,
      url: `/docs/integrations/${i.slug}`,
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
            { label: 'Docs', href: '/docs' },
            { label: 'Integrations', href: '/docs/integrations' },
          ]}
        />

        {/* Header & Hero */}
        <header className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold tracking-wide">
            <Blocks className="w-4 h-4 text-cyan-400" />
            <span>UNIVERSAL WIRE COMPATIBILITY</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Framework &amp; IDE <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">Integrations</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Zero-code drop-in connection guides for your favorite developer environments, agent orchestrators, and AI SDKs.
          </p>
        </header>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INTEGRATION_GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              href={`/docs/integrations/${guide.slug}`}
              className="group relative rounded-2xl border border-white/10 bg-[#0d111a]/80 hover:bg-[#121724]/90 p-6 flex flex-col justify-between transition-all hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/5 cursor-pointer backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-cyan-300 uppercase">
                    {guide.category}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    {guide.badge}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors mb-2">
                  {guide.name}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-6">
                  {guide.headline}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">{guide.timeToSetup} Setup</span>
                <div className="flex items-center gap-1 text-cyan-400 group-hover:translate-x-1 transition-transform">
                  <span>View Setup</span>
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
