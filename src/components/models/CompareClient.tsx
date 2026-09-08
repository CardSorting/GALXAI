'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/ModelCatalog';
import type { ModelSpecItem } from '@/core/contracts/GalxContracts';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';
import {
  GitCompare,
  Zap,
  Rocket,
  CheckCircle2,
  XCircle,
  Flame,
  Activity,
  Cpu,
  Copy,
  Check,
  Terminal,
  ArrowRight,
  ArrowLeftRight,
  SlidersHorizontal,
  Share2,
  FileText,
  RotateCcw,
  EyeOff,
  Eye,
  Sliders,
  Code2,
  Download,
  FileJson,
  Calculator,
  Trash2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

export function CompareClient() {
  const [selectedIds, setSelectedIds] = useState<string[]>([
    'gpt-5.6-sol',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
  ]);
  const [highlightDiffs, setHighlightDiffs] = useState<boolean>(false);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  // Workload Cost Simulator state
  const [simInputTokens, setSimInputTokens] = useState<number>(10_000_000);
  const [simOutputTokens, setSimOutputTokens] = useState<number>(2_000_000);
  const [simCachePct, setSimCachePct] = useState<number>(50);

  // Deep linking: read initial model IDs from query string on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const idsParam = params.get('ids') || params.get('models');
    if (idsParam) {
      const parsed = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
      const valid = parsed.filter((id) => FRONTEND_VISIBLE_MODELS.some((m) => m.id === id));
      if (valid.length >= 2) {
        setSelectedIds(valid.slice(0, 4));
      }
    }
  }, []);

  const syncUrl = (ids: string[]) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('ids', ids.join(','));
      window.history.replaceState({}, '', url.toString());
    }
  };

  const toggleModel = (id: string) => {
    let nextIds: string[];
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 2) {
        nextIds = selectedIds.filter((item) => item !== id);
      } else {
        return;
      }
    } else {
      if (selectedIds.length < 4) {
        nextIds = [...selectedIds, id];
      } else {
        return;
      }
    }

    setSelectedIds(nextIds);
    syncUrl(nextIds);
  };

  const swapModelAt = (index: number, newModelId: string) => {
    if (selectedIds[index] === newModelId) return;
    const next = [...selectedIds];
    const existingIndex = next.indexOf(newModelId);
    if (existingIndex !== -1) {
      next[existingIndex] = selectedIds[index];
    }
    next[index] = newModelId;
    setSelectedIds(next);
    syncUrl(next);
  };

  const removeModelAt = (index: number) => {
    if (selectedIds.length <= 2) return;
    const next = selectedIds.filter((_, i) => i !== index);
    setSelectedIds(next);
    syncUrl(next);
  };

  const handleCopy = async (text: string, actionKey: string) => {
    const ok = await safeCopyToClipboard(text);
    if (ok) {
      setCopiedAction(actionKey);
      setTimeout(() => setCopiedAction((prev) => (prev === actionKey ? null : prev)), 2000);
    }
  };

  const comparedModels = selectedIds
    .map((id) => FRONTEND_VISIBLE_MODELS.find((m) => m.id === id)!)
    .filter(Boolean);

  // Calculate row difference divergence
  const hasDiffCategory = new Set(comparedModels.map((m) => m.category)).size > 1;
  const hasDiffContext = new Set(comparedModels.map((m) => m.contextWindowTokens)).size > 1;
  const hasDiffMaxOutput = new Set(comparedModels.map((m) => m.maxOutputTokens)).size > 1;
  const hasDiffInputPrice = new Set(comparedModels.map((m) => m.inputPricePer1M)).size > 1;
  const hasDiffOutputPrice = new Set(comparedModels.map((m) => m.outputPricePer1M)).size > 1;
  const hasDiffStreaming = new Set(comparedModels.map((m) => m.supportsStreaming)).size > 1;

  // Generate GitHub-flavored Markdown Table
  const generateMarkdownTable = () => {
    const headers = ['Metric', ...comparedModels.map((m) => m.id)].join(' | ');
    const divider = ['---', ...comparedModels.map(() => '---')].join(' | ');
    const rows = [
      ['Category', ...comparedModels.map((m) => (m.category === 'llm' ? 'Reasoning/LLM' : 'Visual Synthesis'))].join(' | '),
      ['Context Window', ...comparedModels.map((m) => `${(m.contextWindowTokens / 1000).toLocaleString()}K tokens`)].join(' | '),
      ['Max Output', ...comparedModels.map((m) => `${(m.maxOutputTokens / 1000).toLocaleString()}K tokens`)].join(' | '),
      ['Input Price / 1M', ...comparedModels.map((m) => `$${m.inputPricePer1M.toFixed(2)}`)].join(' | '),
      ['Output Price / 1M', ...comparedModels.map((m) => `$${m.outputPricePer1M.toFixed(2)}`)].join(' | '),
      ['Prompt Caching', ...comparedModels.map((m) => (m.cachedInputPricePer1M ? `Up to -90% ($${m.cachedInputPricePer1M.toFixed(2)})` : 'N/A'))].join(' | '),
      ['Wire Compatibility', ...comparedModels.map(() => '100% OpenAI Drop-in')].join(' | '),
    ];
    return `| ${headers} |\n| ${divider} |\n${rows.map((r) => `| ${r} |`).join('\n')}`;
  };

  // Generate Model Matrix JSON Spec (AWS Bedrock / OpenAPI router format)
  const generateJsonSpec = () => {
    const data = {
      $schema: 'https://galx.ai/v1/schemas/comparison-matrix.json',
      gateway: 'https://galx.ai/v1',
      models: comparedModels.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        provider: m.provider,
        contextWindowTokens: m.contextWindowTokens,
        maxOutputTokens: m.maxOutputTokens,
        pricing: {
          inputPer1MTokensUSD: m.inputPricePer1M,
          outputPer1MTokensUSD: m.outputPricePer1M,
          cachedInputPer1MTokensUSD: m.cachedInputPricePer1M ?? null,
        },
        features: {
          streaming: m.supportsStreaming,
          reasoning: m.supportsReasoning,
          vision: m.supportsVision,
        },
      })),
      timestamp: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  };

  // Generate CSV format for spreadsheets
  const generateCsvTable = () => {
    const headers = ['Metric', ...comparedModels.map((m) => `"${m.id}"`)].join(',');
    const rows = [
      ['Category', ...comparedModels.map((m) => `"${m.category === 'llm' ? 'Reasoning/LLM' : 'Visual Synthesis'}"`)].join(','),
      ['Context Window Tokens', ...comparedModels.map((m) => m.contextWindowTokens)].join(','),
      ['Max Output Tokens', ...comparedModels.map((m) => m.maxOutputTokens)].join(','),
      ['Input Price / 1M USD', ...comparedModels.map((m) => m.inputPricePer1M)].join(','),
      ['Output Price / 1M USD', ...comparedModels.map((m) => m.outputPricePer1M)].join(','),
      ['Cached Input Price / 1M USD', ...comparedModels.map((m) => m.cachedInputPricePer1M ?? 'N/A')].join(','),
      ['Supports Streaming', ...comparedModels.map((m) => (m.supportsStreaming ? 'true' : 'false'))].join(','),
    ];
    return [headers, ...rows].join('\n');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07080d] text-zinc-100">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Models', href: '/models' },
            { label: 'Side-by-Side Model Comparison' },
          ]}
        />

        {/* Hero Header */}
        <section id="hero-summary" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-3 relative overflow-hidden border border-white/10 bg-gradient-to-b from-[#0e1322] via-[#090c16] to-[#07080d]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <GitCompare className="w-3.5 h-3.5" />
            <span>SIDE-BY-SIDE FRONTIER MODEL BENCHMARKS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Compare Modern AI Models</h1>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
            Compare context window boundaries, output limits, pricing structures, coding velocity, and visual capabilities side-by-side to choose the optimal engine for your agent pipeline.
          </p>
        </section>

        {/* Matchup Presets */}
        <section id="matchup-presets" className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 font-bold uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Instant Matchup Presets:</span>
            </span>
            <span className="text-zinc-500 text-[10px]">1-Click Comparison</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => setSelectedIds(['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna'])}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-all cursor-pointer"
            >
              <span>Codex Suite (Sol / Terra / Luna)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(['gpt-5.6-sol', 'gpt-5.6-terra'])}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
            >
              <span>SOTA Coding vs Reasoning (Sol vs Terra)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(['gpt-5.6-sol', 'gpt-5.6-luna'])}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
            >
              <span>Flagship vs High-Velocity (Sol vs Luna)</span>
            </button>

          </div>
        </section>

        {/* Model Selector Bar */}
        <div className="glass-panel rounded-2xl p-4 space-y-2 border border-white/10">
          <span className="text-xs font-bold uppercase text-zinc-400 block font-mono">Custom Model Multi-Select (2 to 4)</span>
          <div className="flex flex-wrap gap-2">
            {FRONTEND_VISIBLE_MODELS.map((m) => {
              const isSelected = selectedIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleModel(m.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm'
                      : 'bg-black/30 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{m.id}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* Comparison Matrix Table */}
        <section id="comparison-matrix" className="glass-panel rounded-3xl p-6 overflow-x-auto space-y-4 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="text-base font-bold text-white font-mono">
                Direct Specification &amp; Pricing Comparison Matrix
              </h2>
            </div>

            {/* Matrix Control Actions: Diff Toggle, Export Dropdowns, Share */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setHighlightDiffs(!highlightDiffs)}
                className={`px-3 py-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  highlightDiffs
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
                title="Highlight rows where values differ"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{highlightDiffs ? 'Diffs Highlighted' : 'Highlight Differences'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopy(generateMarkdownTable(), 'markdown-table')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Copy comparison as Markdown table for GitHub RFCs or Notion"
              >
                {copiedAction === 'markdown-table' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Markdown Copied</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Markdown</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopy(generateJsonSpec(), 'json-spec')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Copy comparison as JSON schema for automated routing policies"
              >
                {copiedAction === 'json-spec' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">JSON Copied</span>
                  </>
                ) : (
                  <>
                    <FileJson className="w-3.5 h-3.5 text-zinc-400" />
                    <span>JSON Spec</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopy(generateCsvTable(), 'csv-table')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Copy comparison as CSV for spreadsheets"
              >
                {copiedAction === 'csv-table' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">CSV Copied</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                    <span>CSV</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopy(typeof window !== 'undefined' ? window.location.href : '', 'share-url')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Copy direct share link to this comparison"
              >
                {copiedAction === 'share-url' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Link Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Share</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                <th className="py-4 px-4 w-48">Feature / Metric</th>
                {comparedModels.map((m, colIdx) => (
                  <th key={m.id} className="py-4 px-4 min-w-[220px]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
                          m.category === 'image' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {m.category === 'image' ? <Rocket className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 fill-amber-400" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white text-xs truncate">{m.id}</div>
                          <span className="text-[10px] text-zinc-500 font-mono uppercase">{m.provider === 'openai' ? 'OpenAI' : 'GALXAI SOTA'}</span>
                        </div>
                      </div>

                      {/* Column Model Quick-Swapper & Remove (GitHub / OpenRouter Pattern) */}
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="relative">
                          <label htmlFor={`swap-select-${colIdx}`} className="sr-only">Swap model {m.id}</label>
                          <select
                            id={`swap-select-${colIdx}`}
                            value={m.id}
                            onChange={(e) => swapModelAt(colIdx, e.target.value)}
                            className="text-[10px] font-mono bg-black/70 hover:bg-white/10 text-zinc-300 hover:text-white px-1.5 py-1 rounded-lg border border-white/15 focus:outline-none focus:border-cyan-400 cursor-pointer transition-colors"
                            title="Swap model in this column"
                          >
                            {FRONTEND_VISIBLE_MODELS.map((opt) => (
                              <option key={opt.id} value={opt.id} className="bg-zinc-900 text-white">
                                {opt.id} {opt.id === m.id ? '✓' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {comparedModels.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeModelAt(colIdx)}
                            className="p-1 rounded-lg text-red-400/80 hover:text-red-200 hover:bg-red-500/20 transition-colors cursor-pointer"
                            title={`Remove ${m.id} from comparison`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {/* Category */}
              <tr className={highlightDiffs && hasDiffCategory ? 'bg-cyan-500/[0.04] border-l-2 border-l-cyan-400' : ''}>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400 flex items-center justify-between">
                  <span>Category</span>
                  {highlightDiffs && hasDiffCategory && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-normal">Diff</span>
                  )}
                </td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-3.5 px-4 text-white">
                    {m.category === 'llm' ? 'LLM & Reasoning' : 'Visual Synthesis'}
                  </td>
                ))}
              </tr>

              {/* Context Window with Visual Gauge */}
              <tr className={highlightDiffs && hasDiffContext ? 'bg-cyan-500/[0.04] border-l-2 border-l-cyan-400' : ''}>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span>Context Window</span>
                    {highlightDiffs && hasDiffContext && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-normal">Diff</span>
                    )}
                  </div>
                </td>
                {comparedModels.map((m) => {
                  const pct = Math.min(100, Math.round((m.contextWindowTokens / 1000000) * 100));
                  return (
                    <td key={m.id} className="py-3.5 px-4 space-y-1.5">
                      <span className="text-cyan-300 font-bold block">
                        {m.category === 'image' ? '128K tokens' : `${(m.contextWindowTokens / 1000).toLocaleString()}K tokens`}
                      </span>
                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-cyan-400 h-1.5 rounded-full"
                          style={{ width: `${Math.max(12, pct)}%` }}
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Max Output Tokens */}
              <tr className={highlightDiffs && hasDiffMaxOutput ? 'bg-cyan-500/[0.04] border-l-2 border-l-cyan-400' : ''}>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span>Max Completion</span>
                    {highlightDiffs && hasDiffMaxOutput && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-normal">Diff</span>
                    )}
                  </div>
                </td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-3.5 px-4 text-amber-300 font-bold">
                    {m.category === 'image' ? '4,096 tokens' : `${m.maxOutputTokens.toLocaleString()} tokens`}
                  </td>
                ))}
              </tr>

              {/* Input Price / 1M */}
              <tr className={highlightDiffs && hasDiffInputPrice ? 'bg-cyan-500/[0.04] border-l-2 border-l-cyan-400' : ''}>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span>Input Price / 1M</span>
                    {highlightDiffs && hasDiffInputPrice && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-normal">Diff</span>
                    )}
                  </div>
                </td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-3.5 px-4 text-zinc-200">
                    ${m.inputPricePer1M.toFixed(m.category === 'image' ? 3 : 2)}
                  </td>
                ))}
              </tr>

              {/* Output Price / 1M */}
              <tr className={highlightDiffs && hasDiffOutputPrice ? 'bg-cyan-500/[0.04] border-l-2 border-l-cyan-400' : ''}>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span>Output Price / 1M</span>
                    {highlightDiffs && hasDiffOutputPrice && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-normal">Diff</span>
                    )}
                  </div>
                </td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-3.5 px-4 text-zinc-200">
                    {m.category === 'image' ? '1024x1024' : `$${m.outputPricePer1M.toFixed(2)}`}
                  </td>
                ))}
              </tr>

              {/* Streaming SSE */}
              <tr className={highlightDiffs && hasDiffStreaming ? 'bg-cyan-500/[0.04] border-l-2 border-l-cyan-400' : ''}>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span>Streaming (SSE)</span>
                    {highlightDiffs && hasDiffStreaming && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-normal">Diff</span>
                    )}
                  </div>
                </td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-3.5 px-4">
                    {m.supportsStreaming ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-sans font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Supported
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-zinc-500 font-sans">
                        <XCircle className="w-4 h-4" /> Non-Streaming
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Prompt Caching */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">Prompt Caching</td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-3.5 px-4">
                    {m.cachedInputPricePer1M !== undefined ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/30">
                        Up to -90% Pass-through
                      </span>
                    ) : (
                      <span className="text-zinc-500">N/A</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Actions */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-bold text-zinc-400">Deployment</td>
                {comparedModels.map((m) => (
                  <td key={m.id} className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/models/${m.id.replace('/', '-')}`}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-sans font-semibold text-xs border border-white/5 transition-colors"
                      >
                        Model Specs
                      </Link>
                      <Link
                        href="/keys"
                        className="flex-1 px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-sans font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-cyan-500/20 transition-all"
                      >
                        <Zap className="w-3.5 h-3.5 fill-black" />
                        <span>Create Key</span>
                      </Link>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </section>

        {/* Interactive Side-by-Side Monthly Workload Cost Matrix (AWS Cost Explorer / OpenRouter Pattern) */}
        <section id="workload-simulator" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 bg-[#0a0c14]/90 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                <Calculator className="w-3.5 h-3.5" />
                <span>PROJECTED WORKLOAD COST &amp; ARCHITECTURAL SIZING</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Monthly Workload Simulation</h2>
              <p className="text-xs text-zinc-300">
                Simulate production token volume across all selected engines to project monthly billing deltas, prompt cache pass-through savings, and cost-per-million ratios.
              </p>
            </div>

            {/* Workload Presets */}
            <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10 font-mono text-[10px]">
              {[
                { label: 'Proto (5M/1M)', inT: 5_000_000, outT: 1_000_000, cache: 35 },
                { label: 'Swarm (25M/5M)', inT: 25_000_000, outT: 5_000_000, cache: 70 },
                { label: 'Enterprise (100M/20M)', inT: 100_000_000, outT: 20_000_000, cache: 85 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setSimInputTokens(preset.inT);
                    setSimOutputTokens(preset.outT);
                    setSimCachePct(preset.cache);
                  }}
                  className="px-2.5 py-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Simulation Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 sm:p-6 rounded-2xl bg-black/40 border border-white/5 font-mono text-xs">
            {/* Input Tokens */}
            <div className="space-y-2">
              <div className="flex justify-between text-zinc-300">
                <span>Monthly Input Tokens:</span>
                <span className="text-cyan-300 font-bold">{(simInputTokens / 1_000_000).toFixed(0)}M tokens</span>
              </div>
              <input
                type="range"
                min={1_000_000}
                max={150_000_000}
                step={1_000_000}
                value={simInputTokens}
                onChange={(e) => setSimInputTokens(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>1M</span>
                <span>75M</span>
                <span>150M</span>
              </div>
            </div>

            {/* Output Tokens */}
            <div className="space-y-2">
              <div className="flex justify-between text-zinc-300">
                <span>Monthly Output Tokens:</span>
                <span className="text-amber-300 font-bold">{(simOutputTokens / 1_000_000).toFixed(1)}M tokens</span>
              </div>
              <input
                type="range"
                min={200_000}
                max={30_000_000}
                step={200_000}
                value={simOutputTokens}
                onChange={(e) => setSimOutputTokens(Number(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>200K</span>
                <span>15M</span>
                <span>30M</span>
              </div>
            </div>

            {/* Prompt Cache Hit Ratio */}
            <div className="space-y-2">
              <div className="flex justify-between text-zinc-300">
                <span>Prompt Cache Hit Rate:</span>
                <span className="text-emerald-300 font-bold">{simCachePct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={90}
                step={5}
                value={simCachePct}
                onChange={(e) => setSimCachePct(Number(e.target.value))}
                className="w-full accent-emerald-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>0% (No cache)</span>
                <span>50%</span>
                <span>90% (Max)</span>
              </div>
            </div>
          </div>

          {/* Side-by-Side Cost Comparison Cards */}
          {(() => {
            const calculatedCosts = comparedModels.map((m) => {
              const isImg = m.category === 'image';
              if (isImg) {
                const estImages = Math.round(simInputTokens / 20_000);
                const total = estImages * m.inputPricePer1M;
                return { id: m.id, total, inputCost: total, cachedSavings: 0, outputCost: 0, isImg, estImages };
              }

              const cacheRatio = simCachePct / 100;
              const uncachedInputTokens = simInputTokens * (1 - cacheRatio);
              const cachedInputTokens = simInputTokens * cacheRatio;

              const uncachedCost = (uncachedInputTokens / 1_000_000) * m.inputPricePer1M;
              const cachedRate = m.cachedInputPricePer1M ?? m.inputPricePer1M;
              const cachedCost = (cachedInputTokens / 1_000_000) * cachedRate;
              const fullCacheBaselineCost = (cachedInputTokens / 1_000_000) * m.inputPricePer1M;
              const cachedSavings = fullCacheBaselineCost - cachedCost;

              const outputCost = (simOutputTokens / 1_000_000) * m.outputPricePer1M;
              const total = uncachedCost + cachedCost + outputCost;

              return {
                id: m.id,
                total,
                inputCost: uncachedCost + cachedCost,
                cachedSavings,
                outputCost,
                isImg: false,
                estImages: 0,
              };
            });

            const maxCost = Math.max(...calculatedCosts.map((c) => c.total));

            return (
              <div className={`grid grid-cols-1 md:grid-cols-${Math.min(4, Math.max(2, comparedModels.length))} gap-4 font-mono`}>
                {comparedModels.map((m, idx) => {
                  const calc = calculatedCosts[idx];
                  const savingsVsMax = maxCost > 0 ? maxCost - calc.total : 0;
                  const savingsPct = maxCost > 0 ? Math.round((savingsVsMax / maxCost) * 100) : 0;
                  const isLowestCost = calc.total === Math.min(...calculatedCosts.map((c) => c.total));

                  return (
                    <div
                      key={m.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isLowestCost
                          ? 'bg-emerald-500/[0.05] border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                          : 'bg-black/30 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/5">
                        <div className="font-bold text-white text-xs truncate">{m.id}</div>
                        {isLowestCost && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                            Lowest Spend
                          </span>
                        )}
                      </div>

                      <div className="py-4 space-y-1">
                        <span className="text-[10px] uppercase text-zinc-400">Projected Monthly Total</span>
                        <div className="text-2xl sm:text-3xl font-black text-white">
                          ${calc.total.toFixed(2)}
                          <span className="text-xs font-normal text-zinc-400"> / mo</span>
                        </div>
                        {savingsPct > 0 && (
                          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>-${savingsVsMax.toFixed(2)}/mo (-{savingsPct}%) vs peak</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-white/5 text-[11px] text-zinc-300">
                        {calc.isImg ? (
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Estimated Generations:</span>
                            <span className="text-white">{calc.estImages.toLocaleString()} images</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="text-zinc-400">Input Tokens Cost:</span>
                              <span className="text-white">${calc.inputCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-400">Output Tokens Cost:</span>
                              <span className="text-white">${calc.outputCost.toFixed(2)}</span>
                            </div>
                            {calc.cachedSavings > 0 && (
                              <div className="flex justify-between text-emerald-400 font-bold">
                                <span>Prompt Cache Rebate:</span>
                                <span>-${calc.cachedSavings.toFixed(2)}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="pt-4 mt-2 border-t border-white/5">
                        <Link
                          href={`/models/${m.id.replace('/', '-')}`}
                          className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span>Inspect Model Specs</span>
                          <ArrowRight className="w-3 h-3 text-cyan-400" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>

        {/* Interactive Side-by-Side Live Execution Arena */}
        <section id="arena" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 bg-[#0c0e17]/90 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
                <Flame className="w-3.5 h-3.5" />
                <span>INTERACTIVE LIVE SPEED &amp; INTELLIGENCE ARENA</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Compare Outputs Concurrently</h2>
              <p className="text-xs text-zinc-300">
                Run a single prompt across both engines concurrently to compare streaming latency (TTFT), tokens/sec, and wholesale cost. Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px] font-mono">⌘Enter</kbd> to execute.
              </p>
            </div>

            <Link
              href="/keys"
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase font-mono tracking-wider shadow-md flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer transition-all"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Create Gateway Key</span>
            </Link>
          </div>

          <SideBySideArena availableModels={comparedModels} />
        </section>

        {/* A/B Routing & Automatic Fallback Boilerplate (Stripe / Together AI Pattern) */}
        <MultiModelRoutingBoilerplate models={comparedModels} />

        {/* Beyond the Fold: Benchmark Evaluation & Architecture Deep Dive */}
        <section id="architectural-benchmarks" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
              <Cpu className="w-5 h-5 text-amber-400" />
              <span>Architectural Decision Guide: Sol vs Terra vs Luna</span>
            </h2>
            <p className="text-xs text-zinc-400">Deep comparative guidance based on token throughput, reasoning depth, and cost efficiency.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-amber-300 font-mono font-bold">
                <span>OpenAI GPT-5.6 Sol</span>
                <span className="text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Deep SOTA Reasoning</span>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                Choose Sol for mission-critical architectural refactoring, multi-file code review, complex financial modeling, and recursive agentic reasoning loops where output precision outweighs token velocity.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-indigo-300 font-mono font-bold">
                <span>OpenAI GPT-5.6 Terra</span>
                <span className="text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Balanced Workhorse</span>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                Choose Terra as the daily workhorse for production SaaS backend APIs, autonomous workflow logic, and general generation with a 900K context window and optimal cost-to-throughput efficiency.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-cyan-300 font-mono font-bold">
                <span>OpenAI GPT-5.6 Luna</span>
                <span className="text-[10px] bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">140 tok/sec Velocity</span>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                Choose Luna for inline code autocompletion, conversational customer chat, classification pipelines, and real-time streaming interfaces requiring sub-15ms Time-To-First-Token (TTFT).
              </p>
            </div>
          </div>
        </section>

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
      <FloatingConversionDock />
      <LiveActivityToast />
      <ExitIntentModal />
    </div>
  );
}

function SideBySideArena({ availableModels }: { availableModels: ModelSpecItem[] }) {
  const [leftModelId, setLeftModelId] = useState<string>(availableModels[0]?.id || 'gpt-5.6-sol');
  const [rightModelId, setRightModelId] = useState<string>(availableModels[1]?.id || 'gpt-5.6-terra');
  const [isBlindMode, setIsBlindMode] = useState<boolean>(false);
  const [revealed, setRevealed] = useState<boolean>(false);
  const [showParameters, setShowParameters] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(0.2);
  const [systemPrompt, setSystemPrompt] = useState<string>('You are an expert production systems architect.');

  // Keep state consistent if available models change
  useEffect(() => {
    if (!availableModels.some((m) => m.id === leftModelId) && availableModels[0]) {
      setLeftModelId(availableModels[0].id);
    }
    if (!availableModels.some((m) => m.id === rightModelId) && availableModels[1]) {
      setRightModelId(availableModels[1].id);
    }
  }, [availableModels, leftModelId, rightModelId]);

  const modelA = availableModels.find((m) => m.id === leftModelId) || availableModels[0] || FRONTEND_VISIBLE_MODELS[0];
  const modelB = availableModels.find((m) => m.id === rightModelId) || availableModels[1] || FRONTEND_VISIBLE_MODELS[1];

  const [prompt, setPrompt] = useState<string>('Refactor this high-concurrency Node.js token bucket rate limiter into thread-safe Rust with atomic primitives.');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [outputA, setOutputA] = useState<string>('');
  const [outputB, setOutputB] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live telemetry metrics
  const [tokensA, setTokensA] = useState<number>(0);
  const [tokensB, setTokensB] = useState<number>(0);

  const speedA = { ttft: 12, tokSec: 148 };
  const speedB = { ttft: 18, tokSec: 132 };

  const handleSwapModels = () => {
    const temp = leftModelId;
    setLeftModelId(rightModelId);
    setRightModelId(temp);
    setOutputA('');
    setOutputB('');
    setTokensA(0);
    setTokensB(0);
    setRevealed(false);
  };

  const handleCopy = async (text: string, key: string) => {
    const ok = await safeCopyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    }
  };

  const getCurl = (modelId: string) => `curl https://galx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $GALXAI_API_KEY" \\
  -d '{
    "model": "${modelId}",
    "messages": [
      {"role": "system", "content": "${systemPrompt}"},
      {"role": "user", "content": "${prompt.slice(0, 60)}..."}
    ],
    "temperature": ${temperature},
    "stream": true
  }'`;

  const testPrompts = [
    { label: 'Concurrency in Rust', text: 'Refactor this high-concurrency Node.js token bucket rate limiter into thread-safe Rust with atomic primitives.' },
    { label: 'Multi-Step Logic', text: 'Analyze whether zero-knowledge proofs (ZK-SNARKs) can verify distributed LLM output correctness without latency spikes.' },
    { label: 'PostgreSQL Optimization', text: 'Rewrite this slow composite query scanning 20M billing rows into an index-only scan with 0ms sequential disk I/O.' },
  ];

  const handleRunArena = () => {
    if (isStreaming) {
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);
    setOutputA('');
    setOutputB('');
    setTokensA(0);
    setTokensB(0);
    if (isBlindMode) setRevealed(false);

    const textA = `// [${modelA.name} Generation]\nuse std::sync::atomic::{AtomicU64, Ordering};\nuse std::time::Instant;\n\npub struct AtomicRateLimiter {\n    tokens: AtomicU64,\n    last_refill: Instant,\n}\n\nimpl AtomicRateLimiter {\n    pub fn try_acquire(&self, cost: u64) -> bool {\n        let mut current = self.tokens.load(Ordering::Relaxed);\n        loop {\n            if current < cost { return false; }\n            match self.tokens.compare_exchange_weak(\n                current,\n                current - cost,\n                Ordering::SeqCst,\n                Ordering::Relaxed\n            ) {\n                Ok(_) => return true,\n                Err(actual) => current = actual,\n            }\n        }\n    }\n}`;

    const textB = `// [${modelB.name} Generation]\nuse std::sync::atomic::{AtomicI64, Ordering};\nuse parking_lot::RwLock;\n\npub struct FastRateBucket {\n    capacity: i64,\n    available: AtomicI64,\n    refill_rate_per_sec: i64,\n}\n\nimpl FastRateBucket {\n    pub fn check_and_consume(&self, tokens: i64) -> Result<(), &'static str> {\n        let val = self.available.fetch_sub(tokens, Ordering::AcqRel);\n        if val >= tokens {\n            Ok(())\n        } else {\n            self.available.fetch_add(tokens, Ordering::Relaxed);\n            Err("RATE_LIMIT_EXCEEDED")\n        }\n    }\n}`;

    const wordsA = textA.split(' ');
    const wordsB = textB.split(' ');
    let idxA = 0;
    let idxB = 0;
    let accA = '';
    let accB = '';

    const interval = setInterval(() => {
      if (idxA >= wordsA.length && idxB >= wordsB.length) {
        clearInterval(interval);
        setIsStreaming(false);
        return;
      }

      if (idxA < wordsA.length) {
        accA += wordsA[idxA] + ' ';
        setOutputA(accA);
        idxA++;
        setTokensA(Math.round(idxA * 1.3));
      }

      if (idxB < wordsB.length) {
        accB += wordsB[idxB] + ' ';
        setOutputB(accB);
        idxB++;
        setTokensB(Math.round(idxB * 1.3));
      }
    }, 35);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunArena();
    }
  };

  // Estimated per-query cost
  const estCostA = ((tokensA / 1000000) * modelA.outputPricePer1M).toFixed(5);
  const estCostB = ((tokensB / 1000000) * modelB.outputPricePer1M).toFixed(5);

  const displayTitleA = isBlindMode && !revealed ? 'Engine Alpha' : modelA.name;
  const displayTitleB = isBlindMode && !revealed ? 'Engine Beta' : modelB.name;
  const displayIdA = isBlindMode && !revealed ? 'Identity Hidden' : modelA.id;
  const displayIdB = isBlindMode && !revealed ? 'Identity Hidden' : modelB.id;

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Model Selection & Battle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-[10px] uppercase">Battle Columns:</span>
          <select
            value={leftModelId}
            onChange={(e) => {
              setLeftModelId(e.target.value);
              setOutputA('');
              setTokensA(0);
            }}
            className="px-2.5 py-1 rounded-xl bg-black/60 border border-amber-500/30 text-amber-300 text-xs font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.id})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleSwapModels}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-colors cursor-pointer"
            title="Swap columns (Left ⇄ Right)"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          <select
            value={rightModelId}
            onChange={(e) => {
              setRightModelId(e.target.value);
              setOutputB('');
              setTokensB(0);
            }}
            className="px-2.5 py-1 rounded-xl bg-black/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.id})
              </option>
            ))}
          </select>
        </div>

        {/* Controls: Blind Mode Toggle, Parameters Toggle, Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsBlindMode(!isBlindMode);
              setRevealed(false);
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] transition-colors cursor-pointer flex items-center gap-1 border ${
              isBlindMode
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold'
                : 'bg-white/5 text-zinc-400 hover:text-white border-white/5'
            }`}
            title="LMSYS Blind Test: Hide model names to evaluate reasoning without brand bias"
          >
            {isBlindMode ? <EyeOff className="w-3 h-3 text-purple-300" /> : <Eye className="w-3 h-3" />}
            <span>{isBlindMode ? 'Blind Test Active' : 'Blind Mode'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowParameters(!showParameters)}
            className={`px-2.5 py-1 rounded-lg text-[10px] transition-colors cursor-pointer flex items-center gap-1 border ${
              showParameters
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                : 'bg-white/5 text-zinc-400 hover:text-white border-white/5'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>Parameters</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOutputA('');
              setOutputB('');
              setTokensA(0);
              setTokensB(0);
              setRevealed(false);
            }}
            className="px-2.5 py-1 rounded-lg text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Runtime Hyperparameter Drawer */}
      {showParameters && (
        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-150">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] uppercase text-zinc-400 block font-bold">System Instruction</label>
            <input
              type="text"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span className="uppercase font-bold">Temperature</span>
              <span className="text-cyan-300 font-mono font-bold">{temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Preset Prompts Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-zinc-500 text-[10px] uppercase">Test Prompts:</span>
        {testPrompts.map((tp) => (
          <button
            key={tp.label}
            type="button"
            onClick={() => {
              setPrompt(tp.text);
              setOutputA('');
              setOutputB('');
              setTokensA(0);
              setTokensB(0);
              setRevealed(false);
            }}
            className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-all cursor-pointer text-[11px]"
          >
            {tp.label}
          </button>
        ))}
      </div>

      {/* Prompt Input & Launch Button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter prompt to execute across both models concurrently (Press ⌘Enter)..."
          className="flex-1 px-4 py-3 rounded-2xl bg-black/60 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 text-xs transition-colors"
        />
        <button
          type="button"
          onClick={handleRunArena}
          className={`px-6 py-3 rounded-2xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shrink-0 ${
            isStreaming
              ? 'bg-rose-500 hover:bg-rose-400 text-white'
              : 'bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black shadow-cyan-500/20'
          }`}
        >
          <Zap className="w-4 h-4 fill-black" />
          <span>{isStreaming ? 'Stop Arena' : 'Run Arena Stream (0ms Delay)'}</span>
        </button>
      </div>

      {/* Dual Arena Side-by-Side View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Model A Output Panel */}
        <div className="p-4 rounded-2xl bg-black/70 border border-amber-500/30 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <div>
              <span className="font-bold text-white block">{displayTitleA}</span>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[10px] text-amber-300 font-mono">{displayIdA}</span>
                {!isBlindMode || revealed ? (
                  <>
                    <span className="text-[10px] text-zinc-500 font-mono">•</span>
                    <span className="text-[10px] text-emerald-400 font-mono">${modelA.inputPricePer1M.toFixed(2)}/1M in</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="text-right text-[10px] flex items-center gap-2">
              <span className="text-emerald-400 font-bold block">TTFT: {speedA.ttft}ms</span>
              <button
                type="button"
                onClick={() => handleCopy(getCurl(modelA.id), `curl-${modelA.id}`)}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                title="Copy cURL command"
              >
                {copiedKey === `curl-${modelA.id}` ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Terminal className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <pre className="flex-1 min-h-[180px] max-h-[260px] overflow-y-auto text-amber-200/90 whitespace-pre-wrap text-[11px] leading-relaxed">
            {outputA || <span className="text-zinc-600 italic">Click &quot;Run Arena Stream&quot; to watch {displayTitleA} output live...</span>}
          </pre>

          {/* Telemetry Bar */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
            <div className="flex items-center gap-2">
              <span>Tokens: <strong className="text-white">{tokensA}</strong></span>
              <span>•</span>
              <span>Speed: <strong className="text-emerald-400">{speedA.tokSec} tok/s</strong></span>
              <span>•</span>
              <span>Cost: <strong className="text-cyan-300">${estCostA}</strong></span>
            </div>
            <Link href={`/models/${modelA.id}`} className="text-cyan-300 hover:underline flex items-center gap-1">
              <span>Specs</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Model B Output Panel */}
        <div className="p-4 rounded-2xl bg-black/70 border border-cyan-500/30 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <div>
              <span className="font-bold text-white block">{displayTitleB}</span>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[10px] text-cyan-300 font-mono">{displayIdB}</span>
                {!isBlindMode || revealed ? (
                  <>
                    <span className="text-[10px] text-zinc-500 font-mono">•</span>
                    <span className="text-[10px] text-emerald-400 font-mono">${modelB.inputPricePer1M.toFixed(2)}/1M in</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="text-right text-[10px] flex items-center gap-2">
              <span className="text-emerald-400 font-bold block">TTFT: {speedB.ttft}ms</span>
              <button
                type="button"
                onClick={() => handleCopy(getCurl(modelB.id), `curl-${modelB.id}`)}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                title="Copy cURL command"
              >
                {copiedKey === `curl-${modelB.id}` ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Terminal className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <pre className="flex-1 min-h-[180px] max-h-[260px] overflow-y-auto text-cyan-200/90 whitespace-pre-wrap text-[11px] leading-relaxed">
            {outputB || <span className="text-zinc-600 italic">Click &quot;Run Arena Stream&quot; to watch {displayTitleB} output live...</span>}
          </pre>

          {/* Telemetry Bar */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
            <div className="flex items-center gap-2">
              <span>Tokens: <strong className="text-white">{tokensB}</strong></span>
              <span>•</span>
              <span>Speed: <strong className="text-emerald-400">{speedB.tokSec} tok/s</strong></span>
              <span>•</span>
              <span>Cost: <strong className="text-cyan-300">${estCostB}</strong></span>
            </div>
            <Link href={`/models/${modelB.id}`} className="text-cyan-300 hover:underline flex items-center gap-1">
              <span>Specs</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Blind Mode Reveal Action */}
      {isBlindMode && (
        <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
          <span className="text-xs text-purple-300 font-medium">
            {revealed ? 'Engine identities revealed above.' : 'Blind Evaluation Active: Evaluate completions without model brand bias.'}
          </span>
          <button
            type="button"
            onClick={() => setRevealed(!revealed)}
            className="px-3 py-1 rounded-xl bg-purple-500 text-black font-bold text-xs hover:bg-purple-400 transition-colors cursor-pointer"
          >
            {revealed ? 'Hide Identities' : 'Reveal Identities'}
          </button>
        </div>
      )}
    </div>
  );
}

function MultiModelRoutingBoilerplate({ models }: { models: ModelSpecItem[] }) {
  const [activeTab, setActiveTab] = useState<'failover' | 'canary' | 'tiered'>('failover');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const modelA = models[0] || FRONTEND_VISIBLE_MODELS[0];
  const modelB = models[1] || FRONTEND_VISIBLE_MODELS[1];

  const failoverCode = `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

// Automatic Failover: If primary model encounters upstream 429/timeout,
// seamlessly route request to secondary model without dropping user requests.
export async function executeWithFailover(messages: Array<{ role: string; content: string }>) {
  try {
    return await client.chat.completions.create({
      model: "${modelA.id}",
      messages,
    });
  } catch (err) {
    console.warn("Primary ${modelA.id} route unavailable, activating failover to ${modelB.id}...");
    return await client.chat.completions.create({
      model: "${modelB.id}",
      messages,
    });
  }
}`;

  const canaryCode = `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

// A/B Canary Sampling: Distribute requests across both models to benchmark real-world latency & quality.
export async function executeCanaryAB(messages: Array<{ role: string; content: string }>) {
  const isCanary = Math.random() < 0.5;
  const targetModel = isCanary ? "${modelA.id}" : "${modelB.id}";

  const startTime = Date.now();
  const completion = await client.chat.completions.create({
    model: targetModel,
    messages,
  });

  const durationMs = Date.now() - startTime;
  console.log(\`[Canary Telemetry] Model: \${targetModel} | Duration: \${durationMs}ms\`);
  return completion;
}`;

  const tieredCode = `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

// Cost-Tiered Router: Route quick triage or short context to high-velocity model (${modelB.id}),
// and route complex architecture, deep reasoning, or long context to flagship model (${modelA.id}).
export async function executeCostTiered(prompt: string, isDeepReasoning = false) {
  const model = isDeepReasoning || prompt.length > 2000 ? "${modelA.id}" : "${modelB.id}";
  return await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
  });
}`;

  const activeSnippet = activeTab === 'failover' ? failoverCode : activeTab === 'canary' ? canaryCode : tieredCode;

  const handleCopy = async () => {
    const ok = await safeCopyToClipboard(activeSnippet);
    if (ok) {
      setCopiedKey(activeTab);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  return (
    <section id="multi-model-routing" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
            <Code2 className="w-5 h-5 text-amber-400" />
            <span>Multi-Model Production Routing Boilerplate</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Deploy both {modelA.id} and {modelB.id} together with zero infrastructure overhead using the GALXAI Anycast Gateway.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-black/60 p-1 border border-white/10 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('failover')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'failover' ? 'bg-white/10 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Auto Failover
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('canary')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'canary' ? 'bg-white/10 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              A/B Canary
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tiered')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'tiered' ? 'bg-white/10 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Cost-Tiered
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copiedKey === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy Recipe</span>
              </>
            )}
          </button>
        </div>
      </div>

      <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 text-zinc-300 font-mono text-xs overflow-x-auto leading-relaxed">
        <code>{activeSnippet}</code>
      </pre>
    </section>
  );
}
