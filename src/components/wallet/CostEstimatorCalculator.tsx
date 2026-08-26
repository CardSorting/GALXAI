'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  TrendingDown,
  Zap,
  Laptop,
  MessageSquare,
  Bot,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Calendar,
  Wallet,
  Globe,
  Leaf,
  Layers,
  Lightbulb,
  Check
} from 'lucide-react';
import { FRONTEND_VISIBLE_MODELS, ModelCatalog } from '@/core/router/ModelCatalog';
import {
  TokenCostCalculator,
  SupportedCurrency,
  CURRENCY_FX_RATES,
  ServiceTier
} from '@/core/pricing/TokenCostCalculator';

interface WorkloadPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  modelId: string;
  dailyRequests: number;
  avgPromptTokens: number;
  avgCompletionTokens: number;
  cachedPct: number;
  serviceTier?: ServiceTier;
}

const PRESETS: WorkloadPreset[] = [
  {
    id: 'cursor',
    name: 'Cursor IDE / Coding Agent',
    description: 'Daily multi-file coding completions and inline refactoring for a 3-engineer team.',
    icon: Laptop,
    modelId: 'gpt-5.6-sol',
    dailyRequests: 600,
    avgPromptTokens: 2500,
    avgCompletionTokens: 450,
    cachedPct: 50
  },
  {
    id: 'chatbot',
    name: 'Customer Support AI Agent',
    description: 'High-volume conversational AI resolving tier-1 user inquiries 24/7.',
    icon: MessageSquare,
    modelId: 'gpt-5.6-terra',
    dailyRequests: 2500,
    avgPromptTokens: 1200,
    avgCompletionTokens: 280,
    cachedPct: 60
  },
  {
    id: 'agent_swarm',
    name: 'Autonomous Agent Fleet',
    description: 'Multi-agent LangChain / AutoGPT fleet running autonomous research and tool loops.',
    icon: Bot,
    modelId: 'gpt-5.6-sol',
    dailyRequests: 1200,
    avgPromptTokens: 4500,
    avgCompletionTokens: 850,
    cachedPct: 40
  },
  {
    id: 'batch_docs',
    name: 'Batch Document Processing (50% Off)',
    description: 'Asynchronous offline PDF and financial report parsing with massive context.',
    icon: FileText,
    modelId: 'gpt-5.6-luna',
    dailyRequests: 4000,
    avgPromptTokens: 8000,
    avgCompletionTokens: 600,
    cachedPct: 70,
    serviceTier: 'batch'
  }
];

interface CostEstimatorCalculatorProps {
  currentBalance?: number;
  onSelectTopUp?: (amount: number) => void;
}

