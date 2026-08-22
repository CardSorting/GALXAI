import React from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { Code2, Layers, Zap, Terminal, Cpu } from 'lucide-react';

export const metadata: Metadata = {
  title: 'OpenAPI REST & SSE Endpoint Reference | GALXAI Docs',
  description: 'Complete API reference for POST /v1/chat/completions, GET /v1/models, POST /v1/images/generations, and management endpoints.',
};

export default function ApiReferenceDocPage() {
  const endpoints = [
    {
      method: 'POST',
      path: '/v1/chat/completions',
      desc: 'Creates a model response for the given chat conversation with sub-15ms TTFT (supports SSE streaming).',
      headers: ['Authorization: Bearer galx_live_...', 'Content-Type: application/json'],
      body: '{"model": "gpt-5.6-sol", "messages": [{"role": "user", "content": "Hello!"}], "stream": true}'
    },
    {
      method: 'GET',
      path: '/v1/models',
      desc: 'Lists all available frontier AI models, max token context windows, and wholesale pricing tiers.',
      headers: ['Authorization: Bearer galx_live_...'],
      body: 'N/A'
    },
    {
      method: 'POST',
      path: '/v1/images/generations',
      desc: 'Generates high-definition visual assets given a text prompt using GPT-Image-2.',
      headers: ['Authorization: Bearer galx_live_...', 'Content-Type: application/json'],
      body: '{"model": "openai-gpt-image-2", "prompt": "Architectural schematic of futuristic AI datacenter", "size": "1024x1024"}'
    },
    {
      method: 'GET',
      path: '/api/pool/stats',
      desc: 'Returns live gateway router telemetry, active model throughput, and global latency percentiles.',
      headers: ['Content-Type: application/json'],
      body: 'N/A'
    }
  ];

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

        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold">
            <Cpu className="w-3.5 h-3.5" />
            <span>REST API SPECIFICATION</span>
          </div>
          <h1 className="text-3xl font-black text-white">OpenAPI REST & SSE Endpoint Reference</h1>
          <p className="text-sm text-zinc-400 leading-relaxed font-sans">
            GALXAI exposes standard OpenAI-compatible endpoints with support for JSON request bodies, Server-Sent Events (SSE), and Bearer authentication.
          </p>
        </div>

        <DocsSubNav />

        <div className="space-y-6">
          {endpoints.map((ep) => (
            <section key={ep.path} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-3 py-1 rounded-xl text-xs font-mono font-black ${ep.method === 'POST' ? 'bg-amber-400 text-black' : 'bg-cyan-500 text-black'}`}>
                  {ep.method}
                </span>
                <code className="text-base font-mono font-bold text-white">{ep.path}</code>
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

              {ep.body !== 'N/A' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Example Request Body:</span>
                  <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-cyan-300 border border-white/5 overflow-x-auto">
                    <code>{ep.body}</code>
                  </pre>
                </div>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
