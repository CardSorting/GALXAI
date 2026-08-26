import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Wrench,
  Calculator,
  Zap,
  Cpu,
  Layers,
  FileCode,
  Sparkles,
  Search,
  DollarSign,
  Key,
  Database,
  Terminal,
  Activity,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
} from 'lucide-react';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTopicHubGraph } from '@/lib/seo/jsonld';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

export const metadata: Metadata = constructMetadata({
  title: 'Interactive AI Developer Tools & Calculators',
  description:
    '13 free interactive developer tools for AI token optimization: ROI calculator, token streaming benchmark, BPE token counter, 1M context visualizer, prompt compressor, and wholesale cost comparator.',
  canonicalPath: '/tools',
  keywords: [
    'AI Developer Tools',
    'LLM Calculator',
    'OpenAI Token Counter',
    'Prompt Caching Calculator',
    'AI Streaming Benchmark',
    '1M Context Visualizer',
    'Model Cost Comparator',
    'AI Latency Estimator',
    'Prompt Compressor',
  ],
});

interface ToolItem {
  id: string;
  title: string;
  category: 'Economics' | 'Performance' | 'Engineering' | 'Diagnostics';
  description: string;
  iconName: string;
  href: string;
  badge: string;
  primaryMetric: string;
}

const TOOLS_CATALOG: ToolItem[] = [
  {
    id: 'roi-calculator',
    title: 'Enterprise ROI & Token Budget Calculator',
    category: 'Economics',
    description: 'Model DAU scale, 75% prompt caching arbitrage, and wholesale compute savings with CSV/JSON export.',
    iconName: 'Calculator',
    href: '/tools/roi-calculator',
    badge: 'Budget Modeling',
    primaryMetric: '25%–40% Net Savings',
  },
  {
    id: 'stream-benchmark',
    title: 'Token Streaming & Velocity Simulator',
    category: 'Performance',
    description: 'Real-time Server-Sent Events (SSE) token generation velocity and TTFT simulator across OpenAI frontier models.',
    iconName: 'Zap',
    href: '/tools/stream-benchmark',
    badge: 'Real-Time SSE',
    primaryMetric: '142 tok/sec Luna',
  },
  {
    id: 'context-window-visualizer',
    title: '1,000,000 Context Window Visualizer',
    category: 'Engineering',
    description: 'Simulate document capacities, code AST line volumes, and prompt caching breakpoints up to 1,000,000 tokens.',
    iconName: 'Layers',
    href: '/tools/context-window-visualizer',
    badge: '1M Tokens',
    primaryMetric: '750k Word Capacity',
  },
  {
    id: 'latency-estimator',
    title: 'Anycast Latency & TTFT Estimator',
    category: 'Performance',
    description: 'Simulate TLS Anycast edge termination vs single-origin RTT across North America, Europe, and Asia-Pacific.',
    iconName: 'Activity',
    href: '/tools/latency-estimator',
    badge: 'Global Edge',
    primaryMetric: '<15ms TTFT',
  },
  {
    id: 'token-counter',
    title: 'BPE Token Counter & Visualizer',
    category: 'Engineering',
    description: 'Inspect exact Byte-Pair Encoding subword tokens and costs using official o200k_base and cl100k_base vocabularies.',
    iconName: 'Cpu',
    href: '/tools/token-counter',
    badge: 'BPE Studio',
    primaryMetric: 'o200k & cl100k',
  },
  {
    id: 'prompt-caching-calculator',
    title: 'Compound Prompt Caching Calculator',
    category: 'Economics',
    description: 'Calculate exact compound savings from 75% cached prefix pass-through across repetitive agent system prompts.',
    iconName: 'TrendingDown',
    href: '/tools/prompt-caching-calculator',
    badge: '-75% Cache',
    primaryMetric: '75% Rebate Pass',
  },
  {
    id: 'prompt-compressor',
    title: 'System Prompt Compressor',
    category: 'Engineering',
    description: 'Heuristic token compression engine removing lexical redundancy while maintaining strict semantic instruction integrity.',
    iconName: 'Sparkles',
    href: '/tools/prompt-compressor',
    badge: 'Token Reducer',
    primaryMetric: '-35% Token Trim',
  },
  {
    id: 'model-cost-comparator',
    title: 'Wholesale Model Cost Comparator',
    category: 'Economics',
    description: 'Side-by-side pricing matrix comparing GALXAI wholesale rates against direct OpenAI and competitor pricing.',
    iconName: 'DollarSign',
    href: '/tools/model-cost-comparator',
    badge: 'Rate Matrix',
    primaryMetric: 'Live Wholesale Feed',
  },
  {
    id: 'json-schema-generator',
    title: 'Strict JSON Schema & Zod Generator',
    category: 'Engineering',
    description: 'Visual builder for OpenAI strict structured outputs. Export ready-to-run Zod, Pydantic, and JSON Schema definitions.',
    iconName: 'FileCode',
    href: '/tools/json-schema-generator',
    badge: 'Type Safe',
    primaryMetric: '100% Strict Output',
  },
  {
    id: 'function-calling-builder',
    title: 'Parallel Function Calling Builder',
    category: 'Engineering',
    description: 'Construct multi-tool execution manifests with parameter validation for autonomous AI agent swarms.',
    iconName: 'Terminal',
    href: '/tools/function-calling-builder',
    badge: 'Agent Tools',
    primaryMetric: 'Parallel Tooling',
  },
  {
    id: 'embeddings-calculator',
    title: 'Vector Embeddings & RAG Memory Estimator',
    category: 'Economics',
    description: 'Calculate vector dimension storage, pgvector memory footprint, and batch embedding compute expenses.',
    iconName: 'Database',
    href: '/tools/embeddings-calculator',
    badge: 'RAG Sizing',
    primaryMetric: 'pgvector & Pinecone',
  },
  {
    id: 'api-request-builder',
    title: 'Universal API Request Generator',
    category: 'Engineering',
    description: 'Generate production-ready cURL, Python, TypeScript, and Go client snippets with streaming and structured flags.',
    iconName: 'FileCode',
    href: '/tools/api-request-builder',
    badge: 'Code Generator',
    primaryMetric: '4 Languages',
  },
  {
    id: 'api-key-checker',
    title: 'API Key Health & Quota Tester',
    category: 'Diagnostics',
    description: 'Zero-data-retention connectivity and rate-limit headroom diagnostic tester for OpenAI-compatible API keys.',
    iconName: 'Key',
    href: '/tools/api-key-checker',
    badge: 'Diagnostics',
    primaryMetric: 'Zero Retention',
  },
];

