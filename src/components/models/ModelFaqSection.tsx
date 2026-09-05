'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Boxes,
  ArrowRight,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  GitCompare,
} from 'lucide-react';
import type { ModelSpecItem } from '@/core/contracts/GalxContracts';
import { CURATED_MATCHUPS } from '@/lib/data/comparisonData';

interface ModelFaqSectionProps {
  model: ModelSpecItem;
  siblingModels: ModelSpecItem[];
}

export function ModelSiblingSection({ model, siblingModels }: ModelFaqSectionProps) {
  const relevantMatchups = CURATED_MATCHUPS.filter(
    (m) => m.modelAId === model.id || m.modelBId === model.id
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Sibling Model Comparison Matrix */}
      <section id="model-siblings" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 uppercase">
              <Boxes className="w-3.5 h-3.5" />
              <span>SIBLING MODEL FLEET MATRIX</span>
            </div>
            <h3 className="text-xl font-black text-white">Compare Alternative Frontier Models</h3>
            <p className="text-xs text-zinc-400 font-sans">
              Switch models dynamically on the same API key without altering client configuration.
            </p>
          </div>

          <Link
            href="/models/compare"
            className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>Full Side-by-Side Matrix →</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          {siblingModels.slice(0, 3).map((sibling) => {
            return (
              <div
                key={sibling.id}
                className="p-5 rounded-2xl bg-black/40 border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{sibling.id}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                      {sibling.category === 'image' ? 'Visual' : 'LLM'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">
                    {sibling.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Input / 1M:</span>
                    <span className="text-emerald-300 font-bold">${sibling.inputPricePer1M.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Context:</span>
                    <span className="text-cyan-300 font-bold">
                      {(sibling.contextWindowTokens / 1000).toLocaleString()}K tokens
                    </span>
                  </div>

                  <Link
                    href={`/models/${sibling.id.replace('/', '-')}`}
                    className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-sans text-xs font-semibold flex items-center justify-center gap-1 border border-white/10 transition-colors cursor-pointer mt-1"
                  >
                    <span>View {sibling.id} Specs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Head-to-Head Matchups Section (pSEO Internal Links) */}
      {relevantMatchups.length > 0 && (
        <section id="model-matchups" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 uppercase">
                <GitCompare className="w-3.5 h-3.5" />
                <span>POPULAR HEAD-TO-HEAD BENCHMARKS</span>
              </div>
              <h3 className="text-lg font-black text-white">Compare {model.name} vs Rivals</h3>
            </div>

            <Link
              href="/models/compare"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
            >
              Compare All →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {relevantMatchups.map((m) => (
              <Link
                key={m.slug}
                href={`/models/vs/${m.slug}`}
                className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-cyan-500/40 transition-all space-y-1.5 group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300 font-mono">
                    {m.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
                <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">
                  {m.verdict.summary}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function ModelFaqSection({ model }: { model: ModelSpecItem; siblingModels?: ModelSpecItem[] }) {
  const [openFaqIndices, setOpenFaqIndices] = useState<number[]>([0]);

  const toggleFaq = (index: number) => {
    setOpenFaqIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const faqItems = [
    {
      q: `Are these official, genuine ${model.name} model weights?`,
      a: `Yes, 100%. GALXAI routes directly to upstream enterprise clusters at OpenAI. The model weights, reasoning traces, and token generations are identical to direct API calls—just delivered with 75%–90% prompt cache pass-through and sub-15ms Anycast routing.`,
    },
    {
      q: 'Does GALXAI add latency to streaming completions?',
      a: 'Zero measurable latency overhead. GALXAI operates Anycast Edge Proxies in 300+ global data centers. Responses begin streaming in < 14ms (TTFT), identical to or faster than connecting directly to single-region upstream origin servers.',
    },
    {
      q: 'How does the 75%–90% Prompt Caching discount work?',
      a: 'Whenever your system prompts or conversation context prefixes exceed 1,024 tokens, GALXAI matches cached RAM slices. You automatically pay up to 90% less on all matching input tokens without altering any request parameters.',
    },
    {
      q: 'Do I need to sign an enterprise contract to access this model?',
      a: 'No. There are zero minimum volume commitments, zero enterprise sales calls, and zero monthly subscriptions. You get immediate access on your very first token with prepaid wallet metering and zero overdraft risk.',
    },
  ];

  return (
    <section id="model-faq" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 uppercase">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>FREQUENTLY ASKED QUESTIONS</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-white">
          Developer Questions &amp; Architecture Notes
        </h3>
        <p className="text-xs text-zinc-400 font-sans">
          Clear answers about genuine model weights, latency guarantees, and prompt caching.
        </p>
      </div>

      <div className="space-y-3 pt-2">
        {faqItems.map((faq, idx) => {
          const isOpen = openFaqIndices.includes(idx);
          return (
            <div
              key={idx}
              className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden transition-all"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
              >
                <span className="font-bold text-white text-sm sm:text-base">{faq.q}</span>
                <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-zinc-400">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-white/5 font-sans animate-in fade-in duration-150">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
