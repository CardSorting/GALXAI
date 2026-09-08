'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  FileText,
  Code2,
  Image as ImageIcon,
  Sparkles,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Zap,
  Flame,
  Coins,
  Check,
  CheckCircle2,
  Building2,
  Users,
  Copy
} from 'lucide-react';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface WorkloadPreset {
  id: string;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  volumeUnit: string;
  defaultVolume: number;
  minVolume: number;
  maxVolume: number;
  step: number;
  modelName: string;
  upstreamCostPerUnit: number;
  galxCostPerUnit: number;
}

const WORKLOAD_PRESETS: WorkloadPreset[] = [
  {
    id: 'support-bot',
    title: 'Customer Support AI Agent',
    category: 'Customer Experience',
    icon: Bot,
    description: 'Autonomous multi-turn chat handling customer inquiries and resolving tickets 24/7.',
    volumeUnit: 'Conversations / mo',
    defaultVolume: 5000,
    minVolume: 500,
    maxVolume: 50000,
    step: 500,
    modelName: 'GPT-5.6 Sol (Turbo 128k)',
    upstreamCostPerUnit: 0.045, // $0.045 per support chat on retail
    galxCostPerUnit: 0.027     // $0.027 on wholesale
  },
  {
    id: 'content-engine',
    title: 'Content & SEO Generator',
    category: 'Marketing & Editorial',
    icon: FileText,
    description: 'Deep-research blog posts, email sequences, and localized marketing copy.',
    volumeUnit: 'Long-Form Articles / mo',
    defaultVolume: 300,
    minVolume: 20,
    maxVolume: 3000,
    step: 20,
    modelName: 'GPT-5.6 Terra (Reasoning Engine)',
    upstreamCostPerUnit: 0.85, // $0.85 per article retail
    galxCostPerUnit: 0.51      // $0.51 on wholesale
  },
  {
    id: 'code-copilot',
    title: 'Dev Team AI Copilots',
    category: 'Engineering & Product',
    icon: Code2,
    description: 'Cursor, Windsurf, or VS Code AI coding assistance across your full engineering team.',
    volumeUnit: 'Active Developers',
    defaultVolume: 5,
    minVolume: 1,
    maxVolume: 50,
    step: 1,
    modelName: 'GPT-5.6 Sol & Luna Codex',
    upstreamCostPerUnit: 40.0, // $40/dev/mo on retail tokens
    galxCostPerUnit: 24.0      // $24/dev/mo on wholesale
  },
  {
    id: 'image-studio',
    title: 'Visual Assets & Product Renders',
    category: 'Design & Creative',
    icon: ImageIcon,
    description: 'High-resolution 4K product photos, marketing banners, and visual assets.',
    volumeUnit: '4K Images / mo',
    defaultVolume: 1000,
    minVolume: 100,
    maxVolume: 10000,
    step: 100,
    modelName: 'Codex Image Generation',
    upstreamCostPerUnit: 0.040,
    galxCostPerUnit: 0.020
  }
];