export default function ToolsHubPage() {
  const hubSchema = createTopicHubGraph({
    canonicalPath: '/tools',
    title: 'GALXAI Interactive AI Developer Tools & Optimization Suite',
    description:
      '13 free interactive developer tools for AI token optimization, latency benchmarking, BPE counting, and enterprise ROI modeling.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Developer Tools', url: '/tools' },
    ],
    items: TOOLS_CATALOG.map((t) => ({
      name: t.title,
      description: t.description,
      url: t.href,
    })),
  });

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <JsonLd data={hubSchema} />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Developer Tools', href: '/tools' }]} />

        {/* Header & Hero */}
        <header className="text-center max-w-3xl mx-auto space-y-4 mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold tracking-wide">
          <Wrench className="w-4 h-4 text-cyan-400" />
          <span>13 PRODUCTION-GRADE DEVELOPER UTILITIES</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
          Interactive AI <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">Developer Tools</span>
        </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Zero-overhead, client-side calculation engines and simulators designed to optimize token budgets, diagnose latency bottlenecks, and harden OpenAI-compatible pipelines.
          </p>
        </header>

        {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {TOOLS_CATALOG.map((tool) => (
          <Link
            key={tool.id}
            href={tool.href}
            className="group relative rounded-2xl border border-white/10 bg-[#0d111a]/80 hover:bg-[#121724]/90 p-6 flex flex-col justify-between transition-all hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/5 cursor-pointer backdrop-blur-sm"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-cyan-300">
                  {tool.category}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  {tool.badge}
                </span>
              </div>

              <h2 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors mb-2">
                {tool.title}
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-6">
                {tool.description}
              </p>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-500 group-hover:text-zinc-400">{tool.primaryMetric}</span>
              <div className="flex items-center gap-1 text-cyan-400 group-hover:translate-x-1 transition-transform">
                <span>Launch Tool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom Conversion & Info Banner */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950/40 via-black to-cyan-950/30 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>100% CLIENT-SIDE & ZERO RETENTION</span>
          </div>
          <h3 className="text-xl font-bold text-white">Ready to connect directly to the wholesale AI gateway?</h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
            Switch your OpenAI base URL to <code className="text-cyan-300 font-mono">https://api.galx.ai/v1</code> for instant 25%–40% token savings, automatic failover, and zero rate limit stalls.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/keys/new"
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs font-mono uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>Create Free API Key</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
      </main>
    </div>
  );
}
