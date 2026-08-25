'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Radio,
  Code2,
  Copy,
  Check,
  Zap,
  Terminal,
  Play,
  RotateCcw,
  Activity,
  Layers,
} from 'lucide-react';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';

export function StreamingClient() {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [streamChunks, setStreamChunks] = useState<string[]>([]);
  const [rawSseChunks, setRawSseChunks] = useState<string[]>([]);

  const sampleText = 'GALXAI streams frontier AI responses over Server-Sent Events (SSE) with sub-15ms Time-To-First-Token (TTFT), automatic 75% prompt caching discounts, and zero data retention.';

  const handleStartSimulation = () => {
    if (isSimulating) {
      setIsSimulating(false);
      return;
    }

    setIsSimulating(true);
    setStreamChunks([]);
    setRawSseChunks([]);

    const words = sampleText.split(' ');
    let idx = 0;

    const interval = setInterval(() => {
      if (idx >= words.length) {
        clearInterval(interval);
        setIsSimulating(false);
        setRawSseChunks((prev) => [...prev, 'data: [DONE]\n\n']);
        return;
      }

      const word = words[idx] + ' ';
      setStreamChunks((prev) => [...prev, word]);
      setRawSseChunks((prev) => [
        ...prev,
        `data: {"choices":[{"delta":{"content":"${word.trim()}"},"index":0}]}\n\n`,
      ]);
      idx++;
    }, 40);
  };

  const snippets = {
    python: `from openai import OpenAI

# 1-Line Drop-in replacement for OpenAI SDK
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_key_here"
)

stream = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Write a high-performance concurrent event loop in Go."}],
    stream=True
)

for chunk in stream:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)`,
    node: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://api.galx.ai/v1',
  apiKey: process.env.GALXAI_API_KEY || 'galx_live_your_key_here'
});

const stream = await client.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Explain zero-knowledge rollups in 3 bullets.' }],
  stream: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`,
    vercel: `import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

const galxai = openai({
  baseURL: "https://api.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: galxai("gpt-5.6-sol"),
    messages,
  });
  return result.toDataStreamResponse();
}`,
    curl: `curl https://api.galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer galx_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -N --no-buffer \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Stream this response token by token."}],
    "stream": true
  }'`,
  };

  const handleCopy = async (code: string, tab: string) => {
    await safeCopyToClipboard(code);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'Getting Started', href: '/docs/quickstart' },
            { label: 'SSE Streaming Completions' },
          ]}
        />

        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>SUB-15MS TTFT STREAMING</span>
            </div>
            <Link
              href="/keys/new"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase font-mono tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Claim Key ($5 Credit)</span>
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Server-Sent Events (SSE) Streaming Guide</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-sans">
            Stream tokens in real time over standard HTTP/1.1 and HTTP/2 connections with sub-15ms Time-To-First-Token (TTFT) and continuous keep-alive heartbeats.
          </p>
        </div>

        <DocsSubNav />

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* Interactive SSE Visualizer Sandbox */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-cyan-500/30 bg-cyan-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold">
                <Activity className="w-3.5 h-3.5" />
                <span>INTERACTIVE SSE STREAM SIMULATOR</span>
              </div>
              <h2 className="text-xl font-bold text-white">Watch Token Chunks Stream Live</h2>
              <p className="text-xs text-zinc-400">See how client SDKs receive and parse incremental token payloads in real time.</p>
            </div>

            <button
              onClick={handleStartSimulation}
              className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                isSimulating
                  ? 'bg-rose-500 hover:bg-rose-400 text-white'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-black'
              }`}
            >
              {isSimulating ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-black" />}
              <span>{isSimulating ? 'Stop Stream' : 'Run Live SSE Stream (12ms TTFT)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Rendered Text Box */}
            <div className="p-4 rounded-2xl bg-black/70 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-white/5 pb-2">
                <span>Client Rendered Text</span>
                <span className="text-emerald-400 font-bold">TTFT: 12ms</span>
              </div>
              <p className="text-zinc-200 text-xs leading-relaxed min-h-[120px] font-sans">
                {streamChunks.join('') || <span className="text-zinc-600 italic">Click &quot;Run Live SSE Stream&quot; above to simulate token streaming...</span>}
              </p>
            </div>

            {/* Raw SSE Wire Format */}
            <div className="p-4 rounded-2xl bg-black/90 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-white/5 pb-2">
                <span>Wire Format (text/event-stream)</span>
                <span className="text-cyan-300 font-mono">200 OK</span>
              </div>
              <pre className="text-cyan-400/90 text-[11px] overflow-y-auto max-h-[120px] leading-tight">
                {rawSseChunks.length > 0 ? rawSseChunks.join('') : '// Incoming raw SSE stream frames will appear here...'}
              </pre>
            </div>
          </div>
        </div>

        {/* Architecture Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
            <span className="text-zinc-500 text-[10px] uppercase font-sans">Protocol Standard</span>
            <div className="text-base font-bold text-white">W3C Server-Sent Events</div>
            <div className="text-[11px] text-zinc-400 font-sans"><code>text/event-stream</code> payload format</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-cyan-500/30 bg-cyan-500/5">
            <span className="text-cyan-400 text-[10px] uppercase font-sans font-semibold">Stream Keep-Alive</span>
            <div className="text-base font-bold text-cyan-300">Continuous Heartbeat</div>
            <div className="text-[11px] text-cyan-400/80 font-sans">Prevents mid-stream timeout drops</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-emerald-500/30 bg-emerald-500/5">
            <span className="text-emerald-400 text-[10px] uppercase font-sans font-semibold">Memory Zeroization</span>
            <div className="text-base font-bold text-emerald-300">Instant Heap Purge</div>
            <div className="text-[11px] text-emerald-400 font-sans">0ms data retention upon stream close</div>
          </div>
        </div>

        {/* Python Streaming Snippet */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-bold text-white font-mono">Python Async &amp; Synchronous Streaming</h3>
            </div>
            <button
              onClick={() => handleCopy(snippets.python, 'python')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5"
            >
              {copiedTab === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTab === 'python' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-black/60 border border-white/5 font-mono text-xs text-cyan-300 overflow-x-auto">
            <code>{snippets.python}</code>
          </pre>
        </div>

        {/* Node.js / TypeScript Streaming Snippet */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h3 className="text-base font-bold text-white font-mono">Node.js / TypeScript Async Iterators</h3>
            </div>
            <button
              onClick={() => handleCopy(snippets.node, 'node')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5"
            >
              {copiedTab === 'node' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTab === 'node' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-black/60 border border-white/5 font-mono text-xs text-amber-300 overflow-x-auto">
            <code>{snippets.node}</code>
          </pre>
        </div>

        {/* Vercel AI SDK Snippet */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-base font-bold text-white font-mono">Next.js App Router &amp; Vercel AI SDK (streamText)</h3>
            </div>
            <button
              onClick={() => handleCopy(snippets.vercel, 'vercel')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5"
            >
              {copiedTab === 'vercel' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTab === 'vercel' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-black/60 border border-white/5 font-mono text-xs text-emerald-300 overflow-x-auto">
            <code>{snippets.vercel}</code>
          </pre>
        </div>

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
