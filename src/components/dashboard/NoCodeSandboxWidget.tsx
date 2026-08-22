'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Laptop,
  Sparkles,
  Zap,
  Check,
  Copy,
  ArrowRight,
  Play,
  Flame,
  Rocket,
  Shield,
  Smile,
  DollarSign,
  TrendingDown,
  Clock,
  Key
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';

export function NoCodeSandboxWidget() {
  const [selectedTool, setSelectedTool] = useState<'cursor' | 'chat_app' | 'make' | 'python'>('cursor');
  const [selectedModel, setSelectedModel] = useState<'gpt-5.6-sol' | 'grok-4.5'>('gpt-5.6-sol');
  const [simulatedPrompt, setSimulatedPrompt] = useState('Explain why sub-15ms AI model routing cuts token costs without quality loss.');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [copied, setCopied] = useState(false);

  const sampleResponses: Record<string, string> = {
    'gpt-5.6-sol': `GALXAI's sub-15ms routing engine routes every request through continuous token capacity pools. 

1. **Wholesale Rate Arb**: By aggregating millions of enterprise tokens, GALXAI passes 25%–40% bulk discounts directly to you.
2. **Zero Quality Loss**: The prompt hits the exact genuine GPT-5.6 Sol weights with identical parameters.
3. **75% Prompt Caching**: Repeated system prompts automatically trigger prefix caching rebates.
4. **Zero Refactoring**: Just change the Base URL in Cursor, Windsurf, or your Python SDK.`,
    'grok-4.5': `xAI Grok 4.5 via GALXAI gives you ultra-low latency real-time reasoning at 32% wholesale discount.

• **Real-time Routing**: Sub-1ms gateway proxy overhead.
• **High Concurrency**: Automatically distributed across active enterprise shards.
• **Zero-Retention**: Memory zeroization ensures data never touches disk.
• **1-Line Switch**: Point baseURL to api.galxai.com/v1 with your live key.`
  };

  const toolConfigs = {
    cursor: {
      name: 'Cursor & Windsurf IDE',
      desc: 'In Cursor Settings > Models > Override Base URL:',
      code: `Base URL: https://api.galxai.com/v1\nAPI Key: galx_live_your_key_here\nModel: ${selectedModel}`
    },
    chat_app: {
      name: 'LibreChat / TypingMind / OpenWebUI',
      desc: 'In App Settings > OpenAI API Configuration:',
      code: `API Base URL: https://api.galxai.com/v1\nAPI Key: galx_live_your_key_here`
    },
    make: {
      name: 'Make.com & Zapier No-Code',
      desc: 'In HTTP / Webhook module headers:',
      code: `URL: https://api.galxai.com/v1/chat/completions\nAuthorization: Bearer galx_live_your_key_here\nContent-Type: application/json`
    },
    python: {
      name: 'Python / Node.js 1-Line Drop-in',
      desc: 'Standard OpenAI client with 1 changed line:',
      code: `from openai import OpenAI\n\nclient = OpenAI(\n    base_url="https://api.galxai.com/v1",\n    api_key="galx_live_your_key_here"\n)\nresponse = client.chat.completions.create(model="${selectedModel}", messages=[...])`
    }
  };

  const handleSimulate = () => {
    setIsStreaming(true);
    setStreamedText('');
    const fullText = sampleResponses[selectedModel];
    let i = 0;

    const interval = setInterval(() => {
      if (i < fullText.length) {
        setStreamedText((prev) => prev + fullText.charAt(i));
        i++;
      } else {
        clearInterval(interval);
        setIsStreaming(false);
      }
    }, 12);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(toolConfigs[selectedTool].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-cyan-500/25 bg-cyan-500/5 relative overflow-hidden">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300 uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Zero-Code Simulator</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white font-sans">
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
          description="Interactive prompt simulator testing GPT-5.6 and Grok 4.5 with live wholesale token savings."
        />
      </div>

      {/* Step 1: Choose Tool */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-300 font-sans flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-cyan-400 text-black text-[11px] font-mono flex items-center justify-center font-bold">1</span>
          <span>Where will you use GALXAI?</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-sans text-xs">
          {(['cursor', 'chat_app', 'make', 'python'] as const).map((tool) => (
            <button
              key={tool}
              onClick={() => setSelectedTool(tool)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between space-y-1 ${
                selectedTool === tool
                  ? 'bg-cyan-500/20 text-white border-cyan-400 shadow-md shadow-cyan-500/10'
                  : 'bg-black/40 text-zinc-400 hover:text-white border-white/10 hover:bg-white/5'
              }`}
            >
              <span className="font-bold">{toolConfigs[tool].name}</span>
              <span className="text-[10px] text-zinc-400 line-clamp-1">{toolConfigs[tool].desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Interactive Prompt & Live Stream */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-300 font-sans flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-amber-400 text-black text-[11px] font-mono flex items-center justify-center font-bold">2</span>
          <span>Test Live Model Output &amp; Savings</span>
        </label>

        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-mono">Model:</span>
              <button
                onClick={() => setSelectedModel('gpt-5.6-sol')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  selectedModel === 'gpt-5.6-sol'
                    ? 'bg-amber-400 text-black shadow-sm'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                GPT-5.6 Sol (2M Context)
              </button>
              <button
                onClick={() => setSelectedModel('grok-4.5')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  selectedModel === 'grok-4.5'
                    ? 'bg-emerald-400 text-black shadow-sm'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                xAI Grok 4.5
              </button>
            </div>

            <button
              onClick={handleSimulate}
              disabled={isStreaming}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isStreaming ? 'Streaming...' : 'Run Simulation'}</span>
            </button>
          </div>

          {/* Terminal Output Area */}
          <div className="p-4 rounded-xl bg-[#07080d] border border-white/5 font-mono text-xs text-zinc-200 min-h-[120px] whitespace-pre-wrap leading-relaxed">
            {streamedText ? (
              streamedText
            ) : (
              <span className="text-zinc-500 italic">
                Click &quot;Run Simulation&quot; to test sub-15ms streaming and compare wholesale token throughput...
              </span>
            )}
            {isStreaming && <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse" />}
          </div>

          {/* Live Metrics Row */}
          <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-zinc-400 pt-1">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Speed: ~142 tokens/sec</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>Discount: -38% Wholesale</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>TTFT: &lt; 14ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Copy Pre-Formatted Drop-in Config */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-300 font-sans flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-400 text-black text-[11px] font-mono flex items-center justify-center font-bold">3</span>
            <span>Your 1-Click Drop-in Configuration</span>
          </label>

          <Link
            href="/keys/new"
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200 transition-colors font-mono"
          >
            <span>Claim $5 Free API Key</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="relative p-3 rounded-2xl bg-black/70 border border-white/10 font-mono text-xs text-zinc-300">
          <pre className="overflow-x-auto whitespace-pre-wrap pr-16">{toolConfigs[selectedTool].code}</pre>
          <button
            onClick={handleCopy}
            className={`absolute top-2.5 right-2.5 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-500 text-black'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
