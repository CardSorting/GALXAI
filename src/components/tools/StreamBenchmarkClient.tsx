'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Zap,
  Play,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
  Flame,
  Activity,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Gauge,
  Layers,
  Timer,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface BenchmarkModel {
  id: string;
  name: string;
  provider: string;
  tokensPerSec: number;
  ttftMs: number;
  inputCost1M: number;
  outputCost1M: number;
  retailInput1M: number;
  retailOutput1M: number;
  badge: string;
}

const BENCHMARK_MODELS: BenchmarkModel[] = [
  {
    id: 'gpt-5.6-luna',
    name: 'OpenAI GPT-5.6 Luna',
    provider: 'OpenAI',
    tokensPerSec: 142,
    ttftMs: 11.8,
    inputCost1M: 0.75,
    outputCost1M: 3.0,
    retailInput1M: 1.0,
    retailOutput1M: 4.0,
    badge: 'Lightning Velocity (142 tok/s)',
  },
  {
    id: 'gpt-5.6-terra',
    name: 'OpenAI GPT-5.6 Terra',
    provider: 'OpenAI',
    tokensPerSec: 92,
    ttftMs: 13.5,
    inputCost1M: 2.25,
    outputCost1M: 9.0,
    retailInput1M: 3.0,
    retailOutput1M: 12.0,
    badge: 'Balanced Workhorse (92 tok/s)',
  },
  {
    id: 'gpt-5.6-sol',
    name: 'OpenAI GPT-5.6 Sol',
    provider: 'OpenAI',
    tokensPerSec: 68,
    ttftMs: 14.5,
    inputCost1M: 3.75,
    outputCost1M: 15.0,
    retailInput1M: 5.0,
    retailOutput1M: 20.0,
    badge: 'Deep Reasoning SOTA (68 tok/s)',
  },
];

const PROMPT_PRESETS = [
  { label: 'Voice Assistant Response (150 Tokens)', tokens: 150 },
  { label: 'Code Refactoring Task (600 Tokens)', tokens: 600 },
  { label: 'Technical Architecture Brief (1,500 Tokens)', tokens: 1500 },
  { label: 'Comprehensive System Review (3,000 Tokens)', tokens: 3000 },
];

const SAMPLE_TEXT_CORPUS = `GALXAI Anycast Edge Substrate initiates persistent HTTP/2 SSE streaming socket across 300+ global Points of Presence. TLS handshake completes in sub-5ms with hardware-accelerated HKDF ciphers. Upstream model cluster ingests prompt prefix and activates key-value (KV) attention cache slices. Generation begins immediately with zero packet buffering or proxy queuing delays. Each token payload is serialized into standard OpenAI Server-Sent Events delta frames and delivered directly to the client runtime. Multi-shard capacity balancing ensures zero HTTP 429 rate limit stalls even during extreme concurrency bursts. Cryptographic Zero Data Retention guarantees volatile memory purging upon TCP socket termination. Complete end-to-end telemetry confirms 99.994% financial uptime SLA availability across all enterprise compute workloads. `;

