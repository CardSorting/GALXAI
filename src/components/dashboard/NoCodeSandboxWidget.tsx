'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Laptop,
  Sparkles,
  Zap,
  Check,
  Copy,
  ArrowRight,
  Play,
  TrendingDown,
  Clock,
  Key,
  RotateCcw,
  Sliders,
  MessageSquare,
  Bot,
  Code2,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TokenCostCalculator } from '@/core/pricing/TokenCostCalculator';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface ToolConfig {
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  getCode: (model: string) => string;
}

const TOOL_CONFIGS: Record<string, ToolConfig> = {
  cursor: {
    name: 'Cursor & Windsurf IDE',
    desc: 'In Cursor Settings > Models > Override Base URL:',
    icon: Laptop,
    getCode: (model) => `Base URL: https://galx.ai/v1\nAPI Key: galx_live_your_key_here\nModel: ${model}`
  },
  chat_app: {
    name: 'LibreChat / TypingMind / OpenWebUI',
    desc: 'In App Settings > OpenAI API Configuration:',
    icon: MessageSquare,
    getCode: (model) => `API Base URL: https://galx.ai/v1\nAPI Key: galx_live_your_key_here\nCustom Model: ${model}`
  },
  make: {
    name: 'Make.com & Zapier No-Code',
    desc: 'In HTTP / Webhook module headers:',
    icon: Bot,
    getCode: () => `URL: https://galx.ai/v1/chat/completions\nAuthorization: Bearer galx_live_your_key_here\nContent-Type: application/json`
  },
  python: {
    name: 'Python / Node.js 1-Line Drop-in',
    desc: 'Standard OpenAI client with 1 changed line:',
    icon: Code2,
    getCode: (model) => `from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_key_here"
)

response = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "Hello GALXAI!"}]
)`
  }
};

interface SimModel {
  id: string;
  name: string;
  badge: string;
  discountPct: number;
  sampleText: string;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
}

const SIM_MODELS: SimModel[] = [
  {
    id: 'gpt-5.6-sol',
    name: 'GPT-5.6 Sol (2M Context)',
    badge: 'Optimal $/perf',
    discountPct: 25,
    promptTokens: 420,
    completionTokens: 284,
    cachedTokens: 210,
    sampleText: `GALXAI's sub-15ms router routes requests dynamically across high-concurrency enterprise infrastructure:

1. **Best Performance Per $**: Verified in private internal testing to deliver the highest capability per dollar for unrestricted developer exploration.
2. **Zero Quality Loss**: Requests hit authentic GPT-5.6 Sol model weights with identical latency and deterministic output.
3. **75% Prompt Caching Rebate**: Repeated system prompts automatically trigger prefix caching rebates.
4. **1-Line Switch**: Simply update your Base URL in Cursor, LibreChat, or your existing OpenAI SDK.`
  },
  {
    id: 'gpt-5.6-luna',
    name: 'GPT-5.6 Luna (Sub-Second Velocity)',
    badge: 'Best $/perf',
    discountPct: 36,
    promptTokens: 380,
    completionTokens: 240,
    cachedTokens: 150,
    sampleText: `OpenAI GPT-5.6 Luna on GALXAI delivers sub-15ms Time-To-First-Token and rapid inline generation:

• **Sub-15ms Gateway Overhead**: Edge routing proxies with instant TCP connection pooling.
• **High-Throughput Global Gateway**: Zero queueing, jitter-free streaming, and no 429 stalls.
• **ZDR-100 Privacy Guarantee**: Ephemeral in-memory handling with cryptographic zero-retention.
• **Drop-in Compatible**: Point your baseURL to https://galx.ai/v1 with your live key.`
  }
];

