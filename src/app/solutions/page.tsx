import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Layers, Cpu } from 'lucide-react';
import { SOLUTION_GUIDES } from '@/lib/data/solutionsData';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTopicHubGraph } from '@/lib/seo/jsonld';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

export const metadata: Metadata = constructMetadata({
  title: 'Enterprise AI Solutions & Production Workload Blueprints',
  description:
    'Explore production blueprints and architecture patterns for Coding Agents, RAG Knowledge Bases, Customer Support Swarms, Real-Time Voice, and Structured Extraction on GALXAI.',
  canonicalPath: '/solutions',
  keywords: [
    'AI Workload Solutions',
    'Coding Agent Architecture',
    'RAG Knowledge Base Pipeline',
    'Voice AI Low Latency',
    'Multi-Agent Swarm Gateway',
    'Autonomous AI Solutions',
  ],
});

export default function SolutionsHubPage() {
  const hubSchema = createTopicHubGraph({
    canonicalPath: '/solutions',
    title: 'GALXAI Enterprise AI Solutions & Production Workload Blueprints',
    description:
      'Production-ready reference blueprints, system architectures, and benchmarks engineered for AI agents, swarms, and enterprise search.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Solutions', url: '/solutions' },
    ],
    items: SOLUTION_GUIDES.map((s) => ({
      name: s.headline,
      description: s.description,
      url: `/solutions/${s.slug}`,
    })),
  });

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <JsonLd data={hubSchema} />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Solutions', href: '/solutions' }]} />

        {/* Header & Hero */}
        <header className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-mono font-bold tracking-wide">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>ENTERPRISE WORKLOAD BLUEPRINTS</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Workload <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">Solutions</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            End-to-end reference blueprints, latency optimizations, and prompt caching patterns engineered for production agent swarms, knowledge retrieval, and real-time streaming.
          </p>
        </header>

        {/* Solutions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SOLUTION_GUIDES.map((sol) => (
            <Link
              key={sol.slug}
              href={`/solutions/${sol.slug}`}
              className="group relative rounded-2xl border border-white/10 bg-[#0d111a]/80 hover:bg-[#121724]/90 p-6 flex flex-col justify-between transition-all hover:border-pink-500/40 hover:shadow-xl hover:shadow-pink-500/5 cursor-pointer backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-pink-300">
                    {sol.targetWorkload}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 font-bold">
                    {sol.badge}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-pink-300 transition-colors mb-2">
                  {sol.name}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-6">
                  {sol.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">-{sol.estimatedSavingsPct}% Token Cost</span>
                <div className="flex items-center gap-1 text-pink-400 group-hover:translate-x-1 transition-transform">
                  <span>View Architecture</span>
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