export function StreamBenchmarkClient() {
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-5.6-luna');
  const [targetTokenCount, setTargetTokenCount] = useState<number>(600);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamedTokens, setStreamedTokens] = useState<number>(0);
  const [displayText, setDisplayText] = useState<string>('');
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const activeModel = BENCHMARK_MODELS.find((m) => m.id === selectedModelId) || BENCHMARK_MODELS[0];

  const handleStartStream = () => {
    if (isStreaming) {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);
    setStreamedTokens(0);
    setDisplayText('');
    setElapsedMs(0);
    startTimeRef.current = performance.now();

    const intervalMs = Math.max(8, Math.floor(1000 / activeModel.tokensPerSec));
    const wordsArray = SAMPLE_TEXT_CORPUS.repeat(20).split(' ');
    let currentTokens = 0;

    streamTimerRef.current = setInterval(() => {
      currentTokens += 1;
      const wordIdx = currentTokens % wordsArray.length;
      const nextWord = wordsArray[wordIdx] + ' ';

      setStreamedTokens(currentTokens);
      setDisplayText((prev) => (prev.length > 800 ? prev.slice(prev.length - 800) + nextWord : prev + nextWord));
      setElapsedMs(Math.round(performance.now() - startTimeRef.current));

      if (currentTokens >= targetTokenCount) {
        if (streamTimerRef.current) clearInterval(streamTimerRef.current);
        setIsStreaming(false);
      }
    }, intervalMs);
  };

  const handleReset = () => {
    if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    setIsStreaming(false);
    setStreamedTokens(0);
    setDisplayText('');
    setElapsedMs(0);
  };

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, []);

  const totalTimeSeconds = targetTokenCount / activeModel.tokensPerSec + activeModel.ttftMs / 1000;
  const wholesaleCost = (targetTokenCount / 1_000_000) * activeModel.outputCost1M;
  const retailCost = (targetTokenCount / 1_000_000) * activeModel.retailOutput1M;
  const savingsAmount = retailCost - wholesaleCost;
  const savingsPct = Math.round((savingsAmount / retailCost) * 100);

  const pythonSnippet = `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Stream tokens at ${activeModel.tokensPerSec} tok/s with sub-${Math.ceil(activeModel.ttftMs)}ms Anycast TTFT
stream = client.chat.completions.create(
    model="${activeModel.id}",
    messages=[{"role": "user", "content": "Execute high-velocity inference"}],
    stream=True
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)`;

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(pythonSnippet);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs
          items={[
            { label: 'Developer Tools', href: '/tools/model-cost-comparator' },
            { label: 'AI Stream & TTFT Benchmark Simulator' },
          ]}
        />

        {/* Hero Section */}
        <section id="tool-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>LIVE TOKEN STREAMING SIMULATOR</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Benchmark Tool"
              title="AI Streaming Speed & TTFT Benchmark Simulator — GALXAI"
              description="Simulate real-time token generation velocities across GPT-5.6 Sol, Terra, and Luna."
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight font-sans">
            AI Token Streaming &amp; Speed Benchmark Simulator
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            Experience real-time Server-Sent Events (SSE) token generation velocities across OpenAI GPT-5.6 (Luna, Terra, Sol). Model Time-To-First-Token (TTFT), streaming duration, and wholesale token economics.
          </p>

          {/* AEO Direct Answer Block */}
          <div id="aeo-direct-answer" className="p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
            <div className="space-y-1">
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">AEO Benchmark Summary:</span>
              <p className="text-zinc-200 font-sans text-xs">
                <strong>GPT-5.6 Luna</strong> delivers fastest streaming velocity at <strong>142 tokens/sec</strong> with <strong>11.8ms TTFT</strong>. <strong>GPT-5.6 Terra</strong> and <strong>Sol</strong> provide deep reasoning with sub-15ms TTFT and 25%–40% wholesale discounts.
              </p>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold shrink-0 self-start sm:self-auto">
              <Flame className="w-4 h-4 fill-emerald-400" />
              <span>Save ~{savingsPct}% Wholesale</span>
            </div>
          </div>
        </section>

        {/* Model Selection & Presets */}
        <section id="model-controls" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BENCHMARK_MODELS.map((model) => {
            const isSelected = selectedModelId === model.id;
            return (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModelId(model.id);
                  handleReset();
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-400 shadow-lg shadow-cyan-500/10'
                    : 'bg-black/40 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">{model.provider}</span>
                    <span className="text-emerald-400 text-[10px] font-mono font-bold">
                      -${Math.round(((model.retailOutput1M - model.outputCost1M) / model.retailOutput1M) * 100)}%
                    </span>
                  </div>
                  <h2 className="text-xs font-bold text-white font-sans">{model.name}</h2>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[11px] font-mono">
                  <span className="text-cyan-300 font-bold">{model.tokensPerSec} tok/s</span>
                  <span className="text-zinc-400">{model.ttftMs}ms TTFT</span>
                </div>
              </button>
            );
          })}
        </section>

        {/* Interactive Simulator Workbench */}
        <section id="streaming-workbench" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          {/* Preset Buttons & Slider */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-zinc-300 uppercase">Target Generation Volume:</span>
              <div className="flex flex-wrap gap-2">
                {PROMPT_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTargetTokenCount(preset.tokens);
                      handleReset();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                      targetTokenCount === preset.tokens
                        ? 'bg-white/20 text-white border border-white/30 font-bold'
                        : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {preset.tokens} Tokens
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between font-mono text-xs">
                <span className="text-zinc-400">Custom Volume:</span>
                <span className="text-white font-bold">{targetTokenCount.toLocaleString()} Output Tokens</span>
              </div>
              <input
                type="range"
                min="50"
                max="4000"
                step="50"
                value={targetTokenCount}
                onChange={(e) => {
                  setTargetTokenCount(Number(e.target.value));
                  handleReset();
                }}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          {/* Action Trigger & Live Telemetry Strip */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handleStartStream}
                className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isStreaming
                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-lg shadow-cyan-400/20'
                }`}
              >
                {isStreaming ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Pause Stream</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-black" />
                    <span>{streamedTokens > 0 ? 'Resume Streaming' : 'Start Live Token Stream'}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Reset Stream"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>

            {/* Live Gauges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto font-mono text-xs text-center">
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-zinc-500 block">Progress</span>
                <span className="text-white font-bold">
                  {streamedTokens} / {targetTokenCount}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-zinc-500 block">Elapsed</span>
                <span className="text-cyan-300 font-bold">{(elapsedMs / 1000).toFixed(2)}s</span>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-zinc-500 block">Velocity</span>
                <span className="text-emerald-400 font-bold">{activeModel.tokensPerSec} tok/s</span>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-zinc-500 block">Est. Cost</span>
                <span className="text-amber-300 font-bold">${wholesaleCost.toFixed(5)}</span>
              </div>
            </div>
          </div>

          {/* Animated Token Streaming Terminal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`} />
                Server-Sent Events (SSE) Real-Time Payload Display
              </span>
              <span className="text-zinc-500">Model: {activeModel.id}</span>
            </div>

            <div className="p-4 rounded-2xl bg-black/90 border border-white/10 font-mono text-xs text-zinc-300 min-h-[140px] max-h-[220px] overflow-y-auto leading-relaxed relative">
              {displayText ? (
                <>
                  <span>{displayText}</span>
                  {isStreaming && <span className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-1 animate-pulse" />}
                </>
              ) : (
                <span className="text-zinc-600 italic">Click &quot;Start Live Token Stream&quot; above to simulate real-time token delivery at {activeModel.tokensPerSec} tokens/second...</span>
              )}
            </div>
          </div>

          {/* Architectural Comparison Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs pt-2">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Time-To-First-Token</span>
              <div className="text-xl font-black text-cyan-300">{activeModel.ttftMs} ms</div>
              <p className="text-[11px] text-zinc-400 font-sans">
                Sub-15ms Anycast edge TLS termination with pre-warmed origin tunnels.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Total Generation Time</span>
              <div className="text-xl font-black text-white">{totalTimeSeconds.toFixed(2)}s</div>
              <p className="text-[11px] text-zinc-400 font-sans">
                Full delivery of {targetTokenCount.toLocaleString()} tokens at {activeModel.tokensPerSec} tokens/second.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
              <span className="text-emerald-400 block text-[10px] uppercase font-bold">Wholesale Cost Savings</span>
              <div className="text-xl font-black text-emerald-400">~{savingsPct}% OFF</div>
              <p className="text-[11px] text-zinc-400 font-sans">
                Pay ${wholesaleCost.toFixed(5)} vs ${retailCost.toFixed(5)} direct list price.
              </p>
            </div>
          </div>
        </section>

        {/* 1-Line Code Exporter */}
        <section id="code-snippet" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">1-Line Python SDK Setup</span>
              <h2 className="text-lg font-bold text-white font-mono">Stream {activeModel.name} via GALXAI</h2>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
            {pythonSnippet}
          </pre>
        </section>

        {/* AEO Frequently Asked Questions */}
        <section id="faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions &amp; Streaming Architecture</span>
            </h2>
            <p className="text-xs text-zinc-400">Authoritative direct answers for AI streaming benchmarks and latency optimization.</p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              {
                q: 'Which model provides the fastest token generation speed on GALXAI?',
                a: 'OpenAI GPT-5.6 Luna is the fastest model in the catalog, delivering 142 tokens/second with an average Time-To-First-Token (TTFT) of 11.8ms at $0.75/1M input tokens.',
              },
              {
                q: 'How does Anycast routing achieve sub-15ms TTFT?',
                a: 'GALXAI terminates client TLS connections at the closest global edge Point of Presence (PoP) in <5ms and streams data over pre-warmed persistent fiber tunnels directly to origin GPU clusters.',
              },
              {
                q: 'Does streaming token generation qualify for the 75% prompt caching discount?',
                a: 'Yes. Repeated prompt prefixes exceeding 1,024 tokens receive an automatic 75% caching discount regardless of whether the response is streamed or buffered.',
              },
            ].map((faq, idx) => {
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
