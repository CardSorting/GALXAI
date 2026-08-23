'use client';

import React, { useState } from 'react';
import {
  Play,
  Clock,
  Zap,
  Coins,
  Sparkles,
  Info
} from 'lucide-react';
import type { ModelSpecItem } from '@/core/contracts/GalxContracts';
import { getSandboxPresets } from './model-card-data';

interface ModelSandboxSectionProps {
  model: ModelSpecItem;
}

export function ModelSandboxSection({ model }: ModelSandboxSectionProps) {
  const [selectedPromptKey, setSelectedPromptKey] = useState<'refactor' | 'audit' | 'json' | 'architecture'>('refactor');
  const [customPromptText, setCustomPromptText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamedText, setStreamedText] = useState<string>('');
  const [activeInspectorTab, setActiveInspectorTab] = useState<'rendered' | 'request' | 'response' | 'headers' | 'cost'>('rendered');
  const [streamMetrics, setStreamMetrics] = useState({
    ttftMs: 12,
    tokensPerSec: 148,
    totalTokens: 0,
    liveCost: 0,
    retailCost: 0,
    cacheStatus: 'HIT (75% discount)'
  });

  const sandboxPresets = getSandboxPresets(model);

  const handleRunSimulation = () => {
    if (isStreaming) return;
    setIsStreaming(true);
    setStreamedText('');

    const targetOutput = sandboxPresets[selectedPromptKey].response;
    const chunks = targetOutput.split(' ');
    let currentIdx = 0;
    let accumulated = '';

    const interval = setInterval(() => {
      if (currentIdx >= chunks.length) {
        clearInterval(interval);
        setIsStreaming(false);
        setStreamMetrics((prev) => ({
          ...prev,
          totalTokens: Math.round(targetOutput.length / 3.8),
          liveCost: Number(((targetOutput.length / 3.8 / 1_000_000) * model.inputPricePer1M).toFixed(6)),
          retailCost: Number(((targetOutput.length / 3.8 / 1_000_000) * (model.listPricePer1MInput ?? model.inputPricePer1M)).toFixed(6))
        }));
        return;
      }

      accumulated += (currentIdx === 0 ? '' : ' ') + chunks.slice(currentIdx, currentIdx + 3).join(' ');
      setStreamedText(accumulated);
      currentIdx += 3;
    }, 40);
  };

  const mockRequestJson = JSON.stringify(
    {
      model: model.id,
      messages: [
        { role: 'system', content: 'You are an expert system architect and polyglot engineer.' },
        { role: 'user', content: customPromptText || sandboxPresets[selectedPromptKey].prompt }
      ],
      stream: true,
      temperature: 0.2,
      max_tokens: 4096
    },
    null,
    2
  );

  const mockResponseJson = JSON.stringify(
    {
      id: 'chatcmpl-galx-live-' + Math.random().toString(36).substring(2, 9),
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: model.id,
      choices: [
        {
          index: 0,
          delta: { content: '...' },
          finish_reason: null
        }
      ],
      usage: {
        prompt_tokens: 142,
        completion_tokens: streamMetrics.totalTokens || 88,
        total_tokens: (streamMetrics.totalTokens || 88) + 142,
        prompt_tokens_details: {
          cached_tokens: 120
        }
      }
    },
    null,
    2
  );

  const mockHeadersText = `HTTP/2 200 OK
content-type: text/event-stream; charset=utf-8
x-galx-model: ${model.id}
x-galx-transit-latency-ms: 12.4
x-galx-prompt-cache: HIT (75% discount applied)
x-galx-effective-discount: -${model.discountPercentage ?? 25}%
x-galx-zero-retention: active
server: cloudflare-anycast-edge`;

  return (
    <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-cyan-500/25 bg-gradient-to-b from-[#0a0d18] to-[#07080d] shadow-2xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-bold">
            <Play className="w-3 h-3 fill-cyan-400 text-cyan-400" />
            <span>INTERACTIVE IN-BROWSER SANDBOX &amp; INSPECTOR</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Live Test {model.name} (Zero Auth Required)
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl font-sans">
            Simulate real-time streaming, inspect raw HTTP request/response JSON payloads, and verify sub-15ms headers.
          </p>
        </div>

        {/* Preset Prompts Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold font-mono">
          {(
            [
              { id: 'refactor', label: 'Refactor' },
              { id: 'audit', label: 'Bug Audit' },
              { id: 'json', label: 'Strict JSON' },
              { id: 'architecture', label: 'Architecture' }
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setSelectedPromptKey(preset.id);
                setCustomPromptText('');
                setStreamedText('');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedPromptKey === preset.id && !customPromptText
                  ? 'bg-cyan-500 text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sandbox Prompt Input / Preview */}
      <div className="space-y-2 font-mono">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Input Prompt:</span>
          <span className="text-[11px] text-zinc-500">
            {sandboxPresets[selectedPromptKey].desc}
          </span>
        </div>

        <div className="relative">
          <textarea
            value={customPromptText || sandboxPresets[selectedPromptKey].prompt}
            onChange={(e) => {
              setCustomPromptText(e.target.value);
              setStreamedText('');
            }}
            rows={3}
            placeholder="Type your own prompt here or use one of the presets above..."
            className="w-full p-4 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 resize-none shadow-inner"
          />

          <button
            onClick={handleRunSimulation}
            disabled={isStreaming}
            className="absolute bottom-3.5 right-3.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50 font-sans"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isStreaming ? 'Streaming Tokens...' : 'Run Live Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Inspector Tab Bar */}
      <div className="space-y-3 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-1.5 text-xs">
            {(
              [
                { id: 'rendered', label: 'Rendered Output' },
                { id: 'request', label: 'Raw Request JSON' },
                { id: 'response', label: 'Raw Response JSON' },
                { id: 'headers', label: 'HTTP Response Headers' },
                { id: 'cost', label: 'Live Cost Breakdown' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveInspectorTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeInspectorTab === tab.id
                    ? 'bg-white/10 text-white font-bold border border-white/15 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Live Metrics Pill */}
          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              TTFT: <strong className="text-white">12ms</strong>
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Throughput: <strong className="text-white">~148 tok/s</strong>
            </span>
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              Discount: <strong className="text-emerald-300">-{model.discountPercentage ?? 25}%</strong>
            </span>
          </div>
        </div>

        {/* Inspector Display Window */}
        <div className="rounded-2xl bg-[#06070c] border border-white/10 p-5 text-xs text-zinc-200 min-h-[200px] max-h-[400px] overflow-y-auto overscroll-contain relative selection:bg-cyan-500 selection:text-black">
          {activeInspectorTab === 'rendered' && (
            <div className="whitespace-pre-wrap leading-relaxed">
              {streamedText ? (
                streamedText
              ) : (
                <div className="text-zinc-500 italic flex flex-col items-center justify-center py-10 space-y-2 font-sans">
                  <Sparkles className="w-6 h-6 text-zinc-600" />
                  <span>Click &quot;Run Live Simulation&quot; above to start streaming tokens in real time...</span>
                </div>
              )}
              {isStreaming && <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse" />}
            </div>
          )}

          {activeInspectorTab === 'request' && (
            <pre className="text-cyan-300 overflow-x-auto">
              <code>{mockRequestJson}</code>
            </pre>
          )}

          {activeInspectorTab === 'response' && (
            <pre className="text-emerald-300 overflow-x-auto">
              <code>{mockResponseJson}</code>
            </pre>
          )}

          {activeInspectorTab === 'headers' && (
            <pre className="text-amber-300 overflow-x-auto">
              <code>{mockHeadersText}</code>
            </pre>
          )}

          {activeInspectorTab === 'cost' && (
            <div className="space-y-4 font-sans text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-zinc-500 text-[10px] uppercase">Standard Upstream Cost</span>
                  <div className="text-base font-bold text-zinc-400 line-through">
                    ${streamMetrics.retailCost || '0.00084'} USD
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-zinc-500 text-[10px] uppercase">GALXAI Wholesale Cost</span>
                  <div className="text-base font-bold text-emerald-300">
                    ${streamMetrics.liveCost || '0.00042'} USD
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <span className="text-emerald-400 text-[10px] uppercase font-bold">Net Single Call Savings</span>
                  <div className="text-base font-bold text-emerald-300">
                    -50% Below Retail
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  75% Prompt Caching applied automatically on matching system instructions. Zero manual configuration required.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