export function CostEstimatorCalculator({
  currentBalance = 114.59,
  onSelectTopUp
}: CostEstimatorCalculatorProps) {
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-5.6-sol');
  const [dailyRequests, setDailyRequests] = useState<number>(600);
  const [promptTokens, setPromptTokens] = useState<number>(2500);
  const [completionTokens, setCompletionTokens] = useState<number>(450);
  const [cachedPercentage, setCachedPercentage] = useState<number>(50);
  const [serviceTier, setServiceTier] = useState<ServiceTier>('standard');
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('USD');

  const applyPreset = (preset: WorkloadPreset) => {
    setSelectedModelId(preset.modelId);
    setDailyRequests(preset.dailyRequests);
    setPromptTokens(preset.avgPromptTokens);
    setCompletionTokens(preset.avgCompletionTokens);
    setCachedPercentage(preset.cachedPct);
    if (preset.serviceTier) {
      setServiceTier(preset.serviceTier);
    } else {
      setServiceTier('standard');
    }
  };

  const cachedTokens = Math.round((promptTokens * cachedPercentage) / 100);

  // Exact Calculation via TokenCostCalculator
  const singleQueryCost = TokenCostCalculator.calculateCost(selectedModelId, {
    promptTokens,
    completionTokens,
    cachedTokens,
    serviceTier
  });

  const dailyCostUsd = singleQueryCost.netCostUsd * dailyRequests;
  const monthlyCostUsd = dailyCostUsd * 30;
  const monthlySavingsUsd = singleQueryCost.totalSavingsUsd * dailyRequests * 30;
  const monthlyTokens = (promptTokens + completionTokens) * dailyRequests * 30;

  // Currency converted values
  const monthlyCostDisplay = TokenCostCalculator.convertCurrency(monthlyCostUsd, selectedCurrency);
  const monthlySavingsDisplay = TokenCostCalculator.convertCurrency(monthlySavingsUsd, selectedCurrency);
  const dailyCostDisplay = TokenCostCalculator.convertCurrency(dailyCostUsd, selectedCurrency);

  // Runway Projection
  const estimatedDaysRemaining = dailyCostUsd > 0
    ? Math.floor(currentBalance / dailyCostUsd)
    : 999;
  const queriesRemaining = singleQueryCost.netCostUsd > 0
    ? Math.floor(currentBalance / singleQueryCost.netCostUsd)
    : 999999;

  // Actionable Optimization Recommendations
  const recommendations = TokenCostCalculator.recommendOptimizations(singleQueryCost, dailyRequests * 30);

  const selectedModel = FRONTEND_VISIBLE_MODELS.find(m => m.id === selectedModelId) || FRONTEND_VISIBLE_MODELS[0];

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-8 border border-white/10 bg-black/40">
      {/* Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Sliders className="w-3.5 h-3.5" />
            <span>INTERACTIVE WORKLOAD RUNWAY &amp; COST SANDBOX</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-sans">
            AI Cost &amp; Compute Estimator
          </h2>
          <p className="text-xs text-zinc-400 font-sans">
            Simulate your production workloads down to the token. Test prompt caching hit rates, model tiers, and Batch API savings.
          </p>
        </div>

        {/* Currency & Service Tier Selectors */}
        <div className="flex items-center gap-3">
          {/* Service Tier Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-black/60 border border-white/10 text-xs font-mono">
            <button
              onClick={() => setServiceTier('standard')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                serviceTier === 'standard'
                  ? 'bg-cyan-400 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Interactive API
            </button>
            <button
              onClick={() => setServiceTier('batch')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                serviceTier === 'batch'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Batch (50% Off)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 uppercase">SAVE</span>
            </button>
          </div>

          {/* International Currency Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/60 border border-white/10 text-xs font-mono">
            <Globe className="w-3.5 h-3.5 text-zinc-400 ml-1.5" />
            {(['USD', 'EUR', 'GBP', 'JPY'] as SupportedCurrency[]).map((curr) => (
              <button
                key={curr}
                onClick={() => setSelectedCurrency(curr)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                  selectedCurrency === curr
                    ? 'bg-white/20 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preset Cards */}
      <div className="space-y-2 font-mono">
        <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-bold">
          Quick Start Workload Presets:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedModelId === preset.modelId && dailyRequests === preset.dailyRequests;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`p-4 rounded-2xl text-left border transition-all cursor-pointer space-y-2 ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-400/80 text-white ring-1 ring-cyan-400/50 shadow-lg shadow-cyan-500/10'
                    : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-cyan-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {preset.dailyRequests.toLocaleString()} req/day
                  </span>
                </div>
                <div className="font-bold text-white font-sans text-xs">{preset.name}</div>
                <p className="text-[11px] text-zinc-400 line-clamp-2 font-sans">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Controls & Results Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-mono">
        {/* Left Column: Sliders & Model Selector */}
        <div className="lg:col-span-7 space-y-6">
          {/* Model Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Target AI Model
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {FRONTEND_VISIBLE_MODELS.filter(m => m.category === 'llm').slice(0, 6).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModelId(m.id)}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer space-y-1 ${
                    selectedModelId === m.id
                      ? 'bg-amber-400/15 border-amber-400 text-white ring-1 ring-amber-400/50 shadow-md'
                      : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-sans">{m.name.split(' (')[0]}</span>
                    <span className="text-[10px] text-emerald-400 font-bold">-{m.discountPercentage}%</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    ${m.inputPricePer1M.toFixed(2)} in / ${m.outputPricePer1M.toFixed(2)} out
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Daily Request Volume Slider */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-sans font-bold">Daily Request Volume</span>
              <span className="text-cyan-400 font-bold text-sm">{dailyRequests.toLocaleString()} queries / day</span>
            </div>
            <input
              type="range"
              min="10"
              max="50000"
              step="50"
              value={dailyRequests}
              onChange={(e) => setDailyRequests(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>10 (Prototype)</span>
              <span>5,000 (Growth)</span>
              <span>50,000 (Scale)</span>
            </div>
          </div>

          {/* Prompt Tokens Slider */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-sans font-bold">Average Prompt Tokens (Input Context)</span>
              <span className="text-white font-bold">{promptTokens.toLocaleString()} tokens</span>
            </div>
            <input
              type="range"
              min="100"
              max="64000"
              step="100"
              value={promptTokens}
              onChange={(e) => setPromptTokens(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>100 tokens</span>
              <span>16,000 (Doc)</span>
              <span>64,000 (Codebase)</span>
            </div>
          </div>

          {/* Completion Tokens Slider */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-sans font-bold">Average Response Tokens (Output / Thinking)</span>
              <span className="text-white font-bold">{completionTokens.toLocaleString()} tokens</span>
            </div>
            <input
              type="range"
              min="50"
              max="16000"
              step="50"
              value={completionTokens}
              onChange={(e) => setCompletionTokens(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* Prompt Caching Hit Rate Slider */}
          <div className="p-4 rounded-2xl bg-black/60 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-300 font-sans font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Prompt Caching Hit Rate (75% Rebate)
              </span>
              <span className="text-emerald-400 font-bold text-sm">{cachedPercentage}% ({cachedTokens.toLocaleString()} tokens)</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={cachedPercentage}
              onChange={(e) => setCachedPercentage(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="text-[11px] text-zinc-400 font-sans">
              System prompts and repeated instructions receive an automatic 75%-80% prompt caching discount pass-through.
            </div>
          </div>
        </div>

        {/* Right Column: Live Projected Cost & Runway Dashboard */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-6 border border-emerald-500/30 bg-black/60 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 uppercase tracking-wider font-bold">
                  Projected Monthly Spend
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                  {singleQueryCost.savingsPercentage}% Arbitrage Discount
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight flex items-baseline gap-2">
                  <span>{monthlyCostDisplay.formatted}</span>
                  <span className="text-xs text-zinc-400 font-sans">/ month</span>
                </div>
                <div className="text-xs text-emerald-400 font-sans flex items-center gap-1.5 font-bold pt-1">
                  <TrendingDown className="w-4 h-4" />
                  <span>You save {monthlySavingsDisplay.formatted} / mo vs direct retail list price</span>
                </div>
              </div>

              {/* Runway Gauge from Current Balance */}
              <div className="p-4 rounded-2xl bg-black/70 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Runway with Current Balance (${currentBalance.toFixed(2)} USD):</span>
                  <strong className="text-white font-bold">~{estimatedDaysRemaining} Days</strong>
                </div>
                <div className="text-[11px] text-zinc-400 font-sans">
                  Capacity: <strong className="text-cyan-300">{queriesRemaining.toLocaleString()} queries</strong> remaining before wallet refill.
                </div>
              </div>

              {/* Cost per unit strip */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <div className="text-[10px] text-zinc-500 uppercase">Cost Per Query</div>
                  <div className="text-white font-bold font-mono">
                    ${singleQueryCost.netCostUsd.toFixed(6)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <div className="text-[10px] text-zinc-500 uppercase">Per 1,000 Queries</div>
                  <div className="text-cyan-300 font-bold font-mono">
                    ${(singleQueryCost.netCostUsd * 1000).toFixed(3)}
                  </div>
                </div>
              </div>

              {/* Plain English Summary */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-[11px] text-zinc-300 font-sans leading-relaxed">
                {singleQueryCost.executiveSummary}
              </div>

              {/* Carbon & Energy Footprint Badge */}
              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <Leaf className="w-3 h-3 text-emerald-400" />
                  <span>Energy Footprint: ~{((singleQueryCost.estimatedEnergyWattHours * dailyRequests * 30) / 1000).toFixed(2)} kWh/mo</span>
                </div>
                <span>~{((singleQueryCost.estimatedCarbonGramsCO2e * dailyRequests * 30) / 1000).toFixed(2)} kg CO2e</span>
              </div>
            </div>

            {/* Action Top Up Button */}
            {onSelectTopUp && (
              <button
                onClick={() => onSelectTopUp(100)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black font-sans text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>Top Up Wallet with 50% Match Grant</span>
              </button>
            )}
          </div>

          {/* Actionable Workload Optimization Advisor */}
          {recommendations.length > 0 && (
            <div className="rounded-3xl p-5 border border-amber-500/30 bg-amber-500/5 space-y-3 font-sans">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 font-mono">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                <span>WORKLOAD OPTIMIZATION ADVISOR</span>
              </div>
              <div className="space-y-2 text-xs">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-black/60 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{rec.title}</span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">
                        Save ~${rec.estimatedMonthlySavingsUsd}/mo
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
