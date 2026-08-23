'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { Code2, Layers, Zap, Terminal, Cpu, Copy, Check, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';

export default function ApiReferenceDocPage() {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const endpoints = [
    {
      method: 'POST',
      path: '/v1/chat/completions',
      desc: 'Creates a model response for the given chat conversation with sub-15ms TTFT (supports SSE streaming).',
      headers: ['Authorization: Bearer galx_live_...', 'Content-Type: application/json'],
      body: '{\n  "model": "gpt-5.6-sol",\n  "messages": [\n    {"role": "user", "content": "Hello!"}\n  ],\n  "stream": true\n}',
      curl: `curl https://api.galx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer galx_live_your_key_here" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'`
    },
    {
      method: 'POST',
      path: '/v1/messages',
      desc: 'Anthropic Messages API compatible endpoint for seamless drop-in routing.',
      headers: ['x-api-key: galx_live_...', 'anthropic-version: 2023-06-01', 'Content-Type: application/json'],
      body: '{\n  "model": "claude-3-5-sonnet",\n  "max_tokens": 1024,\n  "messages": [\n    {"role": "user", "content": "Hello Anthropic format!"}\n  ]\n}',
      curl: `curl https://api.galx.ai/v1/messages \\
  -H "x-api-key: galx_live_your_key_here" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-3-5-sonnet",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello Anthropic format!"}]
  }'`
    },
    {
      method: 'POST',
      path: '/v1/embeddings',
      desc: 'Generates high-dimensional vector representations for semantic search and RAG retrieval.',
      headers: ['Authorization: Bearer galx_live_...', 'Content-Type: application/json'],
      body: '{\n  "model": "text-embedding-3-small",\n  "input": "Sub-15ms vector embeddings at scale"\n}',
      curl: `curl https://api.galx.ai/v1/embeddings \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer galx_live_your_key_here" \\
  -d '{
    "model": "text-embedding-3-small",
    "input": "Sub-15ms vector embeddings at scale"
  }'`
    },
    {
      method: 'GET',
      path: '/v1/models',
      desc: 'Lists all available frontier AI models, max token context windows, and wholesale pricing tiers.',
      headers: ['Authorization: Bearer galx_live_...'],
      body: 'N/A',
      curl: `curl https://api.galx.ai/v1/models \\
  -H "Authorization: Bearer galx_live_your_key_here"`
    },
    {
      method: 'POST',
      path: '/v1/images/generations',
      desc: 'Generates high-definition visual assets given a text prompt using GPT-Image-2.',
      headers: ['Authorization: Bearer galx_live_...', 'Content-Type: application/json'],
      body: '{\n  "model": "openai-gpt-image-2",\n  "prompt": "Architectural schematic of futuristic AI datacenter",\n  "size": "1024x1024"\n}',
      curl: `curl https://api.galx.ai/v1/images/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer galx_live_your_key_here" \\
  -d '{
    "model": "openai-gpt-image-2",
    "prompt": "Architectural schematic of futuristic AI datacenter",
    "size": "1024x1024"
  }'`
    }
  ];

  const handleCopy = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'REST API & SSE Reference' }
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold">
              <Cpu className="w-3.5 h-3.5" />
              <span>OPENAPI & REST REFERENCE</span>
            </div>
            <Link
              href="/playground"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs font-mono uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Live API Sandbox →</span>
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">OpenAPI REST &amp; SSE Endpoint Reference</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-sans">
            GALXAI exposes standard OpenAI &amp; Anthropic-compatible endpoints with support for JSON request bodies, Server-Sent Events (SSE), and Bearer authentication with 0ms deterministic ambiguity resolution.
          </p>
        </div>

        <DocsSubNav />

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        <div className="space-y-6">
          {endpoints.map((ep, idx) => (
            <section key={ep.path} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-3 py-1 rounded-xl text-xs font-mono font-black ${ep.method === 'POST' ? 'bg-amber-400 text-black' : 'bg-cyan-500 text-black'}`}>
                    {ep.method}
                  </span>
                  <code className="text-base font-mono font-bold text-white">{ep.path}</code>
                </div>

                <button
                  onClick={() => handleCopy(idx, ep.curl)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5 shrink-0"
                >
                  {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIdx === idx ? 'Copied cURL' : 'Copy cURL Request'}</span>
                </button>
              </div>

              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                {ep.desc}
              </p>

              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Required Headers:</span>
                <div className="flex flex-wrap gap-2">
                  {ep.headers.map((h, i) => (
                    <code key={i} className="text-xs font-mono bg-black/60 px-3 py-1.5 rounded-xl border border-white/5 text-zinc-300">
                      {h}
                    </code>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">cURL Snippet:</span>
                <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-cyan-300 border border-white/5 overflow-x-auto">
                  <code>{ep.curl}</code>
                </pre>
              </div>
            </section>
          ))}
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
