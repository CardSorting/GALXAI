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
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export default function StreamingDocsPage() {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const snippets = {
    python: `from openai import OpenAI

# 1-Line Drop-in with stream=True
client = OpenAI(
    base_url="https://api.galxai.com/v1",
    api_key="galx_live_your_key_here"
)

stream = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Write a high-performance concurrent event loop in Go."}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)`,
    node: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://api.galxai.com/v1',
  apiKey: process.env.GALXAI_API_KEY
});

const stream = await client.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Explain zero-knowledge rollups.' }],
  stream: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`,
    curl: `curl https://api.galxai.com/v1/chat/completions \\
  -H "Authorization: Bearer galx_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -N --no-buffer \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Stream this response token by token."}],
    "stream": true
  }'`
  };

  const handleCopy = (code: string, tab: string) => {
    navigator.clipboard.writeText(code);
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
            { label: 'SSE Streaming Completions' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Server-Sent Events (SSE) Streaming Guide</h1>
            <p className="text-xs text-zinc-400">
              Low-latency token streaming over HTTP/1.1 and HTTP/2 with sub-15ms Time-To-First-Token (TTFT).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>SUB-15MS TTFT STREAMING</span>
            </span>
          </div>
        </div>

        <DocsSubNav />

        {/* Streaming Architecture Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
            <span className="text-zinc-500 text-[10px] uppercase font-sans">Protocol Standard</span>
            <div className="text-base font-bold text-white">W3C Server-Sent Events</div>
            <div className="text-[11px] text-zinc-400 font-sans"><code>text/event-stream</code> payload format</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-cyan-500/30 bg-cyan-500/5">
            <span className="text-cyan-400 text-[10px] uppercase font-sans font-semibold">Lease TTL Extension</span>
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
              <h3 className="text-base font-bold text-white font-mono">Python Async & Synchronous Streaming</h3>
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
      </main>
    </div>
  );
}
