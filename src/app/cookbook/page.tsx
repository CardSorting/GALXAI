import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Clock, Code, ArrowRight, Sparkles, Terminal } from 'lucide-react';
import { COOKBOOK_RECIPES_DATA } from '@/lib/data/cookbooksData';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTopicHubGraph } from '@/lib/seo/jsonld';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

export const metadata: Metadata = constructMetadata({
  title: 'Developer Cookbooks & Production Code Recipes',
  description:
    'Hands-on code recipes and architecture patterns for building with OpenAI models on GALXAI: SSE streaming, multi-agent routers, Cursor IDE setup, pgvector RAG, and prompt caching.',
  canonicalPath: '/cookbook',
  keywords: [
    'AI Developer Cookbook',
    'OpenAI SDK Code Recipes',
    'Next.js AI Streaming',
    'LangChain Model Router',
    'Cursor IDE Setup',
    'pgvector RAG Python',
    'Prompt Caching Implementation',
  ],
});

export default function CookbookHubPage() {
  const hubSchema = createTopicHubGraph({
    canonicalPath: '/cookbook',
    title: 'GALXAI Developer Cookbooks & Production Code Recipes',
    description:
      'Step-by-step developer implementation recipes for AI token streaming, agent workflows, and database caching.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Cookbook', url: '/cookbook' },
    ],
    items: COOKBOOK_RECIPES_DATA.map((r) => ({
      name: r.title,
      description: r.description,
      url: `/cookbook/${r.slug}`,
    })),
  });

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <JsonLd data={hubSchema} />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cookbooks', href: '/cookbook' }]} />

        {/* Header & Hero */}
        <header className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold tracking-wide">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>PRODUCTION CODE RECIPES</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Developer <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">Cookbooks</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Copy-pasteable code recipes, end-to-end tutorials, and architectural patterns in TypeScript and Python for the OpenAI-compatible gateway.
          </p>
        </header>

        {/* Recipes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {COOKBOOK_RECIPES_DATA.map((recipe) => (
            <Link
              key={recipe.slug}
              href={`/cookbook/${recipe.slug}`}
              className="group relative rounded-2xl border border-white/10 bg-[#0d111a]/80 hover:bg-[#121724]/90 p-6 flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 cursor-pointer backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-emerald-300">
                    {recipe.category}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    {recipe.badge}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors mb-2">
                  {recipe.title}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-6">
                  {recipe.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-zinc-500">
                    <Code className="w-3.5 h-3.5" />
                    {recipe.primaryLanguage}
                  </span>
                  <span className="flex items-center gap-1 text-zinc-500">
                    <Clock className="w-3.5 h-3.5" />
                    {recipe.difficulty}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <span>View Recipe</span>
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
