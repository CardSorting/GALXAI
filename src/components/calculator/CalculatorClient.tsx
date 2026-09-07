'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Coins,
  Zap,
  Copy,
  Check,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Rocket,
  Building2,
  Landmark,
  Clock,
  Layers,
  Settings2,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/ModelCatalog';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface PresetArchetype {
  id: string;
  name: string;
  badge: string;
  iconType: 'rocket' | 'building' | 'landmark' | 'zap';
  modelId: string;
  inputTokensM: number;
  outputTokensM: number;
  cacheHitPercent: number;
  teamEngineers: number;
  description: string;
}

const PRESET_ARCHETYPES: PresetArchetype[] = [
  {
    id: 'startup',
    name: 'AI Startup / Scaleup',
    badge: 'High-Velocity MVP',
    iconType: 'rocket',
    modelId: 'gpt-5.6-terra',
    inputTokensM: 40,
    outputTokensM: 15,
    cacheHitPercent: 65,
    teamEngineers: 2,
    description: 'Compresses time-to-first-dollar by 3+ weeks. Zero bespoke backend proxy wiring.',
  },
  {
    id: 'agency',
    name: 'Dev Studio / Agency',
    badge: 'Multi-Client Apps',
    iconType: 'building',
    modelId: 'gpt-5.6-sol',
    inputTokensM: 20,
    outputTokensM: 8,
    cacheHitPercent: 55,
    teamEngineers: 4,
    description: 'Zero client API key leakage. OpenAI-compatible routing with clean billing.',
  },
  {
    id: 'enterprise',
    name: 'Mid-Market SaaS Team',
    badge: 'Production Scale',
    iconType: 'landmark',
    modelId: 'gpt-5.6-sol',
    inputTokensM: 120,
    outputTokensM: 40,
    cacheHitPercent: 80,
    teamEngineers: 6,
    description: 'Replaces $100k+ OpenAI invoices with net spend reduction and automated governance.',
  },
  {
    id: 'microservice',
    name: 'Agentic Microservices',
    badge: 'Autonomous Loops',
    iconType: 'zap',
    modelId: 'gpt-5.6-luna',
    inputTokensM: 80,
    outputTokensM: 25,
    cacheHitPercent: 85,
    teamEngineers: 1,
    description: 'Sub-12ms TTFT with maximum caching throughput for autonomous agent loops.',
  },
];

