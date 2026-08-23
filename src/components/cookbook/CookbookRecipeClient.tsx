'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  BookOpen,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Code2,
  Zap,
  Flame,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import type { CookbookRecipeItem } from '@/lib/data/cookbooksData';
import { COOKBOOK_RECIPES_DATA } from '@/lib/data/cookbooksData';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface CookbookRecipeClientProps {
  recipe: CookbookRecipeItem;
}

export function CookbookRecipeClient({ recipe }: CookbookRecipeClientProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(recipe.codeSnippet);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const siblingRecipes = COOKBOOK_RECIPES_DATA.filter((r) => r.slug !== recipe.slug);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'Cookbook', href: '/docs/cookbook' },
            { label: recipe.title },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Lead */}
        <section id="recipe-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-amber-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{recipe.badge} • {recipe.category}</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Recipe"
              title={recipe.title}
              description={recipe.description}
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {recipe.headline}
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            {recipe.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 font-mono text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>Estimated Time: ~5 Minutes</span>
            </span>
            <span>•</span>
            <span className="text-cyan-300 font-bold">Difficulty: {recipe.difficulty}</span>
            <span>•</span>
            <span className="text-emerald-300 font-bold">Language: {recipe.primaryLanguage}</span>
          </div>
        </section>

        <DocsSubNav />

        {/* Prerequisites Checklist */}
        <section id="prerequisites" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3 border border-white/10">
          <span className="text-[10px] font-mono uppercase font-bold text-amber-400 block">
            Prerequisites &amp; Setup
          </span>
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {recipe.prerequisites.map((req, idx) => (
              <span key={idx} className="px-3 py-1 rounded-xl bg-black/50 border border-white/10 text-zinc-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{req}</span>
              </span>
            ))}
          </div>
        </section>

        {/* Complete Ready-to-Run Code Recipe */}
        <section id="recipe-code" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                Complete Production Code ({recipe.primaryLanguage})
              </span>
              <h2 className="text-lg font-bold text-white font-mono">1-Line Drop-in Implementation</h2>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
            {recipe.codeSnippet}
          </pre>
        </section>

        {/* Step-by-Step Breakdown */}
        <section id="step-breakdown" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span>Step-by-Step Walkthrough</span>
            </h2>
            <p className="text-xs text-zinc-400">Detailed execution instructions for engineering workflows.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 font-sans text-xs">
            {recipe.steps.map((step, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono font-bold text-cyan-300 block uppercase">
                  Step {idx + 1}: {step.name}
                </span>
                <p className="text-zinc-300 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* AEO Frequently Asked Questions */}
        <section id="recipe-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions ({recipe.category})</span>
            </h2>
            <p className="text-xs text-zinc-400">Implementation questions and architectural edge cases.</p>
          </div>

          <div className="space-y-3 pt-2">
            {recipe.faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="font-bold text-white text-sm font-sans">{faq.q}</span>
                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-zinc-400">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-zinc-300 leading-relaxed border-t border-white/5 font-sans">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Sibling Cookbook Recipes */}
        <section id="other-recipes" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono">
              Explore More Developer Cookbooks
            </h2>
            <p className="text-xs text-zinc-400">Ready-to-run recipes for structured outputs, multi-agent swarms, and RAG.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {siblingRecipes.map((r) => (
              <Link
                key={r.slug}
                href={`/cookbook/${r.slug}`}
                className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-amber-500/40 transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-amber-300 font-mono">
                    {r.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-300 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">
                  {r.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />
      </main>

      {/* Floating Conversion Dock */}
      <FloatingConversionDock />
    </div>
  );
}
