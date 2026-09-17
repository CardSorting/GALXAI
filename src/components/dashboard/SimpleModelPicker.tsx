'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Zap,
  Brain,
  Sparkles,
  Image as ImageIcon,
  ArrowRight,
  Check,
  Flame,
  ShieldCheck,
  Cpu,
  Clock,
  Coins,
  CheckCircle2,
  Layers,
  Search
} from 'lucide-react';
import { FRONTEND_VISIBLE_MODELS, ModelCatalog } from '@/core/router/PublicModelCatalog';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

interface SimpleCategory {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  recommendedModelId: string;
  plainUseCases: string[];
  retailComparison: string;
  galxDiscount: string;
}

const CATEGORIES: SimpleCategory[] = [
  {
    id: 'velocity',
    label: 'Fast & Affordable Agentic Coding',
    sublabel: 'Fast and affordable agentic coding model with low reasoning overhead',
    icon: Flame,
    recommendedModelId: 'gpt-5-6-luna-low',
    plainUseCases: [
      'Real-time inline code autocomplete and full refactoring',
      'High-throughput agentic workflows and tool-use swarms',
      'Instant sub-second conversational agent turns and triage'
    ],
    retailComparison: '$0.20 in / $1.20 out per 1M tokens',
    galxDiscount: 'Verified OpenAI API wholesale rates with sub-15ms TTFT'
  },
  {
    id: 'visuals',
    label: 'Visual Synthesis Studio',
    sublabel: 'Photorealistic 4K Visuals & Assets',
    icon: ImageIcon,
    recommendedModelId: 'openai-gpt-image-latest',
    plainUseCases: [
      'Studio-quality 4K product photography and renders',
      'High-converting social media ad visual assets',
      'Website hero banners and graphic design'
    ],
    retailComparison: '$0.080 / img retail',
    galxDiscount: 'Save 25% ($0.060 direct wholesale)'
  }
];

function BaseSimpleModelPicker() {
  const [selectedCatId, setSelectedCatId] = useState<string>('velocity');
  const [naturalQuery, setNaturalQuery] = useState<string>('');

  // Ambiguity-absorbing intent query
  const handleQueryChange = (text: string) => {
    setNaturalQuery(text);
    if (!text.trim()) return;

    const resolved = ModelCatalog.resolveModel(text);
    if (resolved) {
      if (resolved.category === 'image') setSelectedCatId('visuals');
      else setSelectedCatId('velocity');
    } else {
      const lower = text.toLowerCase();
      if (lower.includes('photo') || lower.includes('real') || lower.includes('art') || lower.includes('image') || lower.includes('render') || lower.includes('4k')) {
        setSelectedCatId('visuals');
      } else {
        setSelectedCatId('velocity');
      }
    }
  };

  const currentCat = CATEGORIES.find(c => c.id === selectedCatId) || CATEGORIES[0];
  const modelSpecs = FRONTEND_VISIBLE_MODELS.find(m => m.id === currentCat.recommendedModelId) || ModelCatalog.resolveModel(currentCat.recommendedModelId);

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>INSTANT INTENT MATCHMAKER • NON-TECHNICAL</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Which Model Fits Your Application?
          </h2>
          <p className="text-xs text-zinc-400">
            Tell us what you want to build or choose a category below. We route directly to the optimal engine with wholesale savings.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Zero-Latency Routing</span>
        </div>
      </div>

      {/* Plain English Search Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={naturalQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Type your use case or alias in plain English (e.g. 'code autocomplete', 'generate visual', 'luna')..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-400">
          <span className="text-zinc-500">Quick Mental Models:</span>
          {[
            { label: 'GPT-5.6 Luna Low', query: 'gpt-5-6-luna-low' },
            { label: 'Luna Fast', query: 'luna fast' },
            { label: 'OpenAI Image Generation', query: 'openai-gpt-image-latest' }
          ].map((tag) => (
            <button
              key={tag.label}
              onClick={() => handleQueryChange(tag.query)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors cursor-pointer border border-white/5"
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Category Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CATEGORIES.map((cat) => {
          const isSelected = cat.id === selectedCatId;
          const Icon = cat.icon;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative space-y-3 flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-indigo-600/10 border-amber-400 shadow-xl shadow-amber-500/15 scale-[1.02]'
                  : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isSelected ? 'bg-amber-400 text-amber-950 shadow-md' : 'bg-white/10 text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {isSelected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">{cat.label}</h3>
                  <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">{cat.sublabel}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <span className="text-[10px] font-mono font-bold text-emerald-400 block truncate">
                  {cat.galxDiscount}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Model Focus Panel */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 bg-black/70 border border-white/10 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: What this means for your business */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider">
                Recommended AI Engine for Your Need:
              </span>
              <h3 className="text-2xl font-black text-white flex items-center gap-2.5">
                <span>{modelSpecs?.name || currentCat.recommendedModelId}</span>
                <span className="text-xs font-mono font-bold bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {currentCat.galxDiscount}
                </span>
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans pt-1">
                {modelSpecs?.description || 'Frontier performance with direct wholesale margins and sub-15ms automated failover.'}
              </p>
            </div>

            {/* Plain-English Benefits Checklist */}
            <div className="space-y-2 pt-1 font-sans text-xs">
              {currentCat.plainUseCases.map((useCase, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-zinc-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{useCase}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Instant Key Deployment Box */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-black/80 border border-amber-500/40 space-y-4 font-mono text-xs shadow-inner">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] pb-2 border-b border-white/10">
                <span className="text-zinc-400">Retail Comparison:</span>
                <span className="text-rose-400 line-through">{currentCat.retailComparison}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] pb-2 border-b border-white/10">
                <span className="text-zinc-400">GALXAI Wholesale:</span>
                <span className="text-emerald-300 font-bold">{currentCat.galxDiscount}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400">Welcome Grant:</span>
                <span className="text-amber-300 font-bold">+$5.00 Free Balance</span>
              </div>
            </div>

            <Link
              href="/keys"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer font-mono"
            >
              <span>Deploy Key for This Model ($5 Free)</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export const SimpleModelPicker = withErrorBoundary(BaseSimpleModelPicker, {
  name: 'Simple Model Picker'
});
