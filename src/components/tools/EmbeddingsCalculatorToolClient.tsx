'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Database,
  Layers,
  Copy,
  Check,
  Zap,
  CheckCircle2,
  HardDrive,
  Cpu,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

export function EmbeddingsCalculatorToolClient() {
  const [docCount, setDocCount] = useState<number>(50000); // 50k docs
  const [tokensPerDoc, setTokensPerDoc] = useState<number>(500); // 500 tokens per chunk
  const [dimensions, setDimensions] = useState<1536 | 3072>(1536);
  const [reindexingFrequency, setReindexingFrequency] = useState<'once' | 'monthly' | 'weekly'>('monthly');
  const [selectedLang, setSelectedLang] = useState<'python' | 'typescript'>('python');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Calculations
  const calculations = useMemo(() => {
    const totalTokens = docCount * tokensPerDoc;
    const tokensInMillions = totalTokens / 1_000_000;

    // GALXAI Wholesale: $0.020 / 1M vs Direct OpenAI: $0.030 / 1M (for text-embedding-3-small)
    const pricePer1M_Galxai = dimensions === 1536 ? 0.02 : 0.13;
    const pricePer1M_Direct = dimensions === 1536 ? 0.03 : 0.18;

    const singlePassCostGalxai = tokensInMillions * pricePer1M_Galxai;
    const singlePassCostDirect = tokensInMillions * pricePer1M_Direct;

    const multiplier = reindexingFrequency === 'once' ? 1 : reindexingFrequency === 'monthly' ? 12 : 52;
    const annualCostGalxai = singlePassCostGalxai * multiplier;
    const annualCostDirect = singlePassCostDirect * multiplier;
    const annualSavings = annualCostDirect - annualCostGalxai;

    // Vector Storage Footprint (Float32 = 4 bytes per dimension + HNSW index overhead ~1.5x)
    const rawVectorBytes = docCount * dimensions * 4;
    const totalStorageBytes = rawVectorBytes * 1.5;
    const storageGB = totalStorageBytes / (1024 * 1024 * 1024);

    return {
      totalTokens,
      tokensInMillions,
      singlePassCostGalxai,
      singlePassCostDirect,
      annualCostGalxai,
      annualCostDirect,
      annualSavings,
      storageGB,
    };
  }, [docCount, tokensPerDoc, dimensions, reindexingFrequency]);

  const generatedCode = useMemo(() => {
    const modelName = dimensions === 1536 ? 'text-embedding-3-small' : 'text-embedding-3-large';

    if (selectedLang === 'python') {
      return `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# High-throughput batched vector generation at $${dimensions === 1536 ? '0.020' : '0.130'}/1M tokens
response = client.embeddings.create(
    model="${modelName}",
    input=[
        "Document passage alpha for indexing...",
        "Document passage beta for indexing..."
    ],
    dimensions=${dimensions}
)

vectors = [item.embedding for item in response.data]
print(f"Generated {len(vectors)} vectors with dimension {len(vectors[0])}")`;
    }

    return `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

async function main() {
  const response = await client.embeddings.create({
    model: "${modelName}",
    input: [
      "Document passage alpha for indexing...",
      "Document passage beta for indexing..."
    ],
    dimensions: ${dimensions},
  });

  const vectors = response.data.map(item => item.embedding);
  console.log(\`Generated \${vectors.length} vectors of dimension \${vectors[0].length}\`);
}

main();`;
  }, [dimensions, selectedLang]);

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(generatedCode);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const toolFaqs = [
    {
      q: 'How does GALXAI achieve $0.020/1M pricing on text-embedding-3-small?',
      a: 'GALXAI purchases wholesale compute capacity in bulk and passes 100% of the volume clearance discount to developers with zero markup.',
    },
    {
      q: 'Are the embedding vectors mathematically identical to official OpenAI embeddings?',
      a: 'Yes. Every embedding vector is generated directly by official model weights, ensuring 100% cosine similarity parity for your vector database.',
    },
    {
      q: 'How should I batch embedding requests for maximum throughput?',
      a: 'We recommend batching 100 to 500 document chunks per API request to minimize HTTP roundtrip overhead and maximize Anycast pipeline efficiency.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs
          items={[
            { label: 'Tools', href: '/calculator' },
            { label: 'Embeddings & Vector Storage Cost Calculator' },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Lead */}
        <section id="tool-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <Database className="w-3.5 h-3.5" />
              <span>RAG &amp; VECTOR DATABASE COST ESTIMATOR</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Calculator"
              title="GALXAI Embeddings & Vector Storage Cost Calculator"
              description="Calculate RAG embedding costs, vector database RAM storage footprints, and wholesale indexing savings."
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Embeddings &amp; Vector Storage Calculator
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            Calculate embedding API token costs, vector database memory footprints (RAM/NVMe), and wholesale savings across Pinecone, Qdrant, Milvus, and pgvector.
          </p>
        </section>

        {/* Dual Panel: Workload Sliders vs Financial Telemetry */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sliders Panel */}
          <section id="workload-controls" className="lg:col-span-6 glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
            <div className="space-y-1 border-b border-white/10 pb-3">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">Step 1: Configure RAG Workload</span>
              <h2 className="text-lg font-bold text-white font-mono">Document Volume &amp; Dimensions</h2>
            </div>

            {/* Document Count Slider */}
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center">
                <label className="text-zinc-300 font-bold uppercase">Indexed Chunks / Documents:</label>
                <span className="text-cyan-300 font-black text-sm">{docCount.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={1000}
                max={1000000}
                step={5000}
                value={docCount}
                onChange={(e) => setDocCount(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>1K</span>
                <span>250K</span>
                <span>500K</span>
                <span>1M</span>
              </div>
            </div>

            {/* Tokens per Doc Slider */}
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center">
                <label className="text-zinc-300 font-bold uppercase">Avg Tokens per Chunk:</label>
                <span className="text-emerald-300 font-black text-sm">{tokensPerDoc} tokens</span>
              </div>
              <input
                type="range"
                min={100}
                max={2000}
                step={50}
                value={tokensPerDoc}
                onChange={(e) => setTokensPerDoc(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Dimensions Selector */}
            <div className="space-y-2 font-mono text-xs">
              <label className="text-zinc-300 font-bold uppercase block">Vector Dimension &amp; Model:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDimensions(1536)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    dimensions === 1536
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold'
                      : 'bg-black/40 border-white/10 text-zinc-400'
                  }`}
                >
                  <div className="text-xs font-bold">1536 Dimensions</div>
                  <div className="text-[10px] text-zinc-500 font-sans">text-embedding-3-small</div>
                </button>

                <button
                  onClick={() => setDimensions(3072)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    dimensions === 3072
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-bold'
                      : 'bg-black/40 border-white/10 text-zinc-400'
                  }`}
                >
                  <div className="text-xs font-bold">3072 Dimensions</div>
                  <div className="text-[10px] text-zinc-500 font-sans">text-embedding-3-large</div>
                </button>
              </div>
            </div>

            {/* Reindexing Frequency */}
            <div className="space-y-2 font-mono text-xs">
              <label className="text-zinc-300 font-bold uppercase block">Reindexing Cadence:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'once', label: 'One-Time' },
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'weekly', label: 'Weekly' },
                ].map((cadence) => (
                  <button
                    key={cadence.id}
                    onClick={() => setReindexingFrequency(cadence.id as any)}
                    className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                      reindexingFrequency === cadence.id
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                        : 'bg-black/40 border-white/10 text-zinc-400'
                    }`}
                  >
                    {cadence.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Financial Telemetry Readout */}
          <section id="cost-readout" className="lg:col-span-6 glass-panel rounded-3xl p-6 sm:p-8 space-y-5 border border-cyan-500/30 bg-[#0b0e17] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-1 border-b border-white/10 pb-3">
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">Step 2: Projected Telemetry</span>
                <h2 className="text-lg font-bold text-white font-mono">Cost &amp; RAM Footprint</h2>
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1">
                  <span className="text-[10px] uppercase text-zinc-400 font-bold block">Total Tokens</span>
                  <span className="text-xl font-black text-white block">
                    {calculations.tokensInMillions.toFixed(1)}M Tokens
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1">
                  <span className="text-[10px] uppercase text-zinc-400 font-bold block">Vector DB RAM</span>
                  <span className="text-xl font-black text-amber-300 block">
                    {calculations.storageGB.toFixed(2)} GB
                  </span>
                </div>
              </div>

              {/* Side-by-Side Financial Comparison */}
              <div className="p-4 rounded-2xl bg-black/70 border border-cyan-500/30 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-zinc-400">GALXAI Wholesale Cost:</span>
                  <span className="text-cyan-300 font-black text-base">
                    ${calculations.annualCostGalxai.toFixed(2)} / yr
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-zinc-400">Direct OpenAI API Cost:</span>
                  <span className="text-zinc-300 font-bold line-through">
                    ${calculations.annualCostDirect.toFixed(2)} / yr
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Annual Net Savings:</span>
                  </span>
                  <span className="text-emerald-300 font-black text-lg">
                    ${calculations.annualSavings.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/keys/new"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer mt-4"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Get Wholesale Embeddings with $5 Free Compute →</span>
            </Link>
          </section>
        </div>

        {/* Code Generator Card */}
        <section id="embedding-code-snippet" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">
                1-Click Embeddings Quickstart
              </span>
              <h2 className="text-lg font-bold text-white font-mono">
                Production Batching Code ({selectedLang})
              </h2>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <button
                onClick={() => setSelectedLang('python')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedLang === 'python'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Python
              </button>
              <button
                onClick={() => setSelectedLang('typescript')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedLang === 'typescript'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                TypeScript
              </button>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer ml-2"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
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
              <span>Frequently Asked Questions (Embeddings &amp; Vector Databases)</span>
            </h2>
            <p className="text-xs text-zinc-400">Vector dimensions, batching optimization, and database RAM sizing.</p>
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