function BaseWorkloadEstimator() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('support-bot');
  const [volume, setVolume] = useState<number>(5000);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const currentPreset = WORKLOAD_PRESETS.find(p => p.id === selectedPresetId) || WORKLOAD_PRESETS[0];

  // Handle Preset Change
  const handleSelectPreset = (preset: WorkloadPreset) => {
    setSelectedPresetId(preset.id);
    setVolume(preset.defaultVolume);
  };

  // Calculations
  const retailCost = volume * currentPreset.upstreamCostPerUnit;
  const galxDirectCost = volume * currentPreset.galxCostPerUnit;
  const monthlySavings = retailCost - galxDirectCost;
  const annualSavings = monthlySavings * 12;
  const savingsPct = Math.round((monthlySavings / retailCost) * 100);
  const bonusGrantValue = Math.min(2500, Math.round(galxDirectCost * 0.5));

  const handleCopyReport = async () => {
    const reportText = `GALXAI Executive Spend Assessment:\nWorkload: ${currentPreset.title} (${volume.toLocaleString()} ${currentPreset.volumeUnit})\nStandard Retail Cost: $${retailCost.toFixed(2)}/mo\nGALXAI Direct Wholesale: $${galxDirectCost.toFixed(2)}/mo\nMonthly Net Savings: $${monthlySavings.toFixed(2)}/mo (${savingsPct}% saved)\nAnnualized Savings: $${annualSavings.toFixed(2)}/yr\n50% Compute Match Bonus: +$${bonusGrantValue.toFixed(2)} free compute`;
    const success = await safeCopyToClipboard(reportText);
    if (success) {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    }
  };

  return (
    <section className="glass-panel rounded-3xl p-6 sm:p-10 space-y-8 border border-white/10 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NON-TECHNICAL WORKLOAD TRANSLATOR</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            See Your Real-World Business Savings (No Token Math Needed)
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300">
            Pick your workload type below and drag the slider to see your exact monthly savings and dollar reductions.
          </p>
        </div>

        {/* 1-Click Copy Proposal */}
        <button
          onClick={handleCopyReport}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 self-start md:self-auto"
        >
          {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
          <span>{copiedSummary ? 'Report Copied to Clipboard!' : 'Copy Executive Report'}</span>
        </button>
      </div>

      {/* Preset Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {WORKLOAD_PRESETS.map((preset) => {
          const isSelected = preset.id === selectedPresetId;
          const Icon = preset.icon;

          return (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative space-y-2.5 ${
                isSelected
                  ? 'bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border-amber-400/80 shadow-lg shadow-amber-500/15 scale-[1.02]'
                  : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    isSelected ? 'bg-amber-400 text-amber-950 font-bold shadow-md' : 'bg-white/10 text-white/80'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  Save {Math.round(((preset.upstreamCostPerUnit - preset.galxCostPerUnit) / preset.upstreamCostPerUnit) * 100)}%
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white leading-snug">{preset.title}</h3>
                <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-normal">{preset.description}</p>
              </div>

              <div className="pt-1 text-[10px] font-mono text-zinc-500 flex items-center justify-between border-t border-white/5">
                <span>Model:</span>
                <strong className="text-zinc-300 font-sans">{preset.modelName}</strong>
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Volume Slider & Value Box */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 bg-black/60 border border-white/10 space-y-6">
        {/* Slider Controls */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-mono">
            <span className="text-xs text-zinc-300 font-bold uppercase flex items-center gap-2">
              <span>Estimated Monthly Volume:</span>
              <strong className="text-amber-300 text-base">{volume.toLocaleString()} {currentPreset.volumeUnit}</strong>
            </span>
            <span className="text-[11px] text-zinc-500">
              Drag slider to adjust volume
            </span>
          </div>

          <input
            type="range"
            min={currentPreset.minVolume}
            max={currentPreset.maxVolume}
            step={currentPreset.step}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-2.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />

          <div className="flex justify-between text-[10px] font-mono text-zinc-500">
            <span>{currentPreset.minVolume.toLocaleString()} {currentPreset.volumeUnit}</span>
            <span>{currentPreset.maxVolume.toLocaleString()} {currentPreset.volumeUnit}</span>
          </div>
        </div>

        {/* 3-Column Cost Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-center">
          {/* Retail List */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <span className="text-[11px] text-zinc-400 font-sans uppercase font-semibold">1. Standard Retail Cost</span>
            <div className="text-2xl sm:text-3xl font-black text-rose-400">${retailCost.toFixed(2)}</div>
            <p className="text-[10px] text-zinc-500 font-sans">Full upstream pricing without wholesale discount</p>
          </div>

          {/* GALXAI Wholesale Direct */}
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-1 relative overflow-hidden">
            <span className="text-[11px] text-amber-300 font-sans uppercase font-bold flex items-center justify-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              2. GALXAI Direct Cost
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-300">${galxDirectCost.toFixed(2)}</div>
            <p className="text-[10px] text-amber-300/80 font-sans font-semibold">Includes 75% prompt caching rebate</p>
          </div>

          {/* Net Money Kept in Bank */}
          <div className="p-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/50 space-y-1 relative overflow-hidden shadow-lg shadow-emerald-500/10">
            <span className="text-[11px] text-emerald-400 font-sans uppercase font-black flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-emerald-400" />
              3. Monthly Money Saved
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-300">+${monthlySavings.toFixed(2)}/mo</div>
            <p className="text-[10px] text-emerald-400/90 font-sans font-bold">
              ${annualSavings.toFixed(2)} / year kept in your bank account
            </p>
          </div>
        </div>

        {/* 50% Compute Match Bonus Multiplier Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-indigo-600/15 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black text-sm shrink-0">
              +50%
            </div>
            <div>
              <span className="text-white font-bold block text-sm">Founding Builder Compute Match Bonus</span>
              <span className="text-zinc-300 text-xs">
                Your first deposit qualifies for an extra <strong className="text-amber-300">+${bonusGrantValue.toFixed(2)} USD</strong> in matched compute credits.
              </span>
            </div>
          </div>

          <Link
            href="/keys"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/25 shrink-0 cursor-pointer"
          >
            <span>Lock In These Rates (Claim Key)</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export const WorkloadEstimator = withErrorBoundary(BaseWorkloadEstimator, {
  name: 'Workload Cost Estimator'
});
