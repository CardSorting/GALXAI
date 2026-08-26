'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Sparkles,
  GitCompare,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';

const MODELS_GUIDE_DATA = [
  {
    id: 'gpt-5.6-sol',
    name: 'OpenAI GPT-5.6 Sol',
    idealFor: 'Deep Reasoning, Complex Architectural Refactoring, High-Stakes Code Generation',
    contextWindow: '900K Tokens',
    speed: '45 tok/sec',
    pricing: '$1.80 / $7.20 per M (Wholesale: -40%)',
    cacheDiscount: '75% OFF Cached Prefixes',
    badge: 'Reasoning Flagship',
  },
  {
    id: 'gpt-5.6-terra',
    name: 'OpenAI GPT-5.6 Terra',
    idealFor: 'Production Backend APIs, General Multi-Turn Dialog, Autonomous Workflow Logic',
    contextWindow: '900K Tokens',
    speed: '85 tok/sec',
    pricing: '$0.40 / $1.60 per M (Wholesale: -30%)',
    cacheDiscount: '75% OFF Cached Prefixes',
    badge: 'Best Cost-Performance',
  },
  {
    id: 'gpt-5.6-luna',
    name: 'OpenAI GPT-5.6 Luna',
    idealFor: 'Real-Time Autocomplete, Interactive Chatbots, Sub-Second Inline Code Infilling',
    contextWindow: '900K Tokens',
    speed: '140 tok/sec',
    pricing: '$0.10 / $0.40 per M (Wholesale: -25%)',
    cacheDiscount: '75% OFF Cached Prefixes',
    badge: 'Sub-Second Velocity',
  },
  {
    id: 'openai-gpt-image-2',
    name: 'OpenAI GPT-Image-2',
    idealFor: 'High-Fidelity Visual Generation, UI Component Mockups, Creative Asset Synthesis',
    contextWindow: 'Image Generation',
    speed: '~1.8s per render',
    pricing: '$0.030 per standard image',
    cacheDiscount: 'N/A',
    badge: 'Visual Engine',
  },
  {
    id: 'openai-gpt-image-1.5',
    name: 'OpenAI GPT-Image-1.5',
    idealFor: 'Fast Marketing Assets, Mid-Tier Visual Generation, E-commerce Mockups',
    contextWindow: 'Image Generation',
    speed: '~1.2s per render',
    pricing: '$0.024 per standard image',
    cacheDiscount: 'N/A',
    badge: 'Balanced Visuals',
  },
  {
    id: 'openai-gpt-image-1',
    name: 'OpenAI GPT-Image-1',
    idealFor: 'Foundation Visual Generation, High-Throughput Thumbnails, Prototyping',
    contextWindow: 'Image Generation',
    speed: '~0.9s per render',
    pricing: '$0.016 per standard image',
    cacheDiscount: 'N/A',
    badge: 'Foundation Visuals',
  },
];

export function ModelsGuideClient() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string) => {
    await safeCopyToClipboard(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'API & Model Reference', href: '/docs/api-reference' },
            { label: 'Model Capability & Selection Guide' },
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>FRONTIER MODEL DIRECTORY</span>
            </div>
            <Link
              href="/models/compare"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase font-mono tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <GitCompare className="w-3.5 h-3.5 fill-black" />
              <span>Side-by-Side Arena →</span>
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Frontier AI Model Selection Guide</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-sans">
            Comparative benchmark capabilities, context windows, and workload recommendations across all 12 supported frontier engines with 0ms ambiguity resolution.
          </p>
        </div>

        <DocsSubNav />

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* Models Comparison Cards */}
        <div className="space-y-4 font-mono text-xs">
          {MODELS_GUIDE_DATA.map((model) => (
            <div
              key={model.id}
              className="glass-panel rounded-3xl p-6 sm:p-7 space-y-4 border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-base font-bold text-white font-sans">{model.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                    {model.badge}
                  </span>
                  <button
                    onClick={() => handleCopy(model.id)}
                    className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-all cursor-pointer border border-white/5"
                  >
                    {copiedId === model.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === model.id ? 'Copied ID' : `ID: ${model.id}`}</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-emerald-400 font-bold text-[11px]">
                    {model.cacheDiscount}
                  </div>
                  <Link
                    href={`/models/${model.id}`}
                    className="text-cyan-400 hover:text-cyan-300 font-sans text-xs flex items-center gap-1 hover:underline"
                  >
                    <span>View Model Card</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <p className="text-zinc-300 text-xs font-sans leading-relaxed">
                <strong>Recommended For:</strong> {model.idealFor}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5 text-[11px]">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                  <span className="text-zinc-500 text-[10px] uppercase">Context Window</span>
                  <div className="text-white font-bold">{model.contextWindow}</div>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                  <span className="text-zinc-500 text-[10px] uppercase">Inference Velocity</span>
                  <div className="text-cyan-300 font-bold">{model.speed}</div>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-zinc-500 text-[10px] uppercase">Wholesale Compute Rate</span>
                  <div className="text-amber-300 font-bold truncate">{model.pricing}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
      <FloatingConversionDock />
      <LiveActivityToast />
      <ExitIntentModal />
    </div>
  );
}
