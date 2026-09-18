import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Server, ArrowRight, ShieldCheck, Zap, Layers, DollarSign } from 'lucide-react';
import { PROVIDERS_DATA } from '@/lib/data/providersData';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTopicHubGraph } from '@/lib/seo/jsonld';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

export const metadata: Metadata = constructMetadata({
  title: 'AI Model Providers & Wholesale Gateways',
  description:
    'Explore official AI model provider portals routed through GALXAI distributed edge network with 25%–40% wholesale savings, zero rate limit stalls, and automatic multi-provider failover.',
  canonicalPath: '/providers',
  keywords: [
    'AI Model Providers',
    'OpenAI Gateway',
    'Wholesale AI Tokens',
    'LLM Provider Directory',
    'OpenAI API Provider',
    'Distributed Model Gateway',
  ],
});

export default function ProvidersHubPage() {
  const hubSchema = createTopicHubGraph({
    canonicalPath: '/providers',
    title: 'GALXAI AI Model Providers & Wholesale Gateways',
    description:
      'Official AI model provider hubs connecting developers to frontier AI compute with wholesale pricing and sub-15ms distributed edge routing.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Providers', url: '/providers' },
    ],
    items: PROVIDERS_DATA.map((p) => ({
      name: p.providerName,
      description: p.description,
      url: `/providers/${p.slug}`,
    })),
  });

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <JsonLd data={hubSchema} />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Providers', href: '/providers' }]} />

        {/* Header & Hero */}
        <header className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold tracking-wide">
            <Server className="w-4 h-4 text-blue-400" />
            <span>MODEL PROVIDER CLEARINGHOUSE</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Frontier AI <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">Model Providers</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Access the world&apos;s leading frontier AI providers through a single unified OpenAI wire-compatible API gateway with wholesale pricing and sub-15ms distributed edge routing.
          </p>
        </header>

        {/* Providers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {PROVIDERS_DATA.map((prov) => (
            <Link
              key={prov.slug}
              href={`/providers/${prov.slug}`}
              className="group relative rounded-2xl border border-white/10 bg-[#0d111a]/80 hover:bg-[#121724]/90 p-8 flex flex-col justify-between transition-all hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5 cursor-pointer backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-6">
                  <span className="text-xs font-mono font-semibold px-3 py-1 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    Official Gateway Portal
                  </span>
                  <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    -{prov.discountPct}% Wholesale Rate
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors mb-3">
                  {prov.providerName}
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3 mb-8">
                  {prov.description}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5 text-xs">
                  <div>
                    <span className="text-zinc-500 block mb-1">Flagship Models</span>
                    <span className="text-zinc-300 font-semibold">{prov.featuredModels.map(m => m.name).join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-1">Max Context</span>
                    <span className="text-zinc-300 font-semibold">{prov.featuredModels[0]?.context || '1M Tokens'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between text-xs font-mono mt-8">
                <span className="text-zinc-500">99.99% SLA Uptime</span>
                <div className="flex items-center gap-1.5 text-blue-400 group-hover:translate-x-1 transition-transform font-bold">
                  <span>Explore Provider Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
