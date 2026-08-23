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
import { EXCLUSIVE_MODEL_CATALOG, ModelCatalog } from '@/core/router/ModelCatalog';
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
    id: 'fast',
    label: 'Daily Chat & Fast Workflows',
    sublabel: 'Best for Customer Support, Writing & Email Drafting',
    icon: Zap,
    recommendedModelId: 'gpt-5.6-sol',
    plainUseCases: [
      'Customer support chatbots with 24/7 instant replies',
      'Automated email draft generation and summarization',
      'High-speed document reading and Q&A'
    ],
    retailComparison: '$5.00 / 1M tokens retail',
    galxDiscount: 'Save 25% ($3.75 direct wholesale)'
  },
  {
    id: 'reasoning',
    label: 'Deep Logic & Complex Strategy',
    sublabel: 'Best for Coding, Data Analysis & Legal Review',
    icon: Brain,
    recommendedModelId: 'gpt-5.6-terra',
    plainUseCases: [
      'Multi-step financial analysis and executive reports',
      'Full-stack code generation and bug diagnostics',
      'Complex contract evaluation and policy compliance'
    ],
    retailComparison: '$15.00 / 1M tokens retail',
    galxDiscount: 'Save 33% ($10.00 direct wholesale)'
  },
  {
    id: 'velocity',
    label: 'Live Real-Time & High Velocity',
    sublabel: 'Best for Real-Time Search, Scraping & Grok Speed',
    icon: Flame,
    recommendedModelId: 'x-ai/grok-4.6',
    plainUseCases: [
      'Real-time news synthesis and live web intelligence',
      'Frontier multimodal reasoning with 1M context window',
      'High-throughput background data extraction pipelines'
    ],
    retailComparison: '$12.00 / 1M tokens retail',
    galxDiscount: 'Save 30% ($2.10 in / $8.40 out)'
  },
  {
    id: 'visuals',
    label: 'Photorealistic 4K Visual Studio',
    sublabel: 'Best for Ad Creatives, Product Mockups & Banners',
    icon: ImageIcon,
    recommendedModelId: 'openai-gpt-image-2',
    plainUseCases: [
      'Studio-quality 4K product photography and renders',
      'High-converting social media ad visual assets',
      'Website hero banners and graphic design'
    ],
    retailComparison: '$0.080 / 1M retail',
    galxDiscount: 'Save 25% ($0.060 direct wholesale)'
  },
  {
    id: 'embeddings',
    label: 'Vector Embeddings & Semantic Search',
    sublabel: 'Best for RAG Pipelines, Knowledge Retrieval & Hybrid Search',
    icon: Layers,
    recommendedModelId: 'text-embedding-3-small',
    plainUseCases: [
      'Dense 1536-dimensional semantic vector indexing',
      'Retrieval-Augmented Generation (RAG) vector stores',
      'Instant semantic deduplication and document clustering'
    ],
    retailComparison: '$0.020 / 1M retail',
    galxDiscount: 'Save 25% ($0.015 direct wholesale)'
  }
];

function BaseSimpleModelPicker() {
  const [selectedCatId, setSelectedCatId] = useState<string>('fast');
  const [naturalQuery, setNaturalQuery] = useState<string>('');

  // Ambiguity-absorbing intent query
  const handleQueryChange = (text: string) => {
    setNaturalQuery(text);
    if (!text.trim()) return;

    const resolved = ModelCatalog.resolveModel(text);
    if (resolved) {
      if (resolved.category === 'embedding') setSelectedCatId('embeddings');
      else if (resolved.category === 'image') setSelectedCatId('visuals');
      else if (resolved.provider === 'xai-grok') setSelectedCatId('velocity');
      else if (resolved.id.includes('terra')) setSelectedCatId('reasoning');
      else setSelectedCatId('fast');
    } else {
      const lower = text.toLowerCase();
      if (lower.includes('embed') || lower.includes('vector') || lower.includes('rag') || lower.includes('semantic')) {
        setSelectedCatId('embeddings');
      } else if (lower.includes('code') || lower.includes('refactor') || lower.includes('logic')) {
        setSelectedCatId('reasoning');
      } else if (lower.includes('grok') || lower.includes('search') || lower.includes('realtime') || lower.includes('1m')) {
        setSelectedCatId('velocity');
      } else if (lower.includes('image') || lower.includes('photo') || lower.includes('render') || lower.includes('dalle')) {
        setSelectedCatId('visuals');
      } else if (lower.includes('chat') || lower.includes('fast') || lower.includes('support')) {
        setSelectedCatId('fast');
      }
    }
  };

  const currentCat = CATEGORIES.find(c => c.id === selectedCatId) || CATEGORIES[0];
  const modelSpecs = EXCLUSIVE_MODEL_CATALOG.find(m => m.id === currentCat.recommendedModelId) || ModelCatalog.resolveModel(currentCat.recommendedModelId);

  return (
    <section className="glass-panel rounded-3xl p-6 sm:p-10 space-y-8 border border-white/10 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>INTERACTIVE INTENT &amp; MODEL MATCHMAKER</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Which AI Engine Fits Your Exact Mental Model?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300">
            Click your primary business goal or describe your task in plain English to auto-match the optimal engine.
          </p>
        </div>

        <Link
          href="/models"
          className="text-xs font-mono text-cyan-300 hover:text-cyan-200 flex items-center gap-1 self-start md:self-auto"
        >
          <span>View All {EXCLUSIVE_MODEL_CATALOG.length} Raw Specifications</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Natural Language Intent & Ambiguity Search Bar */}
      <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={naturalQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Type your use case or alias in plain English (e.g. 'refactor full repo', 'grok 1m', 'extract invoices', 'sol')..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-400">
          <span className="text-zinc-500">Quick Mental Models:</span>
          {[
            { label: 'Refactor Code', query: 'refactor code' },
            { label: 'Grok 1M Context', query: 'grok 4.6' },
            { label: '4K Images', query: 'gpt-image-2' },
            { label: 'Fast Autocomplete', query: 'sol' }
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

      {/* 4 Apple-Style Category Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                      isSelected ? 'bg-amber-400 text-black shadow-md' : 'bg-white/10 text-zinc-300'
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
              href="/keys/new"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer font-mono"
            >
              <span>Deploy Key for This Model ($5 Free)</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export const SimpleModelPicker = withErrorBoundary(BaseSimpleModelPicker, {
  name: 'Simple Model Picker'
});