export function CalculatorClient() {
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-5.6-sol');
  const [inputTokensM, setInputTokensM] = useState<number>(25); // 25M input/mo
  const [outputTokensM, setOutputTokensM] = useState<number>(10); // 10M output/mo
  const [cacheHitPercent, setCacheHitPercent] = useState<number>(60); // 60% cache hit
  const [includeEngineeringTuition, setIncludeEngineeringTuition] = useState<boolean>(true);
  const [teamEngineers, setTeamEngineers] = useState<number>(2);
  const [engHourlyRate, setEngHourlyRate] = useState<number>(125); // $125/hr
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [preventMisallocation, setPreventMisallocation] = useState<boolean>(false);
  const [timePeriod, setTimePeriod] = useState<'annual' | 'monthly'>('annual');
  const [activeArchetypeId, setActiveArchetypeId] = useState<string | null>(null);
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

  const applyArchetype = (preset: PresetArchetype) => {
    setActiveArchetypeId(preset.id);
    setSelectedModelId(preset.modelId);
    setInputTokensM(preset.inputTokensM);
    setOutputTokensM(preset.outputTokensM);
    setCacheHitPercent(preset.cacheHitPercent);
    setTeamEngineers(preset.teamEngineers);
    setIncludeEngineeringTuition(true);
  };

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
    
    // Intelligent Tier Cascading (Auto-route 25% of simple tasks away from Sol to Terra/Luna)
    const cascadingRebateMonthly = preventMisallocation && selectedModel.id === 'gpt-5.6-sol'
      ? (inputTokensM * 0.25 * (3.75 - 2.25) + outputTokensM * 0.25 * (15.0 - 9.0))
      : 0;

    const galxaiFinalTotal = Math.max(0, galxaiCachedInputCost + galxaiOutputCost - cascadingRebateMonthly);

    const monthlySavings = Math.max(0, retailTotal - galxaiFinalTotal);
    const annualSavings = monthlySavings * 12;
    const savingsPercent = retailTotal > 0 ? (monthlySavings / retailTotal) * 100 : 0;

    // Engineering Tuition & Time-to-First-Dollar Savings
    // Estimated 15 hours/month per engineer saved from wiring custom proxies, handling 429 retries, and loading state bugs
    const monthlyEngHoursSaved = teamEngineers * 15;
    const monthlyEngCostSaved = includeEngineeringTuition ? monthlyEngHoursSaved * engHourlyRate : 0;
    const annualEngCostSaved = monthlyEngCostSaved * 12;
    const totalAnnualEconomicValue = annualSavings + annualEngCostSaved;
    const totalMonthlyEconomicValue = monthlySavings + monthlyEngCostSaved;

    // Velocity Impact (Weeks to production saved)
    const weeksSaved = (teamEngineers * 1.5).toFixed(1);

    return {
      retailTotal,
      galxaiFinalTotal,
      monthlySavings,
      annualSavings,
      savingsPercent,
      cachedTokensM,
      monthlyEngHoursSaved,
      monthlyEngCostSaved,
      annualEngCostSaved,
      totalAnnualEconomicValue,
      totalMonthlyEconomicValue,
      cascadingRebateMonthly,
      weeksSaved,
    };
  }, [selectedModel, inputTokensM, outputTokensM, cacheHitPercent, includeEngineeringTuition, teamEngineers, engHourlyRate, preventMisallocation]);

  const handleCopyAudit = async () => {
    const text = `=====================================================
GALXAI UNIVERSAL AI VELOCITY & TCO AUDIT REPORT
Target Model: ${selectedModel.name} (${selectedModel.id})
=====================================================
Workload Profile:
- Monthly Input Tokens: ${inputTokensM}M Tokens
- Monthly Output Tokens: ${outputTokensM}M Tokens
- Prefix Cache Hit Rate: ${cacheHitPercent}% (${calculations.cachedTokensM.toFixed(1)}M Cached)
- Engineering Team Size: ${teamEngineers} Devs

Financial Breakdown:
- Direct OpenAI Retail Bill: $${calculations.retailTotal.toFixed(2)}/mo
- GALXAI Wholesale Bill:     $${calculations.galxaiFinalTotal.toFixed(2)}/mo
- Direct Token Savings:       $${calculations.monthlySavings.toFixed(2)}/mo (-${calculations.savingsPercent.toFixed(1)}%)
${includeEngineeringTuition ? `- Avoided Dev Tuition:        $${calculations.monthlyEngCostSaved.toLocaleString()}/mo (${calculations.monthlyEngHoursSaved} hrs/mo)\n` : ''}${calculations.cascadingRebateMonthly > 0 ? `- Tier Cascading Savings:    $${calculations.cascadingRebateMonthly.toFixed(2)}/mo\n` : ''}
Velocity & ROI Summary:
- Time-to-First-Dollar:       ~${calculations.weeksSaved} Weeks Faster Launch
- Net Annual Value Created:   $${calculations.totalAnnualEconomicValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr

Simulate live: https://galx.ai/calculator
=====================================================`;

    const ok = await safeCopyToClipboard(text);
    if (ok) {
      setCopiedAudit(true);
      setTimeout(() => setCopiedAudit(false), 2000);
    }
  };

  const calculatorFaqs = [
    {
      q: 'How does GALXAI compress Time-to-First-Dollar for AI applications?',
      a: 'Building production AI traditionally requires 3–6 weeks of engineering time spent writing routing infrastructure, managing API key security, and handling 429 rate-limit retries. GALXAI eliminates this with an OpenAI-compatible gateway, native SDKs, zero-route Server Actions, and automatic 1-line OpenAI SDK patching (import "galxai/patch").',
    },
    {
      q: 'What is "Avoided Engineering Tuition"?',
      a: 'Engineering teams typically waste 15+ hours per month per developer debugging inference edge cases, maintaining custom proxy servers, and fixing streaming socket failures. GALXAI provides pre-built, hardened infrastructure so your team avoids paying that operational and engineering tuition.',
    },
    {
      q: 'How does Intelligent Tier Cascading prevent frontier model overspend?',
      a: 'Many teams accidentally use flagship reasoning models (like gpt-5.6-sol) for simple classification, routing, or formatting tasks. Intelligent Tier Cascading automatically identifies simple workloads and routes them to high-velocity tiers (like gpt-5.6-terra or gpt-5.6-luna), unlocking an additional 20%–40% cost reduction without quality degradation.',
    },
    {
      q: 'How is the 75% prompt caching savings calculated?',
      a: 'When prompt prefixes exceed 1,024 tokens and match cached RAM slices, GALXAI applies a 75% compound rebate on the input token price, passing 100% of the upstream savings directly to your wallet.',
    },
    {
      q: 'Do I need an enterprise contract to access wholesale rates?',
      a: 'No. GALXAI provides direct wholesale rates starting on your very first token with zero monthly seat licenses and zero minimum commitments.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'AI Velocity & TCO Calculator' }]} />

        {/* Hero Header */}
        <section id="calculator-hero" className="glass-panel rounded-2xl p-6 sm:p-10 space-y-6 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Universal AI Velocity &amp; Total Cost of Ownership Calculator
            </h1>
            <ShareButton
              variant="pill"
              label="Share Calculator"
              title="GALXAI Universal AI Velocity & TCO Cost Calculator"
              description="Calculate exact monthly and annual savings on OpenAI models with 75% prompt caching and avoided engineering tuition."
            />
          </div>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            Quantify the true economics of operating OpenAI models. Calculate 25%–40% wholesale token pricing, 75% compound prompt caching rebates, avoided developer infrastructure tuition, and accelerated time-to-first-dollar.
          </p>

          {/* Interactive Archetype Presets */}
          <div className="pt-5 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-300 uppercase flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>1-Click Workload Archetypes</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">Select a profile to auto-configure</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PRESET_ARCHETYPES.map((preset) => {
                const isActive = activeArchetypeId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyArchetype(preset)}
                    className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isActive
                        ? 'bg-indigo-600/20 border-indigo-400 text-white'
                        : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-black/60 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-cyan-300 border border-white/10">
                        {preset.iconType === 'rocket' && <Rocket className="w-4 h-4 text-emerald-400" />}
                        {preset.iconType === 'building' && <Building2 className="w-4 h-4 text-cyan-400" />}
                        {preset.iconType === 'landmark' && <Landmark className="w-4 h-4 text-amber-400" />}
                        {preset.iconType === 'zap' && <Zap className="w-4 h-4 text-purple-400" />}
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-cyan-300">
                        {preset.badge}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs font-mono">{preset.name}</div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">{preset.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4-Metric Velocity & Economic Summary Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>Time-to-First-Dollar</span>
              <Rocket className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-300 tabular-nums">
              ~{calculations.weeksSaved} Weeks
            </div>
            <p className="text-[10px] text-zinc-400">Accelerated launch velocity</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-cyan-500/30 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>Avoided Dev Tuition</span>
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-cyan-300 tabular-nums">
              +${calculations.monthlyEngCostSaved.toLocaleString()}
              <span className="text-xs text-zinc-400 font-normal">/mo</span>
            </div>
            <p className="text-[10px] text-zinc-400">{calculations.monthlyEngHoursSaved} hrs/mo proxy plumbing avoided</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-amber-500/30 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>Token Cost Slashed</span>
              <Coins className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 tabular-nums">
              -${calculations.monthlySavings.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              <span className="text-xs text-zinc-400 font-normal">/mo</span>
            </div>
            <p className="text-[10px] text-zinc-400">-{calculations.savingsPercent.toFixed(1)}% off OpenAI retail</p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>Total Annual Value</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
              ${calculations.totalAnnualEconomicValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              <span className="text-xs text-zinc-400 font-normal">/yr</span>
            </div>
            <p className="text-[10px] text-emerald-400 font-bold">Net Economic Value Created</p>
          </div>
        </section>

        {/* Interactive Dual Panel: Controls vs Live Financial Readout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel */}
          <section id="calculator-controls" className="lg:col-span-7 glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>Workload &amp; Architecture Parameters</span>
                </h2>
                <p className="text-xs text-zinc-400">Fine-tune OpenAI token volume, caching rates, and engineering capacity.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-mono flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{showAdvancedSettings ? 'Hide Rates' : 'Eng Rates'}</span>
              </button>
            </div>

            {showAdvancedSettings && (
              <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-300">Blended Senior Eng Rate ($/hour):</span>
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-500">$</span>
                    <input
                      type="number"
                      min={50}
                      max={350}
                      step={5}
                      value={engHourlyRate}
                      onChange={(e) => setEngHourlyRate(Math.max(1, Number(e.target.value)))}
                      className="w-20 px-2 py-1 rounded-md bg-black border border-white/20 text-emerald-400 font-bold text-right focus:outline-none focus:border-cyan-400"
                    />
                    <span className="text-zinc-500">/hr</span>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 font-sans">
                  Used to quantify the dollar value of avoided proxy boilerplate, client key management, and 429 retry plumbing.
                </p>
              </div>
            )}

            {/* Model Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-zinc-300 uppercase block">
                Target OpenAI Model Engine
              </label>
              <select
                value={selectedModelId}
                onChange={(e) => {
                  setSelectedModelId(e.target.value);
                  setActiveArchetypeId(null);
                }}
                className="w-full p-3.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {FRONTEND_VISIBLE_MODELS.filter((m) => m.category === 'llm').map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} (${model.inputPricePer1M.toFixed(2)}/1M Input • -{model.discountPercentage ?? 25}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Input Tokens Slider + Precision Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-bold text-zinc-300">Monthly Input Tokens:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    step={1}
                    value={inputTokensM}
                    onChange={(e) => {
                      setInputTokensM(Math.max(1, Number(e.target.value)));
                      setActiveArchetypeId(null);
                    }}
                    className="w-20 px-2 py-1 rounded-md bg-black border border-white/20 text-emerald-400 font-bold text-right focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-emerald-400 font-bold">M Tokens</span>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={200}
                step={1}
                value={inputTokensM}
                onChange={(e) => {
                  setInputTokensM(Number(e.target.value));
                  setActiveArchetypeId(null);
                }}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                <span>1M</span>
                <span>50M</span>
                <span>100M</span>
                <span>200M+</span>
              </div>
            </div>

            {/* Output Tokens Slider + Precision Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-bold text-zinc-300">Monthly Output Tokens:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={200}
                    step={1}
                    value={outputTokensM}
                    onChange={(e) => {
                      setOutputTokensM(Math.max(1, Number(e.target.value)));
                      setActiveArchetypeId(null);
                    }}
                    className="w-20 px-2 py-1 rounded-md bg-black border border-white/20 text-amber-400 font-bold text-right focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-amber-400 font-bold">M Tokens</span>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={outputTokensM}
                onChange={(e) => {
                  setOutputTokensM(Number(e.target.value));
                  setActiveArchetypeId(null);
                }}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                <span>1M</span>
                <span>25M</span>
                <span>50M</span>
                <span>100M+</span>
              </div>
            </div>

            {/* Prompt Caching Prefix Match Slider */}
            <div className="space-y-2 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Prompt Caching Match Rate:</span>
                </span>
                <span className="text-cyan-300 font-bold text-sm tabular-nums">{cacheHitPercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={cacheHitPercent}
                onChange={(e) => {
                  setCacheHitPercent(Number(e.target.value));
                  setActiveArchetypeId(null);
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-300 font-sans">
                {calculations.cachedTokensM.toFixed(1)}M input tokens qualify for the 75% compound caching discount.
              </p>
            </div>

            {/* Developer Velocity & Engineering Tuition Avoidance */}
            <div className="space-y-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeEngineeringTuition}
                    onChange={(e) => setIncludeEngineeringTuition(e.target.checked)}
                    className="rounded accent-emerald-400 cursor-pointer"
                  />
                  <span>Include Avoided Dev Tuition (Time-to-First-Dollar)</span>
                </label>
                {includeEngineeringTuition && (
                  <span className="text-emerald-400 font-mono font-bold text-xs tabular-nums">
                    +${calculations.monthlyEngCostSaved.toLocaleString()}/mo saved
                  </span>
                )}
              </div>

              {includeEngineeringTuition && (
                <div className="space-y-2 pt-2 border-t border-emerald-500/15">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-zinc-300">Engineers Building/Operating AI:</span>
                    <span className="text-emerald-400 font-bold">{teamEngineers} Devs</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={teamEngineers}
                    onChange={(e) => {
                      setTeamEngineers(Number(e.target.value));
                      setActiveArchetypeId(null);
                    }}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <p className="text-[11px] text-zinc-300 font-sans">
                    Saves ~15 hrs/mo per engineer by eliminating custom proxy plumbing, loading state bugs, and rate-limit retry logic.
                  </p>
                </div>
              )}
            </div>

            {/* Intelligent Tier Cascading Toggle */}
            <div className="space-y-2 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preventMisallocation}
                    onChange={(e) => setPreventMisallocation(e.target.checked)}
                    className="rounded accent-purple-400 cursor-pointer"
                  />
                  <span>Intelligent Tier Cascading (Auto-Route Simple Workloads)</span>
                </label>
                {preventMisallocation && calculations.cascadingRebateMonthly > 0 && (
                  <span className="text-purple-300 font-mono font-bold text-xs tabular-nums">
                    +${calculations.cascadingRebateMonthly.toFixed(2)}/mo saved
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-300 font-sans">
                Automatically diverts non-reasoning prompts away from flagship Sol to balanced Terra/Luna tiers, eliminating runaway frontier model overspend.
              </p>
            </div>
          </section>

          {/* Financial Readout Panel */}
          <section id="calculator-results" className="lg:col-span-5 glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-base font-bold text-white font-mono">Net Financial &amp; TCO Delta</h2>
                
                {/* Period Toggle */}
                <div className="flex rounded-lg bg-black/60 p-0.5 border border-white/10 text-xs font-mono">
                  <button
                    onClick={() => setTimePeriod('annual')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      timePeriod === 'annual' ? 'bg-emerald-500 text-black font-bold' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    Annual
                  </button>
                  <button
                    onClick={() => setTimePeriod('monthly')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      timePeriod === 'monthly' ? 'bg-emerald-500 text-black font-bold' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 flex justify-between items-center">
                  <span className="text-zinc-300">Direct OpenAI Retail Bill:</span>
                  <span className="text-zinc-400 line-through font-bold text-sm tabular-nums">
                    ${(timePeriod === 'annual' ? calculations.retailTotal * 12 : calculations.retailTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-black/80 border border-emerald-500/40 flex justify-between items-center">
                  <div>
                    <span className="text-white font-bold block text-sm">GALXAI Wholesale Bill:</span>
                    <span className="text-[10px] text-emerald-400 font-bold">Includes 75% Caching Pass</span>
                  </div>
                  <span className="text-emerald-300 font-black text-2xl tabular-nums">
                    ${(timePeriod === 'annual' ? calculations.galxaiFinalTotal * 12 : calculations.galxaiFinalTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {includeEngineeringTuition && calculations.monthlyEngCostSaved > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-emerald-300 font-bold block">Engineering Hours Saved:</span>
                      <span className="text-[10px] text-zinc-400">{calculations.monthlyEngHoursSaved} hrs/mo avoided dev tuition</span>
                    </div>
                    <span className="text-emerald-400 font-bold font-mono tabular-nums">
                      +${(timePeriod === 'annual' ? calculations.annualEngCostSaved : calculations.monthlyEngCostSaved).toLocaleString()}
                    </span>
                  </div>
                )}

                {preventMisallocation && calculations.cascadingRebateMonthly > 0 && (
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-purple-300 font-bold block">Tier Cascading Rebate:</span>
                      <span className="text-[10px] text-zinc-400">Automated model overspend protection</span>
                    </div>
                    <span className="text-purple-300 font-bold font-mono tabular-nums">
                      +${(timePeriod === 'annual' ? calculations.cascadingRebateMonthly * 12 : calculations.cascadingRebateMonthly).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {/* Net ROI Summary Box */}
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-300 uppercase">
                    Total Economic Value Created:
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold">
                    -{calculations.savingsPercent.toFixed(1)}% TOKEN REBATE
                  </span>
                </div>
                <div className="text-3xl font-black text-white font-mono tabular-nums">
                  ${(timePeriod === 'annual' ? calculations.totalAnnualEconomicValue : calculations.totalMonthlyEconomicValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-zinc-400 font-sans"> / {timePeriod === 'annual' ? 'year' : 'month'}</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-sans">
                  ${(timePeriod === 'annual' ? calculations.annualSavings : calculations.monthlySavings).toLocaleString('en-US', { maximumFractionDigits: 0 })} token savings {includeEngineeringTuition && `+ $${(timePeriod === 'annual' ? calculations.annualEngCostSaved : calculations.monthlyEngCostSaved).toLocaleString()} avoided engineering tuition`}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <button
                onClick={handleCopyAudit}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all border border-white/10 cursor-pointer"
              >
                {copiedAudit ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedAudit ? 'Board-Ready Report Copied!' : 'Copy Executive TCO Audit Report'}</span>
              </button>

              <Link
                href="/keys"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>Start Saving with $5 Free Credits →</span>
              </Link>
            </div>

            {/* Inbound Lead Capture Box: Claim $100 Grant & Full Custom Audit */}
            <div className="mt-4 p-4 rounded-xl bg-black/60 border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 font-mono text-xs font-bold">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Request Custom Executive PDF Audit &amp; $100 Key</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                Get a customized TCO report formatted for your CFO or Lead Architect, pre-loaded with a $100 enterprise test key.
              </p>

              {leadSubmitted ? (
                <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Audit queued! Your custom report &amp; $100 trial key are on the way.</span>
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
                          notes: `Simulated ${inputTokensM}M In / ${outputTokensM}M Out with ${cacheHitPercent}% cache hit. Modeled savings: $${calculations.annualSavings.toFixed(2)}/yr. Total TCO Value: $${calculations.totalAnnualEconomicValue.toFixed(2)}/yr`,
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
                  className="space-y-2 font-mono"
                >
                  <input
                    type="email"
                    required
                    value={inboundEmail}
                    onChange={(e) => setInboundEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white placeholder:text-zinc-500 text-xs focus:border-emerald-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={inboundCompany}
                    onChange={(e) => setInboundCompany(e.target.value)}
                    placeholder="Company or Project Name (optional)"
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white placeholder:text-zinc-500 text-xs focus:border-emerald-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingLead}
                    className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingLead ? 'Generating Custom Audit...' : 'Send Audit & Claim $100 Key →'}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>

        {/* Frequently Asked Questions */}
        <section id="calculator-faqs" className="glass-panel rounded-2xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions (Velocity, TCO &amp; Economics)</span>
            </h2>
            <p className="text-xs text-zinc-400">Clear facts about Time-to-First-Dollar, avoided dev tuition, and wholesale OpenAI pricing.</p>
          </div>

          <div className="space-y-3 pt-2">
            {calculatorFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="rounded-xl bg-black/40 border border-white/10 overflow-hidden">
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
