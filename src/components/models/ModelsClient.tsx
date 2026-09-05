'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/ModelCatalog';
import type { ModelSpecItem } from '@/core/contracts/GalxContracts';
import {
  Search,
  Copy,
  Check,
  Zap,
  Rocket,
  ShieldCheck,
  ArrowRight,
  Code2,
  Server,
  LayoutGrid,
  Table as TableIcon,
  Cpu,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  GitCompare,
  X,
  Terminal,
  ExternalLink,
  Eye,
  SlidersHorizontal,
  Star,
  FileCode,
} from 'lucide-react';
import { ReadingProgressBar } from '@/components/common/ReadingProgressBar';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { ShareButton } from '@/components/common/ShareButton';

type ModelCategory = 'all' | 'llm' | 'image' | 'high_context' | 'low_latency' | 'starred';
type ViewMode = 'grid' | 'table';
type CodeLanguage = 'typescript' | 'python' | 'curl';
type SortField = 'id' | 'context' | 'input' | 'output' | 'cached';
type SortDirection = 'asc' | 'desc';

interface ModelCuratedMetadata {
  roleBadge: string;
  speedTier: string;
  bestFor: string[];
  cacheDiscountPercent?: number;
}

const MODEL_METADATA: Record<string, ModelCuratedMetadata> = {
  'gpt-5.6-sol': {
    roleBadge: 'Flagship Reasoning & Architecture',
    speedTier: 'Comprehensive Reasoning',
    bestFor: [
      'Multi-file codebase refactoring',
      'Complex algorithmic design & math',
      'Deep system architecture planning',
    ],
    cacheDiscountPercent: 90,
  },
  'gpt-5.6-terra': {
    roleBadge: 'Balanced Agentic Workhorse',
    speedTier: 'Balanced & High Throughput (~250ms)',
    bestFor: [
      'Daily agentic development loops',
      'Automated test generation & CI/CD',
      'Full-stack feature implementation',
    ],
    cacheDiscountPercent: 90,
  },
  'gpt-5.6-luna': {
    roleBadge: 'Ultra-Low Latency & High Velocity',
    speedTier: 'Sub-Second Real-Time (~65ms)',
    bestFor: [
      'Real-time IDE autocomplete',
      'Instant-response streaming chat',
      'High-frequency triage & classification',
    ],
    cacheDiscountPercent: 90,
  },
  'openai-gpt-image-2': {
    roleBadge: 'Ultra 4K SOTA Visual Studio',
    speedTier: '4K Native Synthesis',
    bestFor: [
      'Commercial advertising & visual assets',
      'Complex typography & textual layout',
      'High-dynamic-range layered composition',
    ],
  },
  'openai-gpt-image-1.5': {
    roleBadge: 'Photoreal Shaders & Texture',
    speedTier: 'High-Fidelity Photoreal',
    bestFor: [
      'Photorealistic scenes & environments',
      'Physically accurate studio lighting',
      'Micro-texture & material rendering',
    ],
  },
  'openai-gpt-image-1': {
    roleBadge: 'Fast Iterative Prototyping',
    speedTier: 'Rapid Iteration',
    bestFor: [
      'Rapid concept sketching & mockups',
      'Low-latency graphic generation',
      'High-volume exploratory drafts',
    ],
  },
};

const CODE_EXAMPLES: Record<CodeLanguage, { label: string; code: string }> = {
  typescript: {
    label: 'TypeScript (Node.js)',
    code: `import OpenAI from 'openai';

// Point official OpenAI client to GALXAI Anycast Gateway
const openai = new OpenAI({
  baseURL: 'https://api.galx.ai/v1',
  apiKey: process.env.GALXAI_API_KEY,
});

const response = await openai.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [
    { role: 'system', content: 'You are an expert systems architect.' },
    { role: 'user', content: 'Refactor this concurrent cache pool for zero drops.' },
  ],
});

console.log(response.choices[0].message.content);`,
  },
  python: {
    label: 'Python',
    code: `from openai import OpenAI
import os

# Standard OpenAI SDK with GALXAI baseURL
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key=os.environ.get("GALXAI_API_KEY")
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[
        {"role": "system", "content": "You are an expert systems architect."},
        {"role": "user", "content": "Refactor this concurrent cache pool for zero drops."}
    ]
)

print(response.choices[0].message.content)`,
  },
  curl: {
    label: 'cURL',
    code: `curl https://api.galx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $GALXAI_API_KEY" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [
      {"role": "user", "content": "Refactor this concurrent cache pool for zero drops."}
    ]
  }'`,
  },
};

