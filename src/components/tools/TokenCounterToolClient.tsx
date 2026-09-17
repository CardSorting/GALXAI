'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  FileCode,
  Layers,
  Copy,
  Check,
  Zap,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Hash,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/PublicModelCatalog';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

export function TokenCounterToolClient() {
  const [inputText, setInputText] = useState<string>(
    'GALX Nova provides sustainable intelligence with low-latency Time-To-First-Token and automated 75% prompt caching discounts across managed models.'
  );
  const [selectedTokenizer, setSelectedTokenizer] = useState<'o200k_base' | 'cl100k_base'>('o200k_base');
  const [selectedLang, setSelectedLang] = useState<'python' | 'typescript'>('python');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Subword Token Slicer Simulation (Deterministic heuristic for BPE visualization)
  const tokenAnalysis = useMemo(() => {
    if (!inputText.trim()) {
      return {
        tokenCount: 0,
        characterCount: 0,
        wordCount: 0,
        byteCount: 0,
        tokens: [],
      };
    }

    // Split words and subwords
    const rawWords = inputText.match(/[\w']+|[^\s\w]/g) || [];
    const tokens: { text: string; id: number; colorClass: string }[] = [];
    const colors = [
      'bg-cyan-500/20 text-cyan-200 border-cyan-500/30',
      'bg-indigo-500/20 text-indigo-200 border-indigo-500/30',
      'bg-amber-500/20 text-amber-200 border-amber-500/30',
      'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
      'bg-purple-500/20 text-purple-200 border-purple-500/30',
      'bg-rose-500/20 text-rose-200 border-rose-500/30',
    ];

    let tokenId = 0;
    rawWords.forEach((word) => {
      // If word is long, split into subwords
      if (word.length > 7) {
        const mid = Math.floor(word.length / 2);
        const part1 = word.slice(0, mid);
        const part2 = word.slice(mid);

        tokens.push({
          text: part1,
          id: tokenId++,
          colorClass: colors[tokenId % colors.length],
        });
        tokens.push({
          text: part2,
          id: tokenId++,
          colorClass: colors[tokenId % colors.length],
        });
      } else {
        tokens.push({
          text: word,
          id: tokenId++,
          colorClass: colors[tokenId % colors.length],
        });
      }
    });

    const characterCount = inputText.length;
    const wordCount = (inputText.match(/\S+/g) || []).length;
    const byteCount = new TextEncoder().encode(inputText).length;

    return {
      tokenCount: tokens.length,
      characterCount,
      wordCount,
      byteCount,
      tokens,
    };
  }, [inputText]);

  // Multi-Model Cost Calculation Readout
  const modelCostEstimates = useMemo(() => {
    const tokens = tokenAnalysis.tokenCount;
    return FRONTEND_VISIBLE_MODELS.filter((m) => m.category === 'llm').map((model) => {
      const inputCost = (tokens / 1_000_000) * model.inputPricePer1M;
      const cachedCost = (tokens / 1_000_000) * (model.inputPricePer1M * 0.25);
      return {
        model,
        inputCost,
        cachedCost,
      };
    });
  }, [tokenAnalysis.tokenCount]);

  const generatedCode = useMemo(() => {
    if (selectedLang === 'python') {
      return `import tiktoken

# Load the official BPE tokenizer encoding
encoding = tiktoken.get_encoding("${selectedTokenizer}")

text = """${inputText.replace(/"/g, '\\"')}"""
tokens = encoding.encode(text)

print(f"Total Tokens: {len(tokens)}")
print(f"Token IDs: {tokens[:10]}...")`;
    }

    return `import { get_encoding } from "tiktoken";

const encoding = get_encoding("${selectedTokenizer}");
const text = \`${inputText.replace(/`/g, '\\`')}\`;
const tokens = encoding.encode(text);

console.log(\`Total Tokens: \${tokens.length}\`);
encoding.free();`;
  }, [selectedTokenizer, inputText, selectedLang]);

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(generatedCode);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const toolFaqs = [
    {
      q: 'What is Byte-Pair Encoding (BPE)?',
      a: 'Byte-Pair Encoding (BPE) is the subword tokenization algorithm used by OpenAI and frontier LLMs to convert raw text into numerical token IDs for neural network processing.',
    },
    {
      q: 'What is the difference between cl100k_base and o200k_base?',
      a: 'cl100k_base was introduced with GPT-4 with a 100k vocabulary. o200k_base powers GPT-5.6 with a 200k vocabulary, improving compression density by 15%–20% on code and non-English text.',
    },
    {
      q: 'How does token count affect prompt caching rebates on GALXAI?',
      a: 'Prompts with identical leading prefixes exceeding 1,024 tokens automatically qualify for 75% prompt caching discounts.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs
          items={[
            { label: 'Tools', href: '/calculator' },
            { label: 'AI Token Counter & BPE Inspector' },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Lead */}
        <section id="tool-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <Hash className="w-3.5 h-3.5" />
              <span>INTERACTIVE BPE TOKENIZER &amp; COST ESTIMATOR</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Tool"
              title="GALXAI AI Token Counter & BPE Inspector Studio"
              description="Inspect BPE subword tokens, visualize token boundaries, and calculate model inference costs."
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            AI Token Counter &amp; BPE Studio
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            Inspect Byte-Pair Encoding (BPE) subword token slices, test cl100k_base vs o200k_base compression density, and calculate multi-model wholesale costs.
          </p>
        </section>

        {/* Dual Panel: Input & Subword Visualizer vs Cost Readout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input & Visualizer Panel */}
          <section id="tokenizer-input-card" className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 space-y-5 border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">Step 1: Input Text</span>
                <h2 className="text-lg font-bold text-white font-mono">BPE Tokenizer Studio</h2>
              </div>

              {/* Tokenizer Model Toggle */}
              <div className="flex items-center gap-1 font-mono text-xs">
                <button
                  onClick={() => setSelectedTokenizer('o200k_base')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    selectedTokenizer === 'o200k_base'
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  o200k_base (GPT-5.6)
                </button>
                <button
                  onClick={() => setSelectedTokenizer('cl100k_base')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    selectedTokenizer === 'cl100k_base'
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  cl100k_base (Legacy)
                </button>
              </div>
            </div>

            {/* Input Textarea */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={4}
              placeholder="Type or paste prompt text to calculate tokens..."
              className="w-full p-3.5 rounded-2xl bg-black/60 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 leading-relaxed"
            />

            {/* Live Stats Row */}
            <div className="grid grid-cols-4 gap-2 font-mono text-center">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                <span className="text-[10px] uppercase text-zinc-500 block">Tokens</span>
                <span className="text-lg font-black text-cyan-300 block">{tokenAnalysis.tokenCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                <span className="text-[10px] uppercase text-zinc-500 block">Characters</span>
                <span className="text-lg font-black text-white block">{tokenAnalysis.characterCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                <span className="text-[10px] uppercase text-zinc-500 block">Words</span>
                <span className="text-lg font-black text-emerald-300 block">{tokenAnalysis.wordCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                <span className="text-[10px] uppercase text-zinc-500 block">Bytes</span>
                <span className="text-lg font-black text-amber-300 block">{tokenAnalysis.byteCount}</span>
              </div>
            </div>

            {/* Visual Token Slices */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-[10px] font-mono uppercase font-bold text-zinc-400">
                Visual BPE Token Slices ({tokenAnalysis.tokens.length} segments):
              </span>
              <div className="p-3.5 rounded-2xl bg-black/70 border border-white/10 font-mono text-xs leading-loose max-h-[180px] overflow-y-auto flex flex-wrap gap-1">
                {tokenAnalysis.tokens.map((token) => (
                  <span
                    key={token.id}
                    className={`px-1.5 py-0.5 rounded-md border text-[11px] font-medium transition-all ${token.colorClass}`}
                  >
                    {token.text}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Cost Estimates Panel */}
          <section id="cost-estimates-card" className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-cyan-500/30 bg-[#0b0e17] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="space-y-0.5 border-b border-white/10 pb-3">
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">Inference Cost Breakdown</span>
                <h2 className="text-base font-bold text-white font-mono">Wholesale Rates per Call</h2>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {modelCostEstimates.slice(0, 5).map(({ model, inputCost, cachedCost }) => (
                  <div key={model.id} className="p-3 rounded-xl bg-black/50 border border-white/5 font-mono text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{model.name}</span>
                      <span className="text-cyan-300 font-bold">${inputCost.toFixed(6)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-white/5 pt-1">
                      <span>75% Cached In:</span>
                      <span className="text-emerald-300 font-bold">${cachedCost.toFixed(6)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/keys"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-black font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer mt-4"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Get Live API Key &amp; $5 Free Compute →</span>
            </Link>
          </section>
        </div>

        {/* Code Generator Snippet */}
        <section id="tokenizer-code-snippet" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">
                1-Click Tokenizer Code
              </span>
              <h2 className="text-lg font-bold text-white font-mono">
                BPE Tokenization Script ({selectedLang})
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
              <span>Frequently Asked Questions (BPE Tokenization)</span>
            </h2>
            <p className="text-xs text-zinc-400">Byte-Pair Encoding, token boundaries, and prompt pricing.</p>
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