function BaseNoCodeSandboxWidget() {
  const [selectedTool, setSelectedTool] = useState<string>('cursor');
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-5.6-sol');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [streamProgress, setStreamProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [streamSpeed, setStreamSpeed] = useState(142);
  const [ttftMs, setTtftMs] = useState(12);

  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeModel = SIM_MODELS.find(m => m.id === selectedModelId) || SIM_MODELS[0];
  const activeTool = TOOL_CONFIGS[selectedTool] || TOOL_CONFIGS.cursor;

  // Real-time sub-cent cost simulation calculation
  const simCost = TokenCostCalculator.calculateCost(activeModel.id, {
    promptTokens: activeModel.promptTokens,
    completionTokens: activeModel.completionTokens,
    cachedTokens: activeModel.cachedTokens
  });

  const handleSimulate = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }

    setIsStreaming(true);
    setStreamedText('');
    setStreamProgress(0);
    setTtftMs(Math.floor(10 + Math.random() * 5));
    setStreamSpeed(Math.floor(138 + Math.random() * 12));

    const fullText = activeModel.sampleText;
    let i = 0;

    streamIntervalRef.current = setInterval(() => {
      if (i < fullText.length) {
        setStreamedText(fullText.substring(0, i + 1));
        setStreamProgress(Math.round(((i + 1) / fullText.length) * 100));
        i += 2; // Stream chunks
      } else {
        setStreamedText(fullText);
        setStreamProgress(100);
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        setIsStreaming(false);
      }
    }, 16);
  };

  const handleResetSimulation = () => {
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    setIsStreaming(false);
    setStreamedText('');
    setStreamProgress(0);
  };

  const handleCopy = async () => {
    const code = activeTool.getCode(activeModel.id);
    const success = await safeCopyToClipboard(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, []);

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-cyan-500/30 bg-cyan-500/5 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300 uppercase">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Interactive Zero-Code Simulator</span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-[10px] text-cyan-300 font-bold border border-cyan-500/30">
              NO AUTH REQUIRED
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight">
            Try GALXAI in 30 Seconds (No Auth Required)
          </h3>
          <p className="text-xs text-zinc-300 font-sans max-w-2xl">
            See how easy it is to drop GALXAI into your existing apps and start saving 25%–40% immediately.
          </p>
        </div>

        <ShareButton
          variant="pill"
          label="Share Simulator"
          title="Try GALXAI Zero-Code Simulator"
          description="Interactive prompt simulator testing GPT-5.6 Luna with live sustainable token savings."
        />
      </div>

      {/* Step 1: Choose Tool */}
      <div className="space-y-2 relative z-10">
        <label className="text-xs font-bold text-zinc-200 font-sans flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-cyan-400 text-black text-[11px] font-mono flex items-center justify-center font-bold">1</span>
          <span>Where will you use GALXAI?</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-sans text-xs">
          {Object.entries(TOOL_CONFIGS).map(([key, tool]) => {
            const Icon = tool.icon;
            const isSelected = selectedTool === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedTool(key)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between space-y-1.5 ${
                  isSelected
                    ? 'bg-cyan-500/20 text-white border-cyan-400 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400/40'
                    : 'bg-black/50 text-zinc-400 hover:text-white border-white/10 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-300' : 'text-zinc-400'}`} />
                  <span className="font-bold text-xs text-white">{tool.name}</span>
                </div>
                <span className="text-[10px] text-zinc-400 line-clamp-1">{tool.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Interactive Prompt & Live Stream */}
      <div className="space-y-2 relative z-10">
        <label className="text-xs font-bold text-zinc-200 font-sans flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-amber-400 text-black text-[11px] font-mono flex items-center justify-center font-bold">2</span>
          <span>Test Live Model Output &amp; Savings</span>
        </label>

        <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-zinc-400 font-mono">Model:</span>
              {SIM_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedModelId(m.id);
                    if (isStreaming) handleResetSimulation();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedModelId === m.id
                      ? 'bg-amber-400 text-black shadow-sm'
                      : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  <span>{m.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    selectedModelId === m.id ? 'bg-black/20 text-black' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {m.badge}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {streamedText && !isStreaming && (
                <button
                  onClick={handleResetSimulation}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-mono flex items-center gap-1 transition-all border border-white/5"
                  title="Reset Output"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}

              <button
                onClick={handleSimulate}
                disabled={isStreaming}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-cyan-500 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50 hover:scale-105 active:scale-95 font-mono"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isStreaming ? `Streaming (${streamProgress}%)...` : 'Run Simulation'}</span>
              </button>
            </div>
          </div>

          {/* Terminal Output Area */}
          <div className="p-4 rounded-xl bg-[#07080d] border border-white/5 font-mono text-xs text-zinc-200 min-h-[130px] whitespace-pre-wrap leading-relaxed relative">
            {streamedText ? (
              <div>{streamedText}</div>
            ) : (
              <span className="text-zinc-500 italic flex items-center gap-2 py-4">
                <Terminal className="w-4 h-4 text-zinc-600 shrink-0" />
                <span>Click &quot;Run Simulation&quot; to test sub-15ms streaming and compare token throughput on GPT-5.6 Luna...</span>
              </span>
            )}
            {isStreaming && <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse" />}
          </div>

          {/* Live Metrics Row & Granular Cost Simulator Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Speed:</span>
              </div>
              <strong className="text-white font-bold">~{streamSpeed} tokens/sec</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Discount:</span>
              </div>
              <strong className="text-emerald-300 font-bold">Optimal $/perf</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>TTFT:</span>
              </div>
              <strong className="text-white font-bold">&lt; {ttftMs}ms</strong>
            </div>
          </div>

          {/* Sub-Cent Micro-Cost Summary Banner */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
            <div>
              Simulated Query: <strong className="text-white">{activeModel.promptTokens + activeModel.completionTokens} tokens</strong> ({activeModel.cachedTokens} cached) &rarr; <strong className="text-cyan-300">${simCost.netCostUsd.toFixed(6)} USD</strong>
            </div>
            <div className="text-emerald-400 font-bold">
              Direct Retail: ${simCost.retailTotalCostUsd.toFixed(6)} &bull; You save ${(simCost.totalSavingsUsd).toFixed(6)} USD
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Copy Pre-Formatted Drop-in Config */}
      <div className="space-y-2 relative z-10">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-200 font-sans flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-400 text-black text-[11px] font-mono flex items-center justify-center font-bold">3</span>
            <span>Your 1-Click Drop-in Configuration</span>
          </label>

          <Link
            href="/keys"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 transition-colors font-mono group"
          >
            <span>Claim $5 Free API Key</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="relative p-4 rounded-2xl bg-black/70 border border-white/10 font-mono text-xs text-zinc-300 shadow-xl">
          <pre className="overflow-x-auto whitespace-pre-wrap pr-20 leading-relaxed text-[11px] sm:text-xs">
            {activeTool.getCode(activeModel.id)}
          </pre>
          <button
            onClick={handleCopy}
            className={`absolute top-3 right-3 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
              copied
                ? 'bg-emerald-500 text-black font-black'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Config'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const NoCodeSandboxWidget = withErrorBoundary(BaseNoCodeSandboxWidget, {
  name: 'No-Code Sandbox Widget'
});
