'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Layers,
  Zap,
  Coins,
  Copy,
  Check,
  ArrowRight,
  HelpCircle,
  FileText,
  Code2,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface PresetItem {
  name: string;
  tokens: number;
  description: string;
  icon: any;
}

const PRESETS: PresetItem[] = [
  { name: '100-Page Technical Whitepaper', tokens: 45000, description: '~35,000 words of technical text with architecture diagrams', icon: FileText },
  { name: 'Mid-Sized Monorepo (50 Files)', tokens: 180000, description: 'TypeScript/Rust codebase with full AST structure', icon: Code2 },
  { name: 'Full-Length Textbook / Novel', tokens: 120000, description: '~90,000 words of narrative text', icon: BookOpen },
  { name: 'Full Enterprise Codebase (200 Files)', tokens: 650000, description: 'Multi-service backend with migration schemas and tests', icon: Code2 },
  { name: '10-Hour Audio Meeting Transcripts', tokens: 95000, description: 'Multi-speaker conversational dialogue transcript', icon: FileText },
];

interface ModelContextProfile {
  name: string;
  id: string;
  contextLimit: number;
  inputCost1M: number;
  cachedCost1M: number;
  provider: string;
}

const MODEL_PROFILES: ModelContextProfile[] = [
  { name: 'OpenAI GPT-5.6 Sol', id: 'gpt-5.6-sol', contextLimit: 900000, inputCost1M: 3.75, cachedCost1M: 1.25, provider: 'OpenAI' },
  { name: 'OpenAI GPT-5.6 Terra', id: 'gpt-5.6-terra', contextLimit: 750000, inputCost1M: 2.25, cachedCost1M: 0.75, provider: 'OpenAI' },
  { name: 'OpenAI GPT-5.6 Luna', id: 'gpt-5.6-luna', contextLimit: 500000, inputCost1M: 0.75, cachedCost1M: 0.25, provider: 'OpenAI' },
  { name: 'OpenAI GPT-4o (Legacy)', id: 'gpt-4o', contextLimit: 128000, inputCost1M: 5.00, cachedCost1M: 2.50, provider: 'OpenAI' },
];

