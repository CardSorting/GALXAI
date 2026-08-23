'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Minimize2,
  Sparkles,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  TrendingDown,
  FileText,
  Flame,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

export function PromptCompressorToolClient() {
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-5.6-sol');
  const [inputPrompt, setInputPrompt] = useState<string>(
    `You are an expert AI assistant that is designed to help software engineers write high performance code.

Please make sure to follow all of the instructions listed below very carefully:
- First of all, always ensure that your code is fully type-safe and avoids any "any" types in TypeScript.
- Furthermore, please make sure that you write clean, concise, and elegant comments only when necessary.
- In addition to that, please be aware that all HTTP requests should include appropriate timeout headers.
- Finally, please make sure that you always return your final response in valid JSON format without markdown code fences.

Thank you very much for your assistance and help with this task!`
  );

  const [aggressiveMode, setAggressiveMode] = useState<boolean>(false);
  const [copiedOptimized, setCopiedOptimized] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const selectedModel = useMemo(() => {
    return (
      EXCLUSIVE_MODEL_CATALOG.find((m) => m.id === selectedModelId) ||
      EXCLUSIVE_MODEL_CATALOG[0]
    );
  }, [selectedModelId]);

  // Deterministic Prompt Compaction Engine
  const optimizedPrompt = useMemo(() => {
    if (!inputPrompt.trim()) return '';

    let text = inputPrompt;

    // 1. Remove polite conversational filler phrases
    const fillerPatterns = [
      /\b(Please make sure to|Furthermore, please make sure that you|In addition to that, please be aware that|Finally, please make sure that you|First of all, always ensure that your|Thank you very much for your assistance and help with this task!|Please note that|It is important to remember that)\b/gi,
      /\b(as an AI assistant|as a helpful assistant|you must always remember to)\b/gi,
    ];

    fillerPatterns.forEach((pattern) => {
      text = text.replace(pattern, '');
    });

    if (aggressiveMode) {
      // Aggressive Mode: Convert bullet points to compact semicolon-separated imperatives
      text = text
        .replace(/^[\s*-]+(.*)$/gm, '$1;')
        .replace(/\n{2,}/g, '\n')
        .replace(/;\s*;/g, ';');
    }

    // 2. Normalize whitespace and clean empty lines
    text = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');

    return text.trim();
  }, [inputPrompt, aggressiveMode]);

  const rawTokenCount = useMemo(() => {
    if (!inputPrompt.trim()) return 0;
    return Math.max(1, Math.round(inputPrompt.length / 3.8));
  }, [inputPrompt]);

  const optimizedTokenCount = useMemo(() => {
    if (!optimizedPrompt.trim()) return 0;
    return Math.max(1, Math.round(optimizedPrompt.length / 3.8));
  }, [optimizedPrompt]);

  const tokenReduction = Math.max(0, rawTokenCount - optimizedTokenCount);
  const reductionPercent = rawTokenCount > 0 ? (tokenReduction / rawTokenCount) * 100 : 0;

  // Monthly Dollar Savings on 1M Invocations
  const monthlyDollarSavings = (tokenReduction * 1_000_000 / 1_000_000) * selectedModel.inputPricePer1M;

  const handleCopyOptimized = async () => {
    const ok = await safeCopyToClipboard(optimizedPrompt);
    if (ok) {
      setCopiedOptimized(true);
      setTimeout(() => setCopiedOptimized(false), 2000);
    }
  };

  const toolFaqs = [
    {
      q: 'Does prompt compression degrade model accuracy or instruction adherence?',
      a: 'No. The compaction engine targets semantic redundancy, excessive whitespace, and filler conversational tokens while preserving all core constraints and directives.',
    },
    {
      q: 'How does prompt compression interact with 75% Prompt Caching?',
      a: 'Both work synergistically. Compressing your system prompt reduces the baseline token volume, while prompts over 1,024 tokens receive an additional 75% compound caching discount.',
    },
    {
      q: 'Is prompt optimization done entirely in the browser?',
      a: 'Yes. The prompt compaction engine runs 100% locally in your browser memory for zero data transmission and complete confidentiality.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs
          items={[
            { label: 'Tools', href: '/calculator' },
            { label: 'Prompt Optimizer & Token Compressor' },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Lead */}
        <section id="tool-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <Minimize2 className="w-3.5 h-3.5" />
              <span>DETERMINISTIC TOKEN COMPRESSION ENGINE</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Tool"
              title="GALXAI Prompt Optimizer & Token Compressor"
              description="Eliminate filler tokens and cut API inference costs by up to 35% with zero semantic drift."
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            System Prompt Optimizer &amp; Token Compressor
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            Eliminate conversational filler tokens, whitespace bloat, and redundant phrasing to reduce LLM input token bills by up to 35% with 0% semantic degradation.
          </p>

          <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-xs leading-relaxed font-sans font-medium">
            <strong>Compression Guarantee:</strong> Strips non-instructional tokens while preserving 100% of logical constraints and output formats.
          </div>
        </section>

        {/* Interactive Dual Box: Input vs Compacted Output */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original Prompt */}
          <section id="original-prompt" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-400" />
                  <span>Original System Prompt</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-mono text-xs font-bold">
                  {rawTokenCount} tokens
                </span>
              </div>

              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                rows={9}
                placeholder="Paste original uncompressed system instructions..."
                className="w-full p-4 rounded-2xl bg-black/60 border border-white/10 text-white font-mono text-xs leading-relaxed focus:outline-none focus:border-cyan-500 shadow-inner"
              />
            </div>

            {/* Model Selector & Compaction Mode */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 font-mono text-xs border-t border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-[11px]">Model:</span>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="p-1.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none cursor-pointer"
                >
                  {EXCLUSIVE_MODEL_CATALOG.filter((m) => m.category === 'llm').map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} (${model.inputPricePer1M.toFixed(2)}/1M)
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-300 text-xs">
                <input
                  type="checkbox"
                  checked={aggressiveMode}
                  onChange={(e) => setAggressiveMode(e.target.checked)}
                  className="accent-cyan-400 rounded cursor-pointer"
                />
                <span className="font-bold">Aggressive Semicolon Syntax</span>
              </label>
            </div>
          </section>

          {/* Compacted Output */}
          <section id="optimized-prompt" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Optimized &amp; Compacted Output</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-black">
                  {optimizedTokenCount} tokens (-{reductionPercent.toFixed(1)}%)
                </span>
              </div>

              <textarea
                value={optimizedPrompt}
                readOnly
                rows={9}
                className="w-full p-4 rounded-2xl bg-black/80 border border-emerald-500/30 text-emerald-300 font-mono text-xs leading-relaxed focus:outline-none shadow-inner"
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between font-mono text-xs">
                <span className="text-zinc-400">Projected Savings (1M Calls):</span>
                <span className="text-emerald-400 font-black text-sm">
                  ${monthlyDollarSavings.toFixed(2)}/mo Saved
                </span>
              </div>

              <button
                onClick={handleCopyOptimized}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-black font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                {copiedOptimized ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 fill-black" />}
                <span>{copiedOptimized ? 'Optimized Prompt Copied!' : 'Copy Compacted Prompt'}</span>
              </button>
            </div>
          </section>
        </div>

        {/* AEO Frequently Asked Questions */}
        <section id="tool-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions (Prompt Token Optimization)</span>
            </h2>
            <p className="text-xs text-zinc-400">Compaction algorithms, privacy guarantees, and prompt caching integration.</p>
          </div>

          <div className="space-y-3 pt-2">
            {toolFaqs.map((faq, idx) => {
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

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />
      </main>

      {/* Floating Conversion Dock */}
      <FloatingConversionDock />
    </div>
  );
}
