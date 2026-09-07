'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Zap,
  Rocket,
  Cpu,
  ArrowRight,
  Key,
  Terminal,
  Play,
  Activity,
  Coins,
  GitCompare,
  Copy,
  Check,
  Server,
  ShieldCheck,
  Code2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import type { ModelSpecItem } from '@/core/contracts/GalxContracts';
import { ShareButton } from '@/components/common/ShareButton';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { ModelCreatorView } from './ModelCreatorView';
import { ModelDeveloperView } from './ModelDeveloperView';
import { ModelArchitectView } from './ModelArchitectView';
import { ModelSandboxSection } from './ModelSandboxSection';
import { ModelFaqSection, ModelSiblingSection } from './ModelFaqSection';

interface ModelCardClientProps {
  model: ModelSpecItem;
  siblingModels: ModelSpecItem[];
}

type ModelTab = 'integration' | 'sandbox' | 'specs' | 'calculator' | 'compare';

function BaseModelCardClient({ model, siblingModels }: ModelCardClientProps) {
  const [activeTab, setActiveTab] = useState<ModelTab>('integration');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCurlDrawer, setShowCurlDrawer] = useState(false);

  const isImage = model.category === 'image';

  const primarySibling = siblingModels.find((m) => m.category === model.category && m.id !== model.id);
  const compareHref = `/models/compare?ids=${model.id}${primarySibling ? `,${primarySibling.id}` : ''}`;

  const siblingFamilyList = React.useMemo(() => {
    const allInFamily = [model, ...siblingModels.filter((m) => m.category === model.category)];
    const seen = new Set<string>();
    const unique = allInFamily.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    const orderMap: Record<string, number> = {
      'gpt-5.6-sol': 1,
      'gpt-5.6-terra': 2,
      'gpt-5.6-luna': 3,
      'openai-gpt-image-2': 1,
      'openai-gpt-image-1.5': 2,
      'openai-gpt-image-1': 3,
    };

    return unique.sort((a, b) => (orderMap[a.id] ?? 99) - (orderMap[b.id] ?? 99));
  }, [model, siblingModels]);

  const uncachedTypicalTaskCost = isImage
    ? model.inputPricePer1M
    : (4000 / 1_000_000) * model.inputPricePer1M + (1000 / 1_000_000) * model.outputPricePer1M;

  const cachedTypicalTaskCost = isImage
    ? model.inputPricePer1M
    : (4000 / 1_000_000) * (model.cachedInputPricePer1M ?? model.inputPricePer1M) +
      (1000 / 1_000_000) * model.outputPricePer1M;

  const heroCurlSnippet = isImage
    ? `curl -X POST https://galx.ai/v1/images/generations \\
  -H "Authorization: Bearer $GALXAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model.id}",
    "prompt": "Futuristic cloud architecture blueprint, dark neon",
    "size": "1024x1024"
  }'`
    : `curl -X POST https://galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer $GALXAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model.id}",
    "messages": [{"role": "user", "content": "Explain quantum computing in 1 paragraph"}]
  }'`;

  const triggerCopy = async (text: string, identifier: string) => {
    const success = await safeCopyToClipboard(text);
    if (success) {
      setCopiedKey(identifier);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === identifier ? null : prev));
      }, 2000);
    }
  };

  const switchToSandbox = () => {
    setActiveTab('sandbox');
    const el = document.getElementById('model-tabs-container');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const tabs: Array<{ id: ModelTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'integration', label: 'Integration & Code', icon: Terminal },
    { id: 'sandbox', label: 'Interactive Sandbox', icon: Play },
    { id: 'specs', label: 'Specs & Benchmarks', icon: Cpu },
    { id: 'calculator', label: 'Economics & Cache ROI', icon: Coins },
    { id: 'compare', label: 'Sibling Comparisons', icon: GitCompare },
  ];

  return (
    <div className="space-y-12">
      {/* ========================================================================= */}
      {/* 1. DEVELOPER HERO: SERVICE IDENTITY, TELEMETRY & TRANSPARENT PRICING      */}
      {/* ========================================================================= */}
      <header className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6 relative overflow-hidden border border-white/10 bg-gradient-to-b from-[#0e1322] via-[#090c16] to-[#07080d] shadow-2xl">
        {/* Glow ambient background */}
        <div
          className={`absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[140px] pointer-events-none ${
            isImage ? 'bg-purple-500/15' : 'bg-cyan-500/15'
          }`}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          {/* Left: Model Identity & Value Proposition */}
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border shadow-sm ${
                  isImage
                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                    : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                }`}
              >
                OpenAI Codex Fleet
              </span>

              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-xs font-mono">
                {isImage ? 'VISUAL SYNTHESIS' : 'FRONTIER REASONING'}
              </span>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                <Zap className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                <span>Up to 90% Prompt Cache Pass-Through</span>
              </div>
            </div>

            {/* Sibling Model Family Switcher (OpenRouter / Hugging Face Pattern) */}
            {siblingFamilyList.length > 1 && (
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  Fleet Family:
                </span>
                <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 flex-wrap">
                  {siblingFamilyList.map((sib) => {
                    const isActive = sib.id === model.id;
                    const shortName = sib.id.replace('openai-', '').replace('gpt-5.6-', '').toUpperCase();
                    const subtitle =
                      sib.id === 'gpt-5.6-sol'
                        ? 'Flagship'
                        : sib.id === 'gpt-5.6-terra'
                        ? 'Balanced'
                        : sib.id === 'gpt-5.6-luna'
                        ? 'Fast'
                        : sib.id.includes('image-2')
                        ? 'Pro'
                        : sib.id.includes('image-1.5')
                        ? 'Plus'
                        : 'Standard';
                    return (
                      <Link
                        key={sib.id}
                        href={`/models/${sib.id.replace('/', '-')}`}
                        className={`px-3 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <span>{shortName}</span>
                        <span className={`text-[10px] ${isActive ? 'text-cyan-200/80' : 'text-zinc-400'}`}>
                          ({subtitle})
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
                {model.name}
              </h1>

              {/* Monospace Model ID Pill with 1-Click Copy */}
              <div className="flex items-center gap-2 pt-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-xs font-mono">
                  <span className="text-zinc-500">model:</span>
                  <span className="text-white font-bold">{model.id}</span>
                  <button
                    type="button"
                    onClick={() => triggerCopy(model.id, 'hero-model-id')}
                    title={`Copy ${model.id} model ID`}
                    className="ml-1 p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedKey === 'hero-model-id' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-xs font-mono">
                  <span className="text-zinc-500">Base URL:</span>
                  <span className="text-cyan-300 font-medium">https://galx.ai/v1</span>
                  <button
                    type="button"
                    onClick={() => triggerCopy('https://galx.ai/v1', 'hero-base-url')}
                    title="Copy Base URL"
                    className="ml-1 p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedKey === 'hero-base-url' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-sans">
              {model.description}
            </p>

            {/* Ergonomic Action Bar */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={switchToSandbox}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Test in Interactive Sandbox</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCurlDrawer(!showCurlDrawer)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    showCurlDrawer
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{showCurlDrawer ? 'Hide cURL' : 'Quick cURL'}</span>
                  {showCurlDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <Link
                  href={compareHref}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors border border-white/10 flex items-center gap-1.5 cursor-pointer"
                  title="Compare with sibling models side-by-side"
                >
                  <GitCompare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Compare {primarySibling ? `vs ${primarySibling.id}` : 'Models'}</span>
                </Link>

                <Link
                  href="/keys/new"
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors border border-white/10 flex items-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Get API Key</span>
                </Link>

                <ShareButton
                  variant="pill"
                  label="Share Specs"
                  title={`Check out ${model.name} on GALXAI`}
                  description={`Explore ${model.name} specifications, verified benchmarks, and prompt caching rates on GALXAI.`}
                />
              </div>

              {/* 1-Click Hero cURL Drawer */}
              {showCurlDrawer && (
                <div className="p-4 rounded-2xl bg-black/90 border border-cyan-500/30 font-mono text-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-150 shadow-xl">
                  <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                    <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                      <Terminal className="w-3.5 h-3.5" />
                      Shell cURL (Drop-in Gateway)
                    </span>
                    <button
                      type="button"
                      onClick={() => triggerCopy(heroCurlSnippet, 'hero-curl')}
                      className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition-colors cursor-pointer text-xs"
                    >
                      {copiedKey === 'hero-curl' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Command</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-zinc-200 overflow-x-auto p-3 rounded-xl bg-zinc-950/80 border border-white/5 selection:bg-white/20 selection:text-white leading-relaxed text-xs">
                    {heroCurlSnippet}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Right: Transparent 3-Part Pricing Matrix (OpenRouter & Together AI Pattern) */}
          <div className="p-5 rounded-2xl bg-black/80 border border-white/15 space-y-3 font-mono min-w-[310px] sm:w-[340px] shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                Pricing Matrix
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                Pay As You Go
              </span>
            </div>

            {/* 3-Part Matrix Grid */}
            <div className="space-y-2 text-xs">
              {/* Input Tokens */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase">
                    {isImage ? 'Standard Generation' : 'Input Rate'}
                  </span>
                  <span className="text-sm font-black text-white">
                    ${model.inputPricePer1M.toFixed(isImage ? 3 : 2)}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 font-sans">
                  {isImage ? 'per image' : 'per 1M tokens'}
                </span>
              </div>

              {/* Output Tokens (if LLM) */}
              {!isImage && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase">
                      Output Rate
                    </span>
                    <span className="text-sm font-black text-white">
                      ${model.outputPricePer1M.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-sans">
                    per 1M tokens
                  </span>
                </div>
              )}

              {/* Cached Input Tokens */}
              {model.cachedInputPricePer1M !== undefined && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-300 block text-[10px] uppercase font-bold">
                        Prompt Cache Hit
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 text-[10px] font-bold">
                        -90%
                      </span>
                    </div>
                    <span className="text-sm font-black text-emerald-400">
                      ${model.cachedInputPricePer1M.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-300/80 font-sans">
                    per 1M cached
                  </span>
                </div>
              )}
            </div>

            {/* Practical Micro-Task Estimation */}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-400">Typical Task Cost:</span>
                <span className="text-white font-bold">
                  {isImage
                    ? `~$${uncachedTypicalTaskCost.toFixed(3)} / image`
                    : `~$${uncachedTypicalTaskCost.toFixed(4)} (4K in / 1K out)`}
                </span>
              </div>
              {!isImage && model.cachedInputPricePer1M !== undefined && (
                <div className="flex items-center justify-between text-[10px] text-emerald-400">
                  <span>With Cache Hit:</span>
                  <span className="font-bold">
                    ~${cachedTypicalTaskCost.toFixed(4)} / task
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Telemetry strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs font-mono">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-zinc-500 text-[10px] uppercase block">Context Window</span>
            <span className="text-white font-bold text-sm">
              {isImage ? '128K tokens' : `${(model.contextWindowTokens / 1000).toLocaleString()}K tokens`}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-zinc-500 text-[10px] uppercase block">Max Completion</span>
            <span className="text-white font-bold text-sm">
              {isImage ? '4K tokens' : `${((model.maxOutputTokens ?? 128000) / 1000).toLocaleString()}K tokens`}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-zinc-500 text-[10px] uppercase block">Anycast Edge TTFT</span>
            <span className="text-cyan-300 font-bold text-sm">&lt; 15ms (Global Edge)</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-zinc-500 text-[10px] uppercase block">Data Retention</span>
            <span className="text-emerald-400 font-bold text-sm">0 Days (RAM / ZDR)</span>
          </div>
        </div>

        {/* API Parameter & Feature Support Matrix (OpenAI / OpenRouter Pattern) */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            <span>API Capability &amp; Parameter Support Matrix</span>
            <span className="text-emerald-400 font-bold">100% OpenAI Wire-Compatible</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-zinc-400 block">Streaming</span>
              <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                <CheckCircle2 className="w-3 h-3" />
                <span>SSE Native</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-zinc-400 block">Structured JSON</span>
              <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                <CheckCircle2 className="w-3 h-3" />
                <span>Strict Schema</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-zinc-400 block">Tool Calling</span>
              <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                <CheckCircle2 className="w-3 h-3" />
                <span>Parallel Tools</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-zinc-400 block">Prompt Caching</span>
              <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                <Zap className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                <span>Up to -90%</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-zinc-400 block">System Prompts</span>
              <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                <CheckCircle2 className="w-3 h-3" />
                <span>Supported</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-zinc-400 block">Vision / Images</span>
              <div className="flex items-center gap-1 text-[11px] font-bold">
                {model.supportsVision || isImage ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Native
                  </span>
                ) : (
                  <span className="text-zinc-500">Text Only</span>
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-zinc-400 block">Logprobs</span>
              <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                <CheckCircle2 className="w-3 h-3" />
                <span>Top 5</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. WORLD-CLASS TABBED WORKSPACE (OpenRouter & Together AI Pattern)        */}
      {/* ========================================================================= */}
      <div id="model-tabs-container" className="space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="p-1.5 rounded-2xl bg-black/60 border border-white/10 shadow-lg flex items-center justify-start overflow-x-auto gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer font-mono text-xs whitespace-nowrap ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Subviews */}
        <div className="min-h-[400px]">
          {activeTab === 'integration' && (
            <ModelDeveloperView model={model} triggerCopy={triggerCopy} copiedKey={copiedKey} />
          )}

          {activeTab === 'sandbox' && (
            <ModelSandboxSection model={model} />
          )}

          {activeTab === 'specs' && (
            <ModelArchitectView model={model} />
          )}

          {activeTab === 'calculator' && (
            <ModelCreatorView model={model} triggerCopy={triggerCopy} copiedKey={copiedKey} />
          )}

          {activeTab === 'compare' && (
            <ModelSiblingSection model={model} siblingModels={siblingModels} />
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TECHNICAL DEVELOPER FAQ (Always accessible)                            */}
      {/* ========================================================================= */}
      <ModelFaqSection model={model} />

      {/* ========================================================================= */}
      {/* 4. GATEWAY ARCHITECTURE & GUARANTEES (Cloudflare / Groq Pattern)          */}
      {/* ========================================================================= */}
      <section aria-labelledby="model-architecture-guarantees" className="space-y-4 pt-4">
        <div className="space-y-1">
          <h2 id="model-architecture-guarantees" className="text-xl font-bold text-white tracking-tight">
            Enterprise Gateway Architecture
          </h2>
          <p className="text-xs text-zinc-400">
            Resilient Anycast routing infrastructure designed for production AI systems and agent loops.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Code2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">100% Drop-in SDK Compatibility</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Drop-in replacement for OpenAI SDKs, LangChain, LlamaIndex, Cursor, and Windsurf by changing only your baseURL.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Automatic Prompt Caching</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              System instructions and repetitive file contexts automatically receive up to 90% discount on recurring requests.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Zero Data Retention (ZDR)</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Inference requests transit through ephemeral encrypted memory rings and are never saved to persistent storage or used for training.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Server className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Multi-Region Edge Failover</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Sub-15ms Anycast edge routing with active health probing bypasses upstream 429 rate limit stalls and regional outages.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CALM DEVELOPER ONBOARDING FOOTER (Stripe Pattern)                      */}
      {/* ========================================================================= */}
      <section className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 bg-gradient-to-r from-black/60 to-zinc-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <h3 className="text-lg font-bold text-white">
            Ready to route inference to {model.name}?
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Generate an API key in under 30 seconds. Prepaid wallet metering prevents unexpected overages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/docs/quickstart"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-colors border border-white/10 cursor-pointer"
          >
            Quickstart Guide
          </Link>

          <Link
            href="/keys/new"
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <span>Create API Key</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            href="/models/compare"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Compare All Models
          </Link>
        </div>
      </section>
    </div>
  );
}

export const ModelCardClient = withErrorBoundary(BaseModelCardClient, {
  name: 'Model Detail Card Client'
});
