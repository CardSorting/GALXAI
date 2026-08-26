'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Calculator,
  Coins,
  Flame,
  Zap,
  TrendingDown,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/ModelCatalog';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

export function CalculatorClient() {
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-5.6-sol');
  const [inputTokensM, setInputTokensM] = useState<number>(25); // 25M input/mo
  const [outputTokensM, setOutputTokensM] = useState<number>(10); // 10M output/mo
  const [cacheHitPercent, setCacheHitPercent] = useState<number>(60); // 60% cache hit
  const [copiedAudit, setCopiedAudit] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [inboundEmail, setInboundEmail] = useState<string>('');
  const [inboundCompany, setInboundCompany] = useState<string>('');
  const [isSubmittingLead, setIsSubmittingLead] = useState<boolean>(false);
  const [leadSubmitted, setLeadSubmitted] = useState<boolean>(false);

  const selectedModel = useMemo(() => {
    return (
      FRONTEND_VISIBLE_MODELS.find((m) => m.id === selectedModelId) ||
      FRONTEND_VISIBLE_MODELS[0]
    );
  }, [selectedModelId]);

  const calculations = useMemo(() => {
    const listInputRate = selectedModel.listPricePer1MInput ?? selectedModel.inputPricePer1M * 1.33;
    const listOutputRate = selectedModel.listPricePer1MOutput ?? selectedModel.outputPricePer1M * 1.33;

    // Direct Retail Monthly Cost
    const retailInputCost = inputTokensM * listInputRate;
    const retailOutputCost = outputTokensM * listOutputRate;
    const retailTotal = retailInputCost + retailOutputCost;

    // GALXAI Wholesale Base (without prompt caching)
    const galxaiBaseInputCost = inputTokensM * selectedModel.inputPricePer1M;
    const galxaiOutputCost = outputTokensM * selectedModel.outputPricePer1M;

    // Prompt Caching Rebate on Cached Input Tokens
    const cachedTokensM = inputTokensM * (cacheHitPercent / 100);
    const uncachedTokensM = inputTokensM - cachedTokensM;
    const cachedInputRate =
      selectedModel.cachedInputPricePer1M ?? selectedModel.inputPricePer1M * 0.25;

    const galxaiCachedInputCost =
      uncachedTokensM * selectedModel.inputPricePer1M + cachedTokensM * cachedInputRate;
    const galxaiFinalTotal = galxaiCachedInputCost + galxaiOutputCost;

    const monthlySavings = Math.max(0, retailTotal - galxaiFinalTotal);
    const annualSavings = monthlySavings * 12;
    const savingsPercent = retailTotal > 0 ? (monthlySavings / retailTotal) * 100 : 0;

    return {
      retailTotal,
      galxaiFinalTotal,
      monthlySavings,
      annualSavings,
      savingsPercent,
      cachedTokensM,
    };
  }, [selectedModel, inputTokensM, outputTokensM, cacheHitPercent]);

  const handleCopyAudit = async () => {
    const text = `GALXAI Workload ROI Audit:
Model: ${selectedModel.name} (${selectedModel.id})
Volume: ${inputTokensM}M Input / ${outputTokensM}M Output per Month (${cacheHitPercent}% Cached)
Direct Retail Cost: $${calculations.retailTotal.toFixed(2)}/mo
GALXAI Wholesale Cost: $${calculations.galxaiFinalTotal.toFixed(2)}/mo
Net Monthly Savings: $${calculations.monthlySavings.toFixed(2)} (-${calculations.savingsPercent.toFixed(1)}%)
Net Annual Savings: $${calculations.annualSavings.toFixed(2)}/yr
Source: https://galx.ai/calculator`;

    const ok = await safeCopyToClipboard(text);
    if (ok) {
      setCopiedAudit(true);
      setTimeout(() => setCopiedAudit(false), 2000);
    }
  };

  const calculatorFaqs = [
    {
      q: 'How is the prompt caching savings calculated?',
      a: 'When prompt prefixes exceed 1,024 tokens and match cached RAM slices, GALXAI applies a 75% compound rebate on the input token price, passing 100% of the upstream savings directly to your wallet.',
    },
    {
      q: 'Do I need an enterprise subscription to access wholesale rates?',
      a: 'No. GALXAI provides direct wholesale rates starting on your very first token with zero monthly seat licenses and zero minimum commitments.',
    },
    {
      q: 'Can I export this calculation for my finance / budget approval team?',
      a: 'Yes. Click "Copy ROI Audit Report" above to copy a machine-formatted summary ready for inclusion in team budget proposals.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs items={[{ label: 'Universal Token & Prompt Caching Calculator' }]} />

        {/* Hero Header */}
        <section id="calculator-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-emerald-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <Calculator className="w-3.5 h-3.5" />
              <span>INTERACTIVE ROI &amp; SAVINGS CALCULATOR</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Calculator"
              title="GALXAI Universal AI Token & Prompt Caching Cost Calculator"
              description="Calculate exact monthly and annual savings on OpenAI and xAI models with 75% prompt caching."
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            AI Token &amp; Prompt Caching Cost Calculator
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            Simulate your production token workloads to calculate exact monthly savings, compound 75% prompt caching rebates, and annual net enterprise ROI vs direct retail API pricing.
          </p>
        </section>

        {/* Interactive Dual Panel: Controls vs Live Financial Readout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel */}
          <section id="calculator-controls" className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
            <div className="space-y-1 border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Configure Monthly Workload Parameters</span>
              </h2>
              <p className="text-xs text-zinc-400">Adjust token volume and prefix caching match rates.</p>
            </div>

            {/* Model Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-zinc-300 uppercase block">
                Target Model Engine
              </label>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {FRONTEND_VISIBLE_MODELS.filter((m) => m.category === 'llm').map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} (${model.inputPricePer1M.toFixed(2)}/1M Input • -{model.discountPercentage ?? 25}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Input Tokens Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-bold text-zinc-300">Monthly Input Tokens:</span>
                <span className="text-emerald-400 font-bold text-sm">{inputTokensM} Million Tokens</span>
              </div>
              <input
                type="range"
                min={1}
                max={200}
                step={1}
                value={inputTokensM}
                onChange={(e) => setInputTokensM(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>1M</span>
                <span>50M</span>
                <span>100M</span>
                <span>200M+</span>
              </div>
            </div>

            {/* Output Tokens Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-bold text-zinc-300">Monthly Output Tokens:</span>
                <span className="text-amber-400 font-bold text-sm">{outputTokensM} Million Tokens</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={outputTokensM}
                onChange={(e) => setOutputTokensM(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>1M</span>
                <span>25M</span>
                <span>50M</span>
                <span>100M+</span>
              </div>
            </div>

            {/* Prompt Caching Prefix Match Slider */}
            <div className="space-y-2 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Prompt Caching Match Rate:</span>
                </span>
                <span className="text-cyan-300 font-bold text-sm">{cacheHitPercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={cacheHitPercent}
                onChange={(e) => setCacheHitPercent(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-400 font-sans">
                {calculations.cachedTokensM.toFixed(1)}M input tokens qualify for the 75% compound caching discount.
              </p>
            </div>
          </section>

          {/* Financial Readout Panel */}
          <section id="calculator-results" className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-1 border-b border-white/10 pb-4">
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                  Estimated Financial Impact
                </span>
                <h2 className="text-xl font-black text-white font-mono">Net Cost &amp; ROI Delta</h2>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 flex justify-between items-center">
                  <span className="text-zinc-400">Direct Retail Bill:</span>
                  <span className="text-zinc-400 line-through font-bold text-sm">
                    ${calculations.retailTotal.toFixed(2)}/mo
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-black/80 border border-emerald-500/40 flex justify-between items-center">
                  <div>
                    <span className="text-white font-bold block text-sm">GALXAI Wholesale:</span>
                    <span className="text-[10px] text-emerald-400 font-bold">Includes 75% Caching Pass</span>
                  </div>
                  <span className="text-emerald-300 font-black text-2xl">
                    ${calculations.galxaiFinalTotal.toFixed(2)}/mo
                  </span>
                </div>
              </div>

              {/* Net ROI Summary Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-300 uppercase">
                    Annual Net Savings:
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold">
                    -{calculations.savingsPercent.toFixed(1)}% OFF
                  </span>
                </div>
                <div className="text-3xl font-black text-white font-mono">
                  ${calculations.annualSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-zinc-400 font-sans"> / year</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <button
                onClick={handleCopyAudit}
                className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all border border-white/10 cursor-pointer"
              >
                {copiedAudit ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedAudit ? 'ROI Report Copied to Clipboard' : 'Copy ROI Audit Report'}</span>
              </button>

              <Link
                href="/keys/new"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-black font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>Start Saving with $5 Free Credits →</span>
              </Link>
            </div>

            {/* Inbound Lead Capture Box: Claim $100 Grant & Full Custom Audit */}
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-cyan-950/40 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 font-mono text-xs font-bold">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Claim $100 Compute Key + Custom Audit</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Send this tailored spend audit to your team and receive a pre-loaded $100 enterprise trial key.
              </p>

              {leadSubmitted ? (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Audit queued! Your $100 key is being generated.</span>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!inboundEmail || isSubmittingLead) return;
                    setIsSubmittingLead(true);
                    try {
                      const res = await fetch('/api/inbound/lead', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          email: inboundEmail,
                          companyName: inboundCompany || 'Undisclosed Team',
                          source: 'calculator',
                          modelPreference: selectedModel.id,
                          estimatedMonthlyTokens: (inputTokensM + outputTokensM) * 1_000_000,
                          estimatedMonthlySpend: calculations.retailTotal,
                          stack: ['openai', 'nextjs'],
                          notes: `Simulated ${inputTokensM}M In / ${outputTokensM}M Out with ${cacheHitPercent}% cache hit. Modeled savings: $${calculations.annualSavings.toFixed(2)}/yr`,
                        }),
                      });
                      if (res.ok) {
                        setLeadSubmitted(true);
                      }
                    } catch {
                      // fallback
                    } finally {
                      setIsSubmittingLead(false);
                    }
                  }}
                  className="space-y-2"
                >
                  <input
                    type="email"
                    required
                    value={inboundEmail}
                    onChange={(e) => setInboundEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white placeholder:text-zinc-500 text-xs font-mono focus:border-emerald-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={inboundCompany}
                    onChange={(e) => setInboundCompany(e.target.value)}
                    placeholder="Company or Project Name (optional)"
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white placeholder:text-zinc-500 text-xs font-mono focus:border-emerald-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingLead}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingLead ? 'Submitting...' : 'Send Audit & Claim $100 Key →'}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>

        {/* AEO Frequently Asked Questions */}
        <section id="calculator-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions (Token Economics &amp; Caching)</span>
            </h2>
            <p className="text-xs text-zinc-400">Clear facts about wholesale volume tiers and prompt caching pass-through.</p>
          </div>

          <div className="space-y-3 pt-2">
            {calculatorFaqs.map((faq, idx) => {
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
