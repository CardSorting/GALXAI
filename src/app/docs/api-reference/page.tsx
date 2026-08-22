import React from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Code2, Layers, Zap, Terminal } from 'lucide-react';

export const metadata: Metadata = {
  title: 'OpenAPI REST & SSE Endpoint Reference | GALXAI Docs',
  description: 'Complete API reference for POST /v1/chat/completions, GET /v1/models, POST /v1/images/generations, and management endpoints.',
};

export default function ApiReferenceDocPage() {
  const endpoints = [
    {
      method: 'POST',
      path: '/v1/chat/completions',
      desc: 'Creates a model response for the given chat conversation (supports SSE streaming).',
      headers: ['Authorization: Bearer galx_live_...', 'Content-Type: application/json'],
      body: '{"model": "gpt-5.6-sol", "messages": [{"role": "user", "content": "Hello!"}], "stream": true}'
    },
    {
      method: 'GET',
      path: '/v1/models',
      desc: 'Lists the currently available models in the pool.',
      headers: ['Authorization: Bearer galx_live_...'],
      body: 'N/A'
    },
    {
      method: 'POST',
      path: '/v1/images/generations',
      desc: 'Generates visual images given a prompt using GPT-Image-2 or Grok Imagine.',
      headers: ['Authorization: Bearer galx_live_...', 'Content-Type: application/json'],
      body: '{"model": "openai-gpt-image-2", "prompt": "Cyberpunk cityscape", "size": "1024x1024"}'
    },
    {
      method: 'GET',
      path: '/api/pool/stats',
      desc: 'Returns live pool telemetry, active shards count, and token velocity throughput.',
      headers: ['Content-Type: application/json'],
      body: 'N/A'
    },
    {
      method: 'POST',
      path: '/api/shards',
      desc: 'Vaults and registers an API key into the BYOQ shard pool with live preflight validation.',
      headers: ['Content-Type: application/json'],
      body: '{"apiKey": "sk-...", "accountLabel": "My Shard", "provider": "openai", "shardMode": "pooled"}'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'API Reference' }
          ]}
        />

        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
            <Code2 className="w-3.5 h-3.5" />
            <span>REST API & SSE REFERENCE</span>
          </div>
          <h1 className="text-3xl font-black text-white">OpenAPI REST Endpoint Reference</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            All endpoints are served from <code className="text-cyan-300 font-mono">http://localhost:3000</code>.
          </p>
        </div>

        <div className="space-y-6">
          {endpoints.map((ep) => (
            <div key={ep.path} className="glass-card rounded-3xl p-6 sm:p-8 border border-white/5 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                  ep.method === 'POST' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}>
                  {ep.method}
                </span>
                <code className="text-base font-bold text-white font-mono">{ep.path}</code>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">{ep.desc}</p>

              <div className="space-y-2 pt-2">
                <div className="text-[10px] font-bold uppercase text-zinc-500 font-mono">Example Payload</div>
                <pre className="p-3.5 rounded-2xl bg-black/60 font-mono text-xs text-zinc-300 border border-white/5 overflow-x-auto selection:bg-indigo-500 selection:text-white">
                  <code>{ep.body}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