export function ContextWindowVisualizerClient() {
  const [tokenCount, setTokenCount] = useState<number>(180000);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-5.6-sol');
  const [copiedCode, setCopiedCode] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const activeProfile = MODEL_PROFILES.find((m) => m.id === selectedModel) || MODEL_PROFILES[0];
  const percentFilled = Math.min(100, Math.round((tokenCount / activeProfile.contextLimit) * 100));

  // Equivalencies calculus
  const estimatedWords = Math.round(tokenCount * 0.75);
  const estimatedPages = Math.round(estimatedWords / 350);
  const estimatedCodeLines = Math.round(tokenCount / 12);

  // Caching economics
  const isEligibleForCache = tokenCount >= 1024;
  const standardCost = (tokenCount / 1000000) * activeProfile.inputCost1M;
  const cachedCost = isEligibleForCache
    ? (tokenCount / 1000000) * activeProfile.cachedCost1M
    : standardCost;
  const savingsAmount = standardCost - cachedCost;
  const savingsPct = standardCost > 0 ? Math.round((savingsAmount / standardCost) * 100) : 0;

  const pythonSnippet = `from openai import OpenAI

# Ingest massive ${tokenCount.toLocaleString()} token context into ${activeProfile.name}
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

response = client.chat.completions.create(
    model="${activeProfile.id}",
    messages=[
        {"role": "system", "content": "You are analyzing a massive ${tokenCount.toLocaleString()} token codebase."},
        {"role": "user", "content": "Synthesize architectural refactoring opportunities across all files."}
    ]
)
print(response.choices[0].message.content)`;

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(pythonSnippet);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Tools', href: '/calculator' },
            { label: 'Context Window Visualizer' },
          ]}
        />

        {/* Hero Section */}
        <section id="tool-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <Layers className="w-3.5 h-3.5" />
              <span>1,000,000 TOKEN CONTEXT SIMULATOR &amp; CACHE CALCULATOR</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Tool"
              title="LLM Context Window Visualizer — GALXAI Tools"
              description="Calculate token capacity across 1M, 900K, 500K context windows with 75% prompt caching."
            />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              LLM Context Window Capacity &amp; Caching Visualizer
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 max-w-3xl leading-relaxed font-sans">
              Visualize how massive documents, entire software repositories, and audio transcripts fit into frontier context windows up to <strong className="text-cyan-300">1,000,000 tokens</strong>. Calculate exact wholesale costs and automatic 75% prompt caching savings.
            </p>
          </div>
        </section>

        {/* BLUF AEO Direct Answer Summary */}
        <section id="aeo-direct-answer" className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/30 bg-emerald-500/5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-xs uppercase">
            <Sparkles className="w-4 h-4" />
            <span>Direct Answer: How Much Fits in a 900,000 Token Context Window?</span>
          </div>
          <p className="text-sm sm:text-base text-white leading-relaxed font-sans">
            A <strong>900,000 (900K) token context window</strong> (supported by <strong>OpenAI GPT-5.6 Sol</strong> on GALXAI) holds approximately <strong>675,000 English words</strong>, <strong>1,900 pages of text</strong>, or roughly <strong>75,000 lines of source code</strong> in a single prompt. On GALXAI, prefixes over 1,024 tokens automatically receive a <strong>75% prompt caching discount</strong>, reducing recurring context analysis costs from $3.75 down to just $1.25 per million tokens.
          </p>
        </section>

        {/* Interactive Controls & Capacity Gauge */}
        <section id="interactive-visualizer" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Controls */}
            <div className="lg:col-span-1 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase block">
                  Select Frontier Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  aria-label="Select Frontier Model"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                >
                  {MODEL_PROFILES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({Math.round(m.contextLimit / 1000)}K Tokens)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <label htmlFor="token-slider" className="font-bold text-zinc-300 uppercase">Input Token Count</label>
                  <span className="text-cyan-300 font-bold">{tokenCount.toLocaleString()} Tokens</span>
                </div>
                <input
                  id="token-slider"
                  type="range"
                  min="1000"
                  max={activeProfile.contextLimit}
                  step="5000"
                  value={tokenCount}
                  onChange={(e) => setTokenCount(Number(e.target.value))}
                  aria-label="Input Token Count Slider"
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase block">
                  Quick Workload Presets
                </span>
                <div className="space-y-1.5">
                  {PRESETS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.name}
                        onClick={() => setTokenCount(Math.min(p.tokens, activeProfile.contextLimit))}
                        className={`w-full p-2.5 rounded-xl text-left border text-xs transition-all flex items-center gap-2.5 cursor-pointer ${
                          tokenCount === p.tokens
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-white'
                            : 'bg-black/40 border-white/5 text-zinc-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div className="truncate">
                          <span className="font-bold block truncate">{p.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {p.tokens.toLocaleString()} tokens
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Gauge & Metrics Breakdown */}
            <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
              {/* Visual Fill Gauge */}
              <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 font-bold">
                    Context Window Utilization ({activeProfile.name})
                  </span>
                  <span className={`font-bold ${percentFilled > 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {percentFilled}% Filled ({tokenCount.toLocaleString()} / {activeProfile.contextLimit.toLocaleString()})
                  </span>
                </div>

                {/* Progress Bar with Caching Marker */}
                <div className="relative w-full h-7 rounded-xl bg-zinc-900 overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-500 transition-all duration-300"
                    style={{ width: `${percentFilled}%` }}
                  />
                  {/* 1,024 Cache Breakpoint line */}
                  <div
                    className="absolute top-0 bottom-0 w-[2px] bg-emerald-400 z-10"
                    style={{ left: `${Math.max(1, (1024 / activeProfile.contextLimit) * 100)}%` }}
                    title="1,024 Token 75% Prompt Caching Breakpoint"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>0 Tokens</span>
                  <span className="text-emerald-400">▲ 1,024 (75% Caching Begins)</span>
                  <span>{activeProfile.contextLimit.toLocaleString()} Max Tokens</span>
                </div>
              </div>

              {/* Real-World Equivalence Cards */}
              <div className="grid grid-cols-3 gap-3 font-mono text-xs text-center">
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-zinc-400 text-[10px] uppercase block font-sans">Estimated Words</span>
                  <span className="text-white font-bold text-base sm:text-lg">~{estimatedWords.toLocaleString()}</span>
                  <span className="text-zinc-500 text-[10px] block font-sans">English Vocabulary</span>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-zinc-400 text-[10px] uppercase block font-sans">Book / Doc Pages</span>
                  <span className="text-cyan-300 font-bold text-base sm:text-lg">~{estimatedPages.toLocaleString()}</span>
                  <span className="text-zinc-500 text-[10px] block font-sans">@ 350 words/page</span>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-zinc-400 text-[10px] uppercase block font-sans">Source Code Lines</span>
                  <span className="text-amber-300 font-bold text-base sm:text-lg">~{estimatedCodeLines.toLocaleString()}</span>
                  <span className="text-zinc-500 text-[10px] block font-sans">TS / Python AST</span>
                </div>
              </div>

              {/* Prompt Caching Economics Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-black/50 to-cyan-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 text-emerald-400 font-mono text-xs font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>75% PROMPT CACHING SAVINGS</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-sans">
                    Standard Price: <span className="line-through text-zinc-500 font-mono">${standardCost.toFixed(4)}</span> → Cached Rate: <strong className="text-emerald-300 font-mono">${cachedCost.toFixed(4)}</strong> per query.
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                    Save {savingsPct}% (-${savingsAmount.toFixed(4)})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 1-Line Code Ingestion Snippet */}
        <section id="code-snippet" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>Execute Long-Context Ingestion via OpenAI SDK</span>
              </h2>
              <p className="text-xs text-zinc-400">100% wire-compatible drop-in with 75% cached token pass-through.</p>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 text-zinc-300 font-mono text-xs overflow-x-auto leading-relaxed">
            {pythonSnippet}
          </pre>
        </section>

        {/* FAQs for AEO */}
        <section id="faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2 border-b border-white/10 pb-3">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>Frequently Asked Questions — Context Windows &amp; Caching</span>
          </h2>

          <div className="space-y-3 pt-2">
            {[
              {
                q: 'What is the largest context window available on GALXAI?',
                a: 'OpenAI GPT-5.6 Sol offers a 900,000 (900K) token context window with sub-15ms Anycast TTFT and 75% prompt caching pass-through.',
              },
              {
                q: 'How does prompt caching work on 900K token contexts?',
                a: 'When sending repeated prompts exceeding 1,024 tokens with identical leading prefixes (e.g. system instructions, documentation, or code repositories), GALXAI passes through the provider 75% cached token rebate automatically.',
              },
              {
                q: 'How are tokens converted to word and page counts?',
                a: 'For English text, 1 token is approximately 0.75 words. A standard single-spaced document page contains about 350 to 500 words (450 to 650 tokens). In programming code, 1 token is approximately 12 characters or 1/12 of a code line.',
              },
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02]"
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

        <TrustSeals />
      </main>

      <FloatingConversionDock />
    </div>
  );
}
