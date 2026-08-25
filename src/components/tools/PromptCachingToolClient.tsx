'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  Code2,
  FileText,
  Flame,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/ModelCatalog';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

export function PromptCachingToolClient() {
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-5.6-sol');
  const [promptText, setPromptText] = useState<string>(
    `You are an enterprise systems engineer and technical architect with deep expertise in distributed Anycast model routing, low-latency Server-Sent Events (SSE), and token economics.

When analyzing systems:
1. Verify end-to-end Time-To-First-Token (TTFT) guarantees (<15ms).
2. Ensure prefix prompt caching matches RAM slices for all context windows exceeding 1,024 tokens.
3. Validate Cryptographic Zero Data Retention (ZDR) across all volatile memory buffers.
4. Enforce strict JSON Schema constrained decoding to eliminate parse failures in downstream worker pools.

Always provide concise, production-ready code examples conforming to standard OpenAI wire compatibility.`
  );
  const [copiedCode, setCopiedCode] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const selectedModel = useMemo(() => {
    return (
      FRONTEND_VISIBLE_MODELS.find((m) => m.id === selectedModelId) ||
      FRONTEND_VISIBLE_MODELS[0]
    );
  }, [selectedModelId]);

  // Approximate BPE token count: ~4 characters per token on average for English prose/code
  const tokenCount = useMemo(() => {
    if (!promptText.trim()) return 0;
    const words = promptText.trim().split(/\s+/).length;
    const chars = promptText.length;
    return Math.max(1, Math.round(chars / 3.8));
  }, [promptText]);

  const isEligibleForCaching = tokenCount >= 1024;
  const tokensNeededForCaching = Math.max(0, 1024 - tokenCount);

  const pricingCalculations = useMemo(() => {
    const standardInputRate = selectedModel.inputPricePer1M;
    const cachedInputRate =
      selectedModel.cachedInputPricePer1M ?? selectedModel.inputPricePer1M * 0.25;

    const uncachedCostPerCall = (tokenCount / 1_000_000) * standardInputRate;
    const cachedCostPerCall = isEligibleForCaching
      ? (tokenCount / 1_000_000) * cachedInputRate
      : uncachedCostPerCall;

    const savingsPerCall = uncachedCostPerCall - cachedCostPerCall;
    const savingsPer100kCalls = savingsPerCall * 100_000;

    return {
      uncachedCostPerCall,
      cachedCostPerCall,
      savingsPerCall,
      savingsPer100kCalls,
      standardInputRate,
      cachedInputRate,
    };
  }, [selectedModel, tokenCount, isEligibleForCaching]);

  const generatedPythonCode = useMemo(() => {
    const escapedPrompt = promptText.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `from openai import OpenAI

# 1-Line Drop-in Client with 75% Prompt Caching
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# This system prompt (${tokenCount} tokens) ${isEligibleForCaching ? 'automatically qualifies for a 75% caching discount' : 'needs ' + tokensNeededForCaching + ' more tokens for caching'}
response = client.chat.completions.create(
    model="${selectedModel.id}",
    messages=[
        {"role": "system", "content": "${escapedPrompt.slice(0, 120)}..."},
        {"role": "user", "content": "Execute analysis"}
    ]
)`;
  }, [selectedModel, promptText, tokenCount, isEligibleForCaching, tokensNeededForCaching]);

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(generatedPythonCode);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const toolFaqs = [
    {
      q: 'How does GALXAI detect and match cached prompt prefixes?',
      a: 'GALXAI evaluates prompt prefixes in volatile RAM slices. If the leading tokens (system instructions, documents, or schema definitions) exceed 1,024 tokens and match previous requests, the 75% discount applies automatically with zero code changes.',
    },
    {
      q: 'Do cached prompts expire?',
      a: 'Prompt caches stay warm in RAM during active usage. Typically caches remain warm for 5 to 10 minutes following the most recent request.',
    },
    {
      q: 'Does prompt caching alter the model response or token quality?',
      a: 'Zero difference. Cached tokens reuse exact mathematical Key-Value (KV) attention matrices, guaranteeing mathematically identical completions to non-cached requests.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs
          items={[
            { label: 'Tools', href: '/calculator' },
            { label: 'Prompt Caching Estimator & Token Counter' },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Lead */}
        <section id="tool-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>INTERACTIVE PROMPT CACHING TOKEN ESTIMATOR</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Tool"
              title="GALXAI Prompt Caching Estimator & Token Counter"
              description="Analyze prompt token count and calculate instant 75% prompt caching savings."
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Prompt Caching Estimator &amp; Token Counter
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            Paste your system prompts, RAG documents, or agent instructions to measure token count, check 1,024-token prefix caching eligibility, and calculate instant 75% compound cost savings.
          </p>
        </section>

        {/* Interactive Prompt Editor & Telemetry Dial */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Prompt Input Box */}
          <section id="prompt-input" className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase font-bold text-amber-400">Step 1: Paste Prompt Context</span>
                <h2 className="text-lg font-bold text-white font-mono">Live Prompt Prefix Analyzer</h2>
              </div>

              {/* Model Selector */}
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="p-2 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none cursor-pointer"
              >
                {FRONTEND_VISIBLE_MODELS.filter((m) => m.category === 'llm').map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} (${model.inputPricePer1M.toFixed(2)}/1M)
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={10}
              placeholder="Paste your system instructions, tool schemas, or document context here..."
              className="w-full p-4 rounded-2xl bg-black/60 border border-white/10 text-white font-mono text-xs leading-relaxed focus:outline-none focus:border-cyan-500 shadow-inner"
            />

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-zinc-400">
              <span>Quick Presets:</span>
              <button
                onClick={() =>
                  setPromptText(
                    `You are a specialized software engineering agent with complete codebase context.\n\n` +
                      `CONTEXT SPECIFICATION:\n` +
                      Array(25)
                        .fill(
                          `// Module: Enterprise Token Governor\nexport class TokenGovernor { private pool: Map<string, number> = new Map(); }\n`
                        )
                        .join('\n')
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 cursor-pointer"
              >
                + Large Codebase Context (&gt;1,200 tok)
              </button>
              <button
                onClick={() => setPromptText('')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
              >
                Clear
              </button>
            </div>
          </section>

          {/* Telemetry & Savings Readout */}
          <section id="caching-telemetry" className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-cyan-500/30 bg-cyan-500/5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-1 border-b border-white/10 pb-4">
                <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">
                  Live Token &amp; Caching Telemetry
                </span>
                <h2 className="text-xl font-black text-white font-mono">Caching Eligibility Status</h2>
              </div>

              {/* Token Count & Status Badge */}
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-xs font-mono">Estimated Token Count:</span>
                  <span className="text-2xl font-black text-white font-mono">
                    {tokenCount.toLocaleString()} <span className="text-xs font-normal text-zinc-400">tokens</span>
                  </span>
                </div>

                {isEligibleForCaching ? (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 text-xs font-mono font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>ELIGIBLE: 75% Compound Rebate Active (&gt;1,024 tokens)</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-2 text-xs font-mono">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Add {tokensNeededForCaching.toLocaleString()} more tokens to trigger the 75% caching discount.</span>
                  </div>
                )}
              </div>

              {/* Cost Delta Matrix */}
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-zinc-400">Uncached Input Cost / Call:</span>
                  <span className="text-white font-bold">${pricingCalculations.uncachedCostPerCall.toFixed(5)}</span>
                </div>

                <div className="flex justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-emerald-300 font-bold">Cached Cost / Call (-75%):</span>
                  <span className="text-emerald-300 font-bold">${pricingCalculations.cachedCostPerCall.toFixed(5)}</span>
                </div>

                <div className="flex justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-zinc-400">Net Savings on 100K Invocations:</span>
                  <span className="text-amber-300 font-bold">${pricingCalculations.savingsPer100kCalls.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Link
              href="/keys/new"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer mt-4"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Deploy Prompt with $5 Free Credits →</span>
            </Link>
          </section>
        </div>

        {/* 1-Click Generated SDK Code Recipe */}
        <section id="generated-recipe" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">Step 2: Instant Code Recipe</span>
              <h2 className="text-lg font-bold text-white font-mono">1-Line Python SDK Snippet with Prompt Pre-filled</h2>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code Snippet'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
            {generatedPythonCode}
          </pre>
        </section>

        {/* AEO Frequently Asked Questions */}
        <section id="tool-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions (Prompt Caching Architecture)</span>
            </h2>
            <p className="text-xs text-zinc-400">Technical specifics regarding KV cache reuse, eviction, and cost attribution.</p>
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
