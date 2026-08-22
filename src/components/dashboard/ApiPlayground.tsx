'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Send,
  Terminal,
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  Rocket,
  Cpu,
  Layers,
  Copy,
  Plus,
  Trash2,
  Code2
} from 'lucide-react';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function ApiPlayground() {
  const searchParams = useSearchParams();
  const initialModel = searchParams.get('model') || 'gpt-5.6-sol';

  const [selectedModel, setSelectedModel] = useState(initialModel);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'You are a world-class coding and reasoning assistant.' },
    { role: 'user', content: 'Write a high-performance concurrent lease allocator in TypeScript with monotonic fencing tokens.' }
  ]);
  const [stream, setStream] = useState(true);
  const [temperature, setTemperature] = useState(0.7);
  const [apiKey, setApiKey] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [telemetry, setTelemetry] = useState<{
    shardId?: string;
    modelUsed?: string;
    provider?: string;
    latencyMs?: number;
    tokensEstimated?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const urlModel = searchParams.get('model');
    if (urlModel) {
      setSelectedModel(urlModel);
    }
  }, [searchParams]);

  const addMessage = (role: 'user' | 'assistant') => {
    setMessages([...messages, { role, content: '' }]);
  };

  const updateMessage = (index: number, content: string) => {
    const updated = [...messages];
    updated[index].content = content;
    setMessages(updated);
  };

  const removeMessage = (index: number) => {
    if (messages.length <= 1) return;
    setMessages(messages.filter((_, i) => i !== index));
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setError(null);
    setOutput('');
    setTelemetry(null);

    const start = Date.now();
    abortControllerRef.current = new AbortController();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey.trim()) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }

      const modelSpec = EXCLUSIVE_MODEL_CATALOG.find(m => m.id === selectedModel);
      const isImage = modelSpec?.category === 'image';

      if (isImage) {
        const lastUserPrompt = messages.filter(m => m.role === 'user').pop()?.content || 'Cyberpunk landscape';
        const res = await fetch('/v1/images/generations', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: selectedModel,
            prompt: lastUserPrompt.trim(),
            size: '1024x1024'
          }),
          signal: abortControllerRef.current.signal
        });

        const data = await res.json();
        const latencyMs = Date.now() - start;

        if (!res.ok || data.error) {
          throw new Error(data.error?.message || data.error || 'Image generation failed');
        }

        setTelemetry({
          shardId: data.shardId || 'shard_image_pool',
          modelUsed: data.modelUsed || selectedModel,
          provider: modelSpec?.provider,
          latencyMs
        });

        setOutput(JSON.stringify(data, null, 2));
      } else {
        const res = await fetch('/v1/chat/completions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: selectedModel,
            messages,
            stream,
            temperature: Number(temperature)
          }),
          signal: abortControllerRef.current.signal
        });

        const shardId = res.headers.get('x-galx-shard-id') || 'pool_auto_leased';
        const modelUsed = res.headers.get('x-galx-model') || selectedModel;
        const provider = res.headers.get('x-galx-provider') || modelSpec?.provider;

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${res.status}: Router failed`);
        }

        if (stream && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let accumulated = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                const payload = trimmed.substring(6);
                if (payload === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(payload);
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  accumulated += content;
                  setOutput(accumulated);
                } catch {}
              }
            }
          }

          const latencyMs = Date.now() - start;
          setTelemetry({
            shardId,
            modelUsed,
            provider,
            latencyMs,
            tokensEstimated: Math.ceil(accumulated.length / 4)
          });
        } else {
          const json = await res.json();
          const latencyMs = Date.now() - start;
          const content = json.choices?.[0]?.message?.content || JSON.stringify(json, null, 2);
          setOutput(content);
          setTelemetry({
            shardId,
            modelUsed,
            provider,
            latencyMs,
            tokensEstimated: json.usage?.total_tokens
          });
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Execution error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyOutput = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel rounded-3xl p-6 lg:p-8 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            Universal Model Playground & Sandbox
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Multi-turn conversation streaming with continuous rate metering and leased shard inspection.
          </p>
        </div>

        {telemetry && (
          <div className="flex items-center gap-3 text-xs bg-black/40 px-3.5 py-1.5 rounded-xl border border-white/10 font-mono">
            <span className="text-zinc-400">Leased: <strong className="text-cyan-300">{telemetry.shardId}</strong></span>
            <span className="text-zinc-400">Latency: <strong className="text-emerald-400">{telemetry.latencyMs}ms</strong></span>
            {telemetry.tokensEstimated && (
              <span className="text-zinc-400">Tokens: <strong className="text-amber-300">~{telemetry.tokensEstimated}</strong></span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Model Selection Tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Select Model Engine</label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {EXCLUSIVE_MODEL_CATALOG.map((m) => {
            const isSelected = selectedModel === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? m.provider === 'xai-grok'
                      ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                      : 'bg-indigo-500/20 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                    : 'bg-black/30 border-white/5 hover:border-white/20 hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white truncate">{m.id}</span>
                  {m.provider === 'xai-grok' ? (
                    <Rocket className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 line-clamp-1 mt-1">{m.name}</p>
                <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                  <span>{m.category === 'image' ? 'Image Synth' : `${m.contextWindowTokens / 1000}K Context`}</span>
                  <span className="uppercase font-bold text-zinc-400">{m.provider}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages & Output Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Multi-turn messages & Controls */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-zinc-400">Conversation Turns</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => addMessage('user')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-zinc-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add User
              </button>
              <button
                onClick={() => addMessage('assistant')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-zinc-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Assistant
              </button>
            </div>
          </div>

          {/* Message List */}
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {messages.map((msg, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase">
                  <span className={msg.role === 'system' ? 'text-amber-400' : msg.role === 'user' ? 'text-cyan-400' : 'text-emerald-400'}>
                    {msg.role}
                  </span>
                  {messages.length > 1 && (
                    <button
                      onClick={() => removeMessage(idx)}
                      className="text-zinc-600 hover:text-rose-400 p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <textarea
                  rows={msg.role === 'system' ? 2 : 3}
                  value={msg.content}
                  onChange={(e) => updateMessage(idx, e.target.value)}
                  placeholder={`Enter ${msg.role} message...`}
                  className="w-full bg-transparent text-xs text-white font-mono focus:outline-none resize-none placeholder:text-zinc-600"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1 uppercase">Temperature: {temperature}</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Stream Response</span>
              <button
                type="button"
                onClick={() => setStream(!stream)}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative ${
                  stream ? 'bg-indigo-600' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    stream ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExecute}
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isLoading ? 'Streaming from Leased Shard...' : 'Execute Request'}</span>
          </button>
        </div>

        {/* Right: Live Terminal Output */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-zinc-400 uppercase">Live Output Stream</span>
            {output && (
              <button
                onClick={handleCopyOutput}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>
          <div className="flex-1 min-h-[360px] p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs text-zinc-200 overflow-y-auto whitespace-pre-wrap selection:bg-cyan-500 selection:text-black">
            {output ? (
              output
            ) : (
              <span className="text-zinc-600 italic">
                Ready. Click "Execute Request" to stream responses from the pooled quota shards.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