export function ModelsClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ModelCategory>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedLanguage, setSelectedLanguage] = useState<CodeLanguage>('typescript');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedCodeModelId, setExpandedCodeModelId] = useState<string | null>(null);

  // Sorting state for table view
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  // Multi-model compare selection state
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  // Starred / Pinned models (GitHub Star / AWS Console Pin pattern)
  const [starredIds, setStarredIds] = useState<string[]>([]);

  // Keyboard navigation focus index (Linear / Superhuman pattern)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Inspect drawer state (Slide-over)
  const [inspectedModel, setInspectedModel] = useState<ModelSpecItem | null>(null);
  const [drawerCodeTab, setDrawerCodeTab] = useState<'curl' | 'python' | 'ts'>('curl');

  // Search input ref for keyboard shortcut '/'
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load starred models from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('galx_starred_models');
      if (stored) {
        setStarredIds(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleStar = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setStarredIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('galx_starred_models', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Deep linking: read search params on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const cat = params.get('category') as ModelCategory | null;
    const view = params.get('view') as ViewMode | null;

    if (q) setSearchQuery(q);
    if (cat && ['all', 'llm', 'image', 'high_context', 'low_latency', 'starred'].includes(cat)) {
      setActiveCategory(cat);
    }
    if (view && ['grid', 'table'].includes(view)) {
      setViewMode(view);
    }
  }, []);

  // Sync state to URL search params
  const updateUrlState = (q: string, cat: ModelCategory, view: ViewMode) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');

    if (cat !== 'all') url.searchParams.set('category', cat);
    else url.searchParams.delete('category');

    if (view !== 'grid') url.searchParams.set('view', view);
    else url.searchParams.delete('view');

    window.history.replaceState({}, '', url.toString());
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    updateUrlState(val, activeCategory, viewMode);
  };

  const handleCategoryChange = (cat: ModelCategory) => {
    setActiveCategory(cat);
    updateUrlState(searchQuery, cat, viewMode);
  };

  const handleViewChange = (view: ViewMode) => {
    setViewMode(view);
    updateUrlState(searchQuery, activeCategory, view);
  };

  const handleCopy = async (text: string, identifier: string) => {
    const success = await safeCopyToClipboard(text);
    if (success) {
      setCopiedKey(identifier);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === identifier ? null : prev));
      }, 2000);
    }
  };

  const handleToggleCompare = (id: string) => {
    setCompareSelection((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const getModelCurl = (model: ModelSpecItem) => {
    if (model.category === 'image') {
      return `curl https://api.galx.ai/v1/images/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $GALXAI_API_KEY" \\
  -d '{"model": "${model.id}", "prompt": "Architectural edge gateway layout", "size": "1024x1024"}'`;
    }
    return `curl https://api.galx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $GALXAI_API_KEY" \\
  -d '{"model": "${model.id}", "messages": [{"role": "user", "content": "Hello from Anycast gateway"}]}'`;
  };

  const getModelPython = (model: ModelSpecItem) => {
    if (model.category === 'image') {
      return `from openai import OpenAI

client = OpenAI(base_url="https://api.galx.ai/v1", api_key="galx_live_your_key")
res = client.images.generate(model="${model.id}", prompt="Modern UI interface", size="1024x1024")
print(res.data[0].url)`;
    }
    return `from openai import OpenAI

client = OpenAI(base_url="https://api.galx.ai/v1", api_key="galx_live_your_key")
res = client.chat.completions.create(model="${model.id}", messages=[{"role": "user", "content": "Hello"}])
print(res.choices[0].message.content)`;
  };

  const getModelTs = (model: ModelSpecItem) => {
    if (model.category === 'image') {
      return `import OpenAI from "openai";

const client = new OpenAI({ baseURL: "https://api.galx.ai/v1", apiKey: process.env.GALXAI_API_KEY });
const res = await client.images.generate({ model: "${model.id}", prompt: "Modern UI interface", size: "1024x1024" });
console.log(res.data[0].url);`;
    }
    return `import OpenAI from "openai";

const client = new OpenAI({ baseURL: "https://api.galx.ai/v1", apiKey: process.env.GALXAI_API_KEY });
const res = await client.chat.completions.create({ model: "${model.id}", messages: [{ role: "user", content: "Hello" }] });
console.log(res.choices[0].message.content);`;
  };

  const filteredModels = useMemo(() => {
    const list = FRONTEND_VISIBLE_MODELS.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        (m.supportsReasoning && 'reasoning'.includes(q)) ||
        (m.supportsVision && 'vision'.includes(q)) ||
        MODEL_METADATA[m.id]?.bestFor.some((b) => b.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (activeCategory === 'all') return true;
      if (activeCategory === 'starred') return starredIds.includes(m.id);
      if (activeCategory === 'llm') return m.category === 'llm';
      if (activeCategory === 'image') return m.category === 'image';
      if (activeCategory === 'high_context') return m.contextWindowTokens >= 500000;
      if (activeCategory === 'low_latency') return m.id.includes('luna') || m.id.includes('image-1');
      return true;
    });

    return [...list].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'id':
          comparison = a.id.localeCompare(b.id);
          break;
        case 'context':
          comparison = a.contextWindowTokens - b.contextWindowTokens;
          break;
        case 'input':
          comparison = a.inputPricePer1M - b.inputPricePer1M;
          break;
        case 'output':
          comparison = a.outputPricePer1M - b.outputPricePer1M;
          break;
        case 'cached':
          comparison = (a.cachedInputPricePer1M ?? 0) - (b.cachedInputPricePer1M ?? 0);
          break;
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [searchQuery, activeCategory, sortField, sortDir, starredIds]);

  // Global keyboard shortcuts: '/' to focus search, 'Escape' to clear/close, j/k/Enter/c/s navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT';

      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === 'Escape') {
        if (inspectedModel) {
          setInspectedModel(null);
        } else if (searchQuery) {
          setSearchQuery('');
          searchInputRef.current?.blur();
        } else if (compareSelection.length > 0) {
          setCompareSelection([]);
        } else if (focusedIndex !== null) {
          setFocusedIndex(null);
        }
        return;
      }

      if (!isInputFocused && !inspectedModel) {
        if (e.key === 'j' || e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedIndex((prev) => (prev === null || prev >= filteredModels.length - 1 ? 0 : prev + 1));
        } else if (e.key === 'k' || e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedIndex((prev) => (prev === null || prev <= 0 ? filteredModels.length - 1 : prev - 1));
        } else if (e.key === 'Enter' && focusedIndex !== null && filteredModels[focusedIndex]) {
          e.preventDefault();
          setInspectedModel(filteredModels[focusedIndex]);
        } else if (e.key === 'c' && focusedIndex !== null && filteredModels[focusedIndex]) {
          e.preventDefault();
          handleToggleCompare(filteredModels[focusedIndex].id);
        } else if (e.key === 's' && focusedIndex !== null && filteredModels[focusedIndex]) {
          e.preventDefault();
          toggleStar(filteredModels[focusedIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectedModel, searchQuery, compareSelection, focusedIndex, filteredModels]);

  // Generate OpenAI /v1/models JSON Catalog Format
  const generateOpenAiCatalogJson = () => {
    const payload = {
      object: 'list',
      data: FRONTEND_VISIBLE_MODELS.map((m) => ({
        id: m.id,
        object: 'model',
        created: 1725540000,
        owned_by: m.provider,
        permission: [],
        root: m.id,
        parent: null,
        context_window: m.contextWindowTokens,
        max_output_tokens: m.maxOutputTokens,
        pricing: {
          input_per_1m: m.inputPricePer1M,
          output_per_1m: m.outputPricePer1M,
          cached_input_per_1m: m.cachedInputPricePer1M ?? null,
        },
      })),
    };
    return JSON.stringify(payload, null, 2);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07080d] text-zinc-100">
      <ReadingProgressBar />
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs items={[{ label: 'Frontier Models & Pricing' }]} />

        {/* ========================================================================= */}
        {/* 1. HERO: SERVICE IDENTITY + STRIPE-STYLE DROP-IN CODE DEMO                */}
        {/* ========================================================================= */}
        <header className="glass-panel rounded-3xl p-6 sm:p-10 border border-white/10 bg-gradient-to-b from-[#0e1322] via-[#090c16] to-[#07080d] relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left Column: What is GALXAI & Why care */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                <Server className="w-3.5 h-3.5" />
                <span>OPENAI-COMPATIBLE ROUTER &amp; GATEWAY</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
                Frontier Model Catalog
              </h1>

              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-xl">
                Direct, low-latency API access to modern reasoning, coding, and visual synthesis models.
                Point your existing OpenAI SDK to our Anycast gateway to unlock automatic prompt caching,
                rate-limit pooling, and multi-region failover with zero code rewrites.
              </p>

              {/* Endpoint Pill */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-xs font-mono">
                  <span className="text-zinc-400">Base URL:</span>
                  <span className="text-cyan-300 font-bold">https://api.galx.ai/v1</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('https://api.galx.ai/v1', 'base-url')}
                    title="Copy Base URL"
                    className="ml-1 p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedKey === 'base-url' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <Link
                  href="/models/resolver"
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1.5 transition-colors"
                >
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>0ms Alias Resolver</span>
                </Link>

                <button
                  type="button"
                  onClick={() => handleCopy(generateOpenAiCatalogJson(), 'export-catalog-json')}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy standard OpenAI /v1/models JSON catalog response"
                >
                  {copiedKey === 'export-catalog-json' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Catalog JSON Copied</span>
                    </>
                  ) : (
                    <>
                      <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Export Models JSON</span>
                    </>
                  )}
                </button>

                <ShareButton
                  variant="pill"
                  label="Share Catalog"
                  title="GALXAI Model Catalog & API Specifications"
                  description="Explore frontier models including GPT-5.6 Sol, Terra, and Luna with automatic prompt caching."
                />
              </div>

              {/* Technical Value Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] font-mono text-zinc-400">
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/5 border border-white/5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>100% OpenAI SDK</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/5 border border-white/5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>90% Prompt Cache</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/5 border border-white/5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Zero Data Retention</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/5 border border-white/5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>&lt;15ms Anycast</span>
                </div>
              </div>
            </div>

            {/* Right Column: Drop-in Code Snippet (Stripe / Resend pattern) */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-black/80 border border-white/15 overflow-hidden shadow-2xl">
                {/* Code Window Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 font-mono text-[11px] text-zinc-400">Quickstart Integration</span>
                  </div>

                  {/* Language Selector */}
                  <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10 font-mono text-[10px]">
                    {(['typescript', 'python', 'curl'] as CodeLanguage[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setSelectedLanguage(lang)}
                        className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                          selectedLanguage === lang
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {lang === 'typescript' ? 'TS' : lang === 'python' ? 'Python' : 'cURL'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Code Body */}
                <div className="p-4 relative">
                  <button
                    type="button"
                    onClick={() => handleCopy(CODE_EXAMPLES[selectedLanguage].code, `hero-code-${selectedLanguage}`)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy code snippet"
                  >
                    {copiedKey === `hero-code-${selectedLanguage}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <pre className="text-[11px] font-mono leading-relaxed text-zinc-300 overflow-x-auto pr-8">
                    <code>{CODE_EXAMPLES[selectedLanguage].code}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. CONTROLS BAR: SEARCH + CAPABILITY TABS + VIEW TOGGLE                   */}
        {/* ========================================================================= */}
        <section
          aria-label="Model filters and layout controls"
          className="glass-panel rounded-2xl p-3.5 sm:p-4 border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4"
        >
          {/* Search Bar with Keyboard Shortcut Hint */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search models, capabilities (e.g. reasoning, vision, sol)..."
              className="w-full pl-10 pr-16 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="text-[10px] text-zinc-400 hover:text-white font-mono cursor-pointer"
                >
                  Clear
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-zinc-400 font-mono border border-white/10">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Category Tabs & View Switcher */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-3">
            {/* Category Filter */}
            <div
              role="tablist"
              aria-label="Model categories"
              className="flex items-center gap-1 p-1 rounded-xl bg-black/50 border border-white/10 text-xs font-semibold overflow-x-auto"
            >
              {[
                { id: 'all' as ModelCategory, label: 'All Models' },
                ...(starredIds.length > 0 ? [{ id: 'starred' as ModelCategory, label: '⭐ Starred' }] : []),
                { id: 'llm' as ModelCategory, label: 'Reasoning & Code' },
                { id: 'image' as ModelCategory, label: 'Visual Synthesis' },
                { id: 'high_context' as ModelCategory, label: '500K+ Context' },
                { id: 'low_latency' as ModelCategory, label: 'High Velocity' },
              ].map((tab) => {
                const count =
                  tab.id === 'all'
                    ? FRONTEND_VISIBLE_MODELS.length
                    : tab.id === 'starred'
                    ? FRONTEND_VISIBLE_MODELS.filter((m) => starredIds.includes(m.id)).length
                    : tab.id === 'llm'
                    ? FRONTEND_VISIBLE_MODELS.filter((m) => m.category === 'llm').length
                    : tab.id === 'image'
                    ? FRONTEND_VISIBLE_MODELS.filter((m) => m.category === 'image').length
                    : tab.id === 'high_context'
                    ? FRONTEND_VISIBLE_MODELS.filter((m) => m.contextWindowTokens >= 500000).length
                    : FRONTEND_VISIBLE_MODELS.filter((m) => m.id.includes('luna') || m.id.includes('image-1')).length;
                const isSelected = activeCategory === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`cat-tab-${tab.id}`}
                    aria-selected={isSelected}
                    onClick={() => handleCategoryChange(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {tab.label} <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* View Mode Toggle: Cards vs Table */}
            <div
              role="group"
              aria-label="View mode toggle"
              className="flex items-center gap-1 p-1 rounded-xl bg-black/50 border border-white/10 text-xs"
            >
              <button
                type="button"
                onClick={() => handleViewChange('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>

              <button
                type="button"
                onClick={() => handleViewChange('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Comparison Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          </div>
        </section>

        {/* Keyboard Ergonomics Shortcuts Bar (Linear / GitHub Pattern) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-zinc-500 uppercase text-[10px]">Shortcuts:</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-zinc-300 border border-white/10">j</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-zinc-300 border border-white/10">k</kbd>
              <span>navigate</span>
            </span>
            <span className="text-zinc-600">·</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-zinc-300 border border-white/10">Enter</kbd>
              <span>inspect</span>
            </span>
            <span className="text-zinc-600">·</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-zinc-300 border border-white/10">c</kbd>
              <span>compare</span>
            </span>
            <span className="text-zinc-600">·</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-zinc-300 border border-white/10">s</kbd>
              <span>star</span>
            </span>
            <span className="text-zinc-600">·</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-zinc-300 border border-white/10">/</kbd>
              <span>search</span>
            </span>
          </div>

          {starredIds.length > 0 && (
            <span className="text-amber-400/90 flex items-center gap-1 text-[11px]">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{starredIds.length} model{starredIds.length > 1 ? 's' : ''} pinned</span>
            </span>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. MODEL PRESENTATION: CARDS VIEW (Together AI / OpenRouter Style)        */}
        {/* ========================================================================= */}
        {viewMode === 'grid' && (
          <div
            id="model-grid"
            role="region"
            aria-label="Model catalog cards"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredModels.map((model, idx) => {
              const meta = MODEL_METADATA[model.id];
              const isImage = model.category === 'image';
              const detailHref = `/models/${model.id.replace('/', '-')}`;
              const isCodeExpanded = expandedCodeModelId === model.id;
              const isSelectedForCompare = compareSelection.includes(model.id);
              const isStarred = starredIds.includes(model.id);
              const isFocused = focusedIndex === idx;

              const cardSnippet = isImage
                ? `const res = await openai.images.generate({
  model: '${model.id}',
  prompt: 'High fidelity UI layout mockup',
  size: '1024x1024',
});`
                : `const res = await openai.chat.completions.create({
  model: '${model.id}',
  messages: [{ role: 'user', content: 'Refactor this algorithm...' }],
});`;

              return (
                <article
                  key={model.id}
                  className={`glass-card rounded-3xl p-6 border bg-gradient-to-b from-white/[0.04] to-transparent flex flex-col justify-between group transition-all duration-200 shadow-lg relative ${
                    isFocused
                      ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-500/10'
                      : isSelectedForCompare
                      ? 'border-cyan-500/60 ring-1 ring-cyan-500/30'
                      : 'border-white/10 hover:border-cyan-500/40'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Card Header: Model ID + 1-Click Copy + Role Badge */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                              isImage
                                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                            }`}
                          >
                            {isImage ? <Rocket className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-zinc-400 uppercase block tracking-wider">
                              {model.provider === 'openai' ? 'OpenAI Codex' : 'Frontier Engine'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={detailHref}
                                className="font-mono font-bold text-white text-base group-hover:text-cyan-300 transition-colors"
                              >
                                {model.id}
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleCopy(model.id, `model-id-${model.id}`)}
                                title={`Copy ${model.id} model ID`}
                                className="p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              >
                                {copiedKey === `model-id-${model.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Top Micro-Actions: Star, cURL & Compare */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => toggleStar(model.id, e)}
                            title={isStarred ? `Unpin ${model.id}` : `Pin ${model.id} to Starred`}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isStarred
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                : 'bg-white/5 border-white/5 text-zinc-400 hover:text-amber-300'
                            }`}
                          >
                            <Star className={`w-3 h-3 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopy(getModelCurl(model), `curl-${model.id}`)}
                            title="Copy 1-line cURL command"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copiedKey === `curl-${model.id}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-300 font-bold">cURL</span>
                              </>
                            ) : (
                              <>
                                <Terminal className="w-3 h-3" />
                                <span>cURL</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleCompare(model.id)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-all cursor-pointer flex items-center gap-1 ${
                              isSelectedForCompare
                                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold'
                                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                            }`}
                          >
                            <GitCompare className="w-3 h-3" />
                            <span>{isSelectedForCompare ? 'Selected' : 'Compare'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Curated Role Badge */}
                      {meta && (
                        <div className="text-[11px] font-mono text-cyan-300/90 font-medium">
                          {meta.roleBadge}
                        </div>
                      )}
                    </div>

                    {/* Model Description */}
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {model.description}
                    </p>

                    {/* Best-For Tags (Clear use-cases) */}
                    {meta?.bestFor && meta.bestFor.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">
                          Best Suited For:
                        </span>
                        <ul className="space-y-1 text-[11px] text-zinc-400">
                          {meta.bestFor.map((item, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-cyan-400/80 leading-none mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Architectural Specifications Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-mono">
                      {!isImage && (
                        <>
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">
                            Context: {(model.contextWindowTokens / 1000).toLocaleString()}K
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">
                            Max Out: {(model.maxOutputTokens / 1000).toLocaleString()}K
                          </span>
                          {model.supportsReasoning && (
                            <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                              Reasoning
                            </span>
                          )}
                          {model.supportsVision && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                              Vision
                            </span>
                          )}
                        </>
                      )}
                      {isImage && (
                        <>
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300">
                            {meta?.speedTier || 'Visual Synthesis'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">
                            Square &amp; Wide Ratios
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Pricing Matrix & Card Footer */}
                  <div className="pt-4 mt-4 border-t border-white/10 space-y-3">
                    {/* Transparent Token Rates */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                        <span className="text-zinc-500 block text-[10px] uppercase">
                          {isImage ? 'Standard Rate' : 'Input / 1M'}
                        </span>
                        <span className="text-white font-bold text-xs">
                          ${model.inputPricePer1M.toFixed(isImage ? 3 : 2)}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                        <span className="text-zinc-500 block text-[10px] uppercase">
                          {isImage ? 'Resolution' : 'Output / 1M'}
                        </span>
                        <span className="text-white font-bold text-xs">
                          {isImage ? '1024x1024' : `$${model.outputPricePer1M.toFixed(2)}`}
                        </span>
                      </div>
                    </div>

                    {/* Cached Input Strip (Prompt Caching Rebate) */}
                    {model.cachedInputPricePer1M !== undefined && (
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[11px] font-mono">
                        <div className="flex items-center gap-1.5 text-emerald-300">
                          <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                          <span>Cached Input / 1M</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400 font-bold">
                            ${model.cachedInputPricePer1M.toFixed(2)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                            -90%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Inline Quick Code Toggle */}
                    {isCodeExpanded && (
                      <div className="p-3 rounded-xl bg-black/80 border border-white/15 space-y-2 text-xs font-mono animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400">
                          <span>Usage Example</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(cardSnippet, `card-snippet-${model.id}`)}
                            className="text-cyan-300 hover:text-cyan-200 cursor-pointer"
                          >
                            {copiedKey === `card-snippet-${model.id}` ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <pre className="text-[10px] text-zinc-300 leading-relaxed overflow-x-auto">
                          <code>{cardSnippet}</code>
                        </pre>
                      </div>
                    )}

                    {/* Card Actions: Quick Code + Inspect + Detailed Specs */}
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedCodeModelId(isCodeExpanded ? null : model.id)}
                          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-mono transition-colors cursor-pointer"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>{isCodeExpanded ? 'Hide' : 'Code'}</span>
                          {isCodeExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setInspectedModel(model)}
                          className="text-xs text-zinc-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </div>

                      <Link
                        href={detailHref}
                        className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all border border-white/5 cursor-pointer"
                      >
                        <span>Detailed Specs</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. MODEL PRESENTATION: DENSE COMPARISON TABLE VIEW (OpenRouter Style)     */}
        {/* ========================================================================= */}
        {viewMode === 'table' && (
          <div className="glass-panel rounded-3xl p-6 border border-white/10 overflow-x-auto shadow-xl">
            <div className="min-w-[900px] space-y-4">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono pb-2 border-b border-white/10">
                <span>Model Architecture &amp; Pricing Matrix (Click column headers to sort)</span>
                <span>Automatic 75%–90% Prompt Caching Active</span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px] font-mono select-none">
                    <th className="py-3 px-3 w-10 text-center">Compare</th>
                    <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('id')}>
                      <div className="flex items-center gap-1">
                        <span>Model ID</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3">Role / Workload</th>
                    <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('context')}>
                      <div className="flex items-center gap-1">
                        <span>Context Window</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('input')}>
                      <div className="flex items-center gap-1">
                        <span>Input / 1M</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('output')}>
                      <div className="flex items-center gap-1">
                        <span>Output / 1M</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('cached')}>
                      <div className="flex items-center gap-1">
                        <span>Cached / 1M</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-xs">
                  {filteredModels.map((m, idx) => {
                    const meta = MODEL_METADATA[m.id];
                    const isImage = m.category === 'image';
                    const detailHref = `/models/${m.id.replace('/', '-')}`;
                    const isSelected = compareSelection.includes(m.id);
                    const isStarred = starredIds.includes(m.id);
                    const isFocused = focusedIndex === idx;

                    return (
                      <tr
                        key={m.id}
                        className={`hover:bg-white/[0.02] transition-colors ${
                          isFocused ? 'bg-cyan-500/[0.08]' : ''
                        }`}
                      >
                        {/* Compare & Star Checkbox */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => toggleStar(m.id, e)}
                              title={isStarred ? `Unstar ${m.id}` : `Star ${m.id}`}
                              className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer text-zinc-400"
                            >
                              <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : 'hover:text-amber-300'}`} />
                            </button>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleCompare(m.id)}
                              className="rounded border-white/20 bg-black/50 text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                          </div>
                        </td>

                        {/* Model ID + Copy */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{m.id}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(m.id, `table-id-${m.id}`)}
                              title="Copy Model ID"
                              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedKey === `table-id-${m.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(getModelCurl(m), `table-curl-${m.id}`)}
                              title="Copy cURL Command"
                              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer text-[10px]"
                            >
                              {copiedKey === `table-curl-${m.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Terminal className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Role / Workload */}
                        <td className="py-3 px-3 font-sans text-zinc-300">
                          <span className="block font-medium">{meta?.roleBadge || m.name}</span>
                        </td>

                        {/* Context Window */}
                        <td className="py-3 px-3 text-cyan-300">
                          {isImage ? '128K' : `${(m.contextWindowTokens / 1000).toLocaleString()}K tokens`}
                        </td>

                        {/* Input Price */}
                        <td className="py-3 px-3 text-white font-bold">
                          ${m.inputPricePer1M.toFixed(isImage ? 3 : 2)}
                        </td>

                        {/* Output Price */}
                        <td className="py-3 px-3 text-white font-bold">
                          {isImage ? '1024x1024' : `$${m.outputPricePer1M.toFixed(2)}`}
                        </td>

                        {/* Cached Price */}
                        <td className="py-3 px-3">
                          {m.cachedInputPricePer1M !== undefined ? (
                            <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                              <span>${m.cachedInputPricePer1M.toFixed(2)}</span>
                              <span className="text-[10px] px-1 rounded bg-emerald-500/20 text-emerald-400">
                                -90%
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setInspectedModel(m)}
                              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white text-xs transition-colors font-sans cursor-pointer"
                            >
                              Inspect
                            </button>
                            <Link
                              href={detailHref}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs transition-colors font-sans cursor-pointer border border-cyan-500/30"
                            >
                              <span>Specs</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State with Intelligent Resolution Suggestion */}
        {filteredModels.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">No frontier models match &ldquo;{searchQuery}&rdquo;</h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                If you are looking for a shorthand alias (e.g. <strong className="text-white">sol</strong>, <strong className="text-white">claude</strong>, <strong className="text-white">deepseek</strong>, or <strong className="text-white">dalle</strong>), test the 0ms Universal Alias Resolver to map it directly to our Anycast gateway.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/models/resolver"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold font-mono flex items-center gap-1.5 shadow-md transition-all"
              >
                <Cpu className="w-3.5 h-3.5 fill-black" />
                <span>Open 0ms Alias Resolver</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                  updateUrlState('', 'all', viewMode);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}

        {/* Floating Multi-Model Compare Dock (when 2+ models selected) */}
        {compareSelection.length >= 2 && (
          <aside
            aria-label="Model comparison selection"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-black/90 border border-cyan-500/50 shadow-2xl backdrop-blur-xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-3 duration-200"
          >
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="text-xs font-mono text-zinc-200">
                <span>Compare: </span>
                <span className="text-cyan-300 font-bold">{compareSelection.join(' vs ')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/models/compare?ids=${compareSelection.join(',')}`}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
              >
                <span>Launch Matrix</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => setCompareSelection([])}
                className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Clear comparison selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </aside>
        )}

        {/* Quick Inspect Slide-Over Drawer (Stripe / AWS Bedrock Pattern) */}
        {inspectedModel && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-150">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
              onClick={() => setInspectedModel(null)}
            />

            {/* Drawer Content */}
            <div className="relative w-full max-w-lg bg-[#0c0e17] border-l border-white/10 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto space-y-6 shadow-2xl z-10">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-white/10 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                        {inspectedModel.provider.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border bg-white/5 border-white/10 text-cyan-300">
                        {inspectedModel.category === 'image' ? 'Visual Synthesis' : 'Reasoning & LLM'}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white font-mono">{inspectedModel.id}</h2>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">{inspectedModel.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInspectedModel(null)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Close drawer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 1-Click Copy Chips */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => handleCopy(inspectedModel.id, 'drawer-id')}
                    className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'drawer-id' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">ID Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{inspectedModel.id}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy('https://api.galx.ai/v1', 'drawer-base')}
                    className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'drawer-base' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Base URL Copied</span>
                      </>
                    ) : (
                      <>
                        <Server className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-cyan-300">https://api.galx.ai/v1</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Specifications Grid */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Context Capacity</span>
                    <span className="text-cyan-300 font-bold">
                      {inspectedModel.category === 'image'
                        ? '128K tokens'
                        : `${(inspectedModel.contextWindowTokens / 1000).toLocaleString()}K tokens`}
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Max Output</span>
                    <span className="text-amber-300 font-bold">
                      {inspectedModel.category === 'image'
                        ? '4K tokens'
                        : `${(inspectedModel.maxOutputTokens / 1000).toLocaleString()}K tokens`}
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">
                      {inspectedModel.category === 'image' ? 'Image Rate' : 'Input Rate / 1M'}
                    </span>
                    <span className="text-white font-bold">
                      ${inspectedModel.inputPricePer1M.toFixed(inspectedModel.category === 'image' ? 3 : 2)}
                    </span>
                  </div>

                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">
                      {inspectedModel.category === 'image' ? 'Resolution' : 'Output Rate / 1M'}
                    </span>
                    <span className="text-white font-bold">
                      {inspectedModel.category === 'image' ? '1024x1024' : `$${inspectedModel.outputPricePer1M.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {/* Prompt Cache Strip */}
                {inspectedModel.cachedInputPricePer1M !== undefined && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                      <span>RAM Cached Input / 1M</span>
                    </span>
                    <span className="text-emerald-400 font-bold">
                      ${inspectedModel.cachedInputPricePer1M.toFixed(2)} (-90%)
                    </span>
                  </div>
                )}

                {/* Live Code Request Preview */}
                <div className="rounded-2xl bg-black/70 border border-white/10 overflow-hidden space-y-0">
                  <div className="flex items-center justify-between px-3.5 py-2 bg-white/5 border-b border-white/10 text-xs font-mono">
                    <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10 text-[10px]">
                      {(['curl', 'python', 'ts'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setDrawerCodeTab(tab)}
                          className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                            drawerCodeTab === tab
                              ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {tab === 'curl' ? 'cURL' : tab === 'python' ? 'Python' : 'TS'}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const snippet =
                          drawerCodeTab === 'curl'
                            ? getModelCurl(inspectedModel)
                            : drawerCodeTab === 'python'
                            ? getModelPython(inspectedModel)
                            : getModelTs(inspectedModel);
                        handleCopy(snippet, 'drawer-code-copy');
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy snippet"
                    >
                      {copiedKey === 'drawer-code-copy' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="p-3.5">
                    <pre className="text-[11px] font-mono text-zinc-300 leading-relaxed overflow-x-auto">
                      <code>
                        {drawerCodeTab === 'curl'
                          ? getModelCurl(inspectedModel)
                          : drawerCodeTab === 'python'
                          ? getModelPython(inspectedModel)
                          : getModelTs(inspectedModel)}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Drawer Actions */}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <Link
                  href={`/models/${inspectedModel.id.replace('/', '-')}`}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition-colors shadow-md"
                >
                  <span>Open Full Specifications</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleCompare(inspectedModel.id);
                    }}
                    className="py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors flex items-center justify-center gap-1"
                  >
                    <GitCompare className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{compareSelection.includes(inspectedModel.id) ? 'Selected' : 'Compare'}</span>
                  </button>

                  <Link
                    href="/keys/new"
                    className="py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors flex items-center justify-center gap-1"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Create Key</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. ARCHITECTURAL PILLARS (Cloudflare / Groq High-Trust Pattern)            */}
        {/* ========================================================================= */}
        <section aria-labelledby="architecture-heading" className="space-y-4 pt-4">
          <div className="space-y-1">
            <h2 id="architecture-heading" className="text-xl font-bold text-white tracking-tight">
              Gateway Architecture &amp; Guarantees
            </h2>
            <p className="text-xs text-zinc-400">
              Enterprise routing infrastructure designed for mission-critical agent loops and automated workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Code2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">100% Drop-in SDK Compatibility</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Seamless compatibility with official OpenAI SDKs, LangChain, LlamaIndex, Cursor, and Windsurf by changing only your baseURL.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Automatic Prompt Caching</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                System prompts and long codebases qualify automatically for up to 90% input discounts on recurring requests without custom code.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Zero Data Retention (ZDR)</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Prompts, completions, and image assets transit through encrypted memory and are never persisted to disk or used for training.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                <Server className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Multi-Region Edge Failover</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Sub-15ms Anycast routing with real-time health checks automatically bypasses upstream provider 429 stalls and regional outages.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. CALM DEVELOPER ONBOARDING FOOTER (Stripe-Style Clean Callout)          */}
        {/* ========================================================================= */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 bg-gradient-to-r from-black/60 to-zinc-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <h3 className="text-lg font-bold text-white">Ready to connect to frontier models?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Create an API key in under 30 seconds. Deposit exactly what you need with prepaid metering and zero overdraft risk.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/docs/quickstart"
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-colors border border-white/10 cursor-pointer"
            >
              Read Quickstart
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
              Side-by-Side Matrix
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
