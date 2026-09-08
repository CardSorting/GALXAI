'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Zap,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Code2,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import type { SolutionGuide } from '@/lib/data/solutionsData';
import { SOLUTION_GUIDES } from '@/lib/data/solutionsData';
import type { ModelSpecItem } from '@/core/router/PublicModelCatalog';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface SolutionClientProps {
  solution: SolutionGuide;
  primaryModel?: ModelSpecItem | null;
  fallbackModel?: ModelSpecItem | null;
}

export function SolutionClient({ solution, primaryModel, fallbackModel }: SolutionClientProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(solution.codeSnippet.code);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const siblingSolutions = SOLUTION_GUIDES.filter((s) => s.slug !== solution.slug);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs
          items={[
            { label: 'Solutions', href: '/models' },
            { label: solution.name },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Heading */}
        <section id="solution-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-amber-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{solution.badge}</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Solution"
              title={solution.title}
              description={solution.description}
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {solution.headline}
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            {solution.description}
          </p>

          {/* Quick Target Workload Strip */}
          <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
            <div>
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Target Architecture Workload:</span>
              <span className="text-white font-sans text-xs font-medium">{solution.targetWorkload}</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold shrink-0">
              <Flame className="w-4 h-4 fill-emerald-400" />
              <span>Estimated Cost Reduction: ~{solution.estimatedSavingsPct}%</span>
            </div>
          </div>
        </section>

        {/* Key Architectural Benefits Grid */}
        <section id="architectural-benefits" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {solution.keyBenefits.map((benefit, idx) => (
            <div
              key={idx}
              className="glass-panel rounded-3xl p-6 space-y-2 border border-white/10 hover:border-cyan-500/30 transition-all"
            >
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center font-mono font-bold text-xs mb-2">
                0{idx + 1}
              </div>
              <h2 className="text-sm font-bold text-white font-mono">{benefit.title}</h2>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">{benefit.description}</p>
            </div>
          ))}
        </section>

        {/* Recommended Model Stack Section */}
        <section id="recommended-fleet" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-400">Curated Model Stack</span>
              <h2 className="text-xl font-black text-white">Recommended Inference Engines</h2>
            </div>
            <Link href="/models" className="text-xs font-mono text-cyan-400 hover:text-cyan-300">
              View All 15 Models →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            {primaryModel && (
              <div className="p-5 rounded-2xl bg-black/60 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                    PRIMARY MODEL
                  </span>
                  <span className="text-emerald-400 font-bold">-{primaryModel.discountPercentage ?? 25}% Wholesale</span>
                </div>
                <div>
                  <h3 className="font-black text-white text-base font-sans">{primaryModel.name}</h3>
                  <p className="text-[11px] text-zinc-400 font-sans mt-0.5">{primaryModel.description}</p>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-2 text-[11px]">
                  <span className="text-zinc-400">Input: ${primaryModel.inputPricePer1M.toFixed(2)}/1M</span>
                  <span className="text-cyan-300">Cached: ${(primaryModel.cachedInputPricePer1M ?? primaryModel.inputPricePer1M * 0.25).toFixed(2)}/1M</span>
                </div>
                <Link
                  href={`/models/${primaryModel.id.replace('/', '-')}`}
                  className="block text-center py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-sans text-xs font-semibold transition-all mt-1"
                >
                  Inspect {primaryModel.id} Specs →
                </Link>
              </div>
            )}

            {fallbackModel && (
              <div className="p-5 rounded-2xl bg-black/60 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">
                    FAST FALLBACK / AUTOCOMPLETE
                  </span>
                  <span className="text-emerald-400 font-bold">-{fallbackModel.discountPercentage ?? 25}% Wholesale</span>
                </div>
                <div>
                  <h3 className="font-black text-white text-base font-sans">{fallbackModel.name}</h3>
                  <p className="text-[11px] text-zinc-400 font-sans mt-0.5">{fallbackModel.description}</p>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-2 text-[11px]">
                  <span className="text-zinc-400">Input: ${fallbackModel.inputPricePer1M.toFixed(2)}/1M</span>
                  <span className="text-cyan-300">Cached: ${(fallbackModel.cachedInputPricePer1M ?? fallbackModel.inputPricePer1M * 0.25).toFixed(2)}/1M</span>
                </div>
                <Link
                  href={`/models/${fallbackModel.id.replace('/', '-')}`}
                  className="block text-center py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-sans text-xs font-semibold transition-all mt-1"
                >
                  Inspect {fallbackModel.id} Specs →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* 1-Line Drop-In Code Recipe */}
        <section id="solution-recipe" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                1-Line Implementation ({solution.codeSnippet.language})
              </span>
              <h2 className="text-lg font-bold text-white font-mono">Execute on {solution.name}</h2>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
            {solution.codeSnippet.code}
          </pre>
        </section>

        {/* AEO Frequently Asked Questions */}
        <section id="solution-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Direct Answer Knowledge Base ({solution.name})</span>
            </h2>
            <p className="text-xs text-zinc-400">Authoritative answers for enterprise architecture evaluation.</p>
          </div>

          <div className="space-y-3 pt-2">
            {solution.faqs.map((faq, idx) => {
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

        {/* Sibling Solutions Grid */}
        <section id="other-solutions" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono">
              Explore More AI Infrastructure Solutions
            </h2>
            <p className="text-xs text-zinc-400">Optimized routing blueprints for high-throughput enterprise workloads.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {siblingSolutions.map((sol) => (
              <Link
                key={sol.slug}
                href={`/solutions/${sol.slug}`}
                className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-amber-500/40 transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-amber-300 font-mono">
                    {sol.name}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-300 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">
                  {sol.description}
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
