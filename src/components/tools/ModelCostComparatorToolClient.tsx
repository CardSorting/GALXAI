'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  DollarSign,
  TrendingDown,
  Copy,
  Check,
  Zap,
  CheckCircle2,
  Cpu,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/ModelCatalog';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

export function ModelCostComparatorToolClient() {
  const [monthlyInputMillions, setMonthlyInputMillions] = useState<number>(20);
  const [monthlyOutputMillions, setMonthlyOutputMillions] = useState<number>(5);
  const [cacheHitPercentage, setCacheHitPercentage] = useState<number>(50);
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-5.6-sol');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Filter LLM models for comparison
  const comparisonModels = useMemo(() => {
    return FRONTEND_VISIBLE_MODELS.filter((m) => m.category === 'llm');
  }, []);

  const selectedModel = useMemo(() => {
    return comparisonModels.find((m) => m.id === selectedModelId) || comparisonModels[0];
  }, [comparisonModels, selectedModelId]);

  // Dynamic Cost Calculation Matrix
  const modelCostTable = useMemo(() => {
    return comparisonModels.map((model) => {
      const regularInputTokens = monthlyInputMillions * 1_000_000 * (1 - cacheHitPercentage / 100);
      const cachedInputTokens = monthlyInputMillions * 1_000_000 * (cacheHitPercentage / 100);
      const outputTokens = monthlyOutputMillions * 1_000_000;

      // GALXAI Wholesale Pricing
      const galxInputCost = (regularInputTokens / 1_000_000) * model.inputPricePer1M;
      const galxCachedCost = (cachedInputTokens / 1_000_000) * (model.inputPricePer1M * 0.25);
      const galxOutputCost = (outputTokens / 1_000_000) * model.outputPricePer1M;
      const galxTotalMonthly = galxInputCost + galxCachedCost + galxOutputCost;

      // Standard Direct Provider Pricing (+35% markup assumption without wholesale pricing)
      const directInputPrice = model.inputPricePer1M * 1.35;
      const directOutputPrice = model.outputPricePer1M * 1.35;
      const directInputCost = (regularInputTokens / 1_000_000) * directInputPrice;
      const directCachedCost = (cachedInputTokens / 1_000_000) * (directInputPrice * 0.5); // only 50% discount direct vs 75% GALXAI
      const directOutputCost = (outputTokens / 1_000_000) * directOutputPrice;
      const directTotalMonthly = directInputCost + directCachedCost + directOutputCost;

      const monthlySavings = Math.max(0, directTotalMonthly - galxTotalMonthly);
      const annualSavings = monthlySavings * 12;

      return {
        model,
        galxTotalMonthly,
        directTotalMonthly,
        monthlySavings,
        annualSavings,
      };
    });
  }, [comparisonModels, monthlyInputMillions, monthlyOutputMillions, cacheHitPercentage]);

  const generatedCode = useMemo(() => {
    return `from openai import OpenAI

# Initialize GALXAI with wholesale pricing & 75% prompt caching
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Calling ${selectedModel.name} at wholesale rates ($${selectedModel.inputPricePer1M.toFixed(2)}/1M in, $${selectedModel.outputPricePer1M.toFixed(2)}/1M out)
response = client.chat.completions.create(
    model="${selectedModel.id}",
    messages=[
        {"role": "system", "content": "You are an enterprise AI assistant running on GALXAI."},
        {"role": "user", "content": "Execute high-volume batch analysis."}
    ],
    temperature=0.2
)
print(response.choices[0].message.content)`;
  }, [selectedModel]);

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(generatedCode);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const toolFaqs = [
    {
      q: 'How does GALXAI offer 25% to 40% wholesale pricing compared to direct providers?',
      a: 'GALXAI negotiates high-volume enterprise compute reservations with upstream infrastructure providers, passing wholesale volume tier discounts directly to developers without middleman surcharges.',
    },
    {
      q: 'How does the 75% Prompt Caching discount work?',
      a: 'When an incoming request shares an identical prefix of 1,024+ tokens with previous requests, the cached tokens are processed at a 75% discount ($0.25 on the dollar) and delivered in <15ms.',
    },
    {
      q: 'Can I switch between OpenAI models and visual models using the same API key?',
      a: 'Yes. A single GALXAI API key unlocks unified routing across GPT-5.6 Sol, GPT-5.6 Terra, GPT-5.6 Luna, GPT-Image-2, DALL-E 3, and Vector Embeddings.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs
          items={[
            { label: 'Tools', href: '/calculator' },
            { label: 'Model Cost Comparator & Savings Studio' },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Lead */}
        <section id="tool-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-emerald-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <DollarSign className="w-3.5 h-3.5" />
              <span>INTERACTIVE LLM PRICING &amp; SAVINGS COMPARATOR</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Tool"
              title="GALXAI Model Cost Comparator & Savings Studio"
              description="Calculate and compare monthly inference costs across OpenAI and xAI frontier models with wholesale discounts."
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Model Cost Comparator Studio
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            Compare real-world monthly token costs across GPT-5.6 Sol, GPT-5.6 Terra, GPT-5.6 Luna, and Grok 4.6 with automated 75% prompt caching and wholesale volume rebates.
          </p>
        </section>

        {/* Interactive Dual Panel: Workload Sliders vs Side-by-Side Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Workload Sliders Panel */}
          <section id="workload-sliders" className="lg:col-span-4 glass-panel rounded-3xl p-6 sm:p-8 space-y-5 border border-white/10">
            <div className="space-y-1 border-b border-white/10 pb-3">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">Step 1: Define Workload</span>
              <h2 className="text-lg font-bold text-white font-mono">Monthly Traffic Sliders</h2>
            </div>

            {/* Input Tokens Slider */}
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Monthly Input Tokens:</span>
                <span className="text-emerald-300 font-bold">{monthlyInputMillions}M</span>
              </div>
              <input
                type="range"
                min={1}
                max={200}
                step={1}
                value={monthlyInputMillions}
                onChange={(e) => setMonthlyInputMillions(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Output Tokens Slider */}
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Monthly Output Tokens:</span>
                <span className="text-cyan-300 font-bold">{monthlyOutputMillions}M</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={monthlyOutputMillions}
                onChange={(e) => setMonthlyOutputMillions(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Prompt Cache Hit Slider */}
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Cache Hit Rate (75% Off):</span>
                <span className="text-amber-300 font-bold">{cacheHitPercentage}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={cacheHitPercentage}
                onChange={(e) => setCacheHitPercentage(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Quick Presets */}
            <div className="pt-2 border-t border-white/5 space-y-2 font-mono text-xs">
              <span className="text-[10px] uppercase text-zinc-500 block">Traffic Presets</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setMonthlyInputMillions(5);
                    setMonthlyOutputMillions(1);
                    setCacheHitPercentage(30);
                  }}
                  className="p-2 rounded-xl bg-black/40 hover:bg-white/5 border border-white/5 text-[11px] text-zinc-300 transition-colors cursor-pointer text-center"
                >
                  Startup Bot
                </button>
                <button
                  onClick={() => {
                    setMonthlyInputMillions(100);
                    setMonthlyOutputMillions(20);
                    setCacheHitPercentage(70);
                  }}
                  className="p-2 rounded-xl bg-black/40 hover:bg-white/5 border border-white/5 text-[11px] text-emerald-300 transition-colors cursor-pointer text-center font-bold"
                >
                  Enterprise Fleet
                </button>
              </div>
            </div>
          </section>

          {/* Side-by-Side Model Comparison Cards */}
          <section id="cost-matrix" className="lg:col-span-8 glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-emerald-500/30 bg-[#0b0e17] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">Comparison Matrix</span>
                  <h2 className="text-lg font-bold text-white font-mono">Wholesale vs Direct Provider Invoices</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1 font-mono text-xs">
                {modelCostTable.map(({ model, galxTotalMonthly, directTotalMonthly, monthlySavings, annualSavings }) => {
                  const isSelected = selectedModelId === model.id;
                  return (
                    <div
                      key={model.id}
                      onClick={() => setSelectedModelId(model.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                          : 'bg-black/50 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{model.name}</span>
                        {isSelected && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Selected</span>}
                      </div>

                      <div className="space-y-1 pt-1 border-t border-white/5">
                        <div className="flex justify-between text-zinc-400">
                          <span>GALXAI Wholesale:</span>
                          <span className="text-emerald-300 font-black text-sm">${galxTotalMonthly.toFixed(2)}/mo</span>
                        </div>
                        <div className="flex justify-between text-zinc-500 text-[11px]">
                          <span>Direct Retail:</span>
                          <span className="line-through">${directTotalMonthly.toFixed(2)}/mo</span>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center justify-between">
                        <span>Annual Savings:</span>
                        <span>+${annualSavings.toFixed(0)}/yr</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Link
              href="/keys/new"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-black font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer mt-4"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Deploy {selectedModel.name} at Wholesale Rates →</span>
            </Link>
          </section>
        </div>

        {/* 1-Click Code Generator */}
        <section id="comparator-code-snippet" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                1-Click Python Integration ({selectedModel.name})
              </span>
              <h2 className="text-lg font-bold text-white font-mono">
                Production SDK Invocation Code
              </h2>
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
            {generatedCode}
          </pre>
        </section>

        {/* AEO Frequently Asked Questions */}
        <section id="tool-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions (Model Cost Comparisons)</span>
            </h2>
            <p className="text-xs text-zinc-400">Wholesale pricing mechanics, prompt caching tiers, and billing guarantees.</p>
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
