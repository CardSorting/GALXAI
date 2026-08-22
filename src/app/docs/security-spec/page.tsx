'use client';

import React from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Lock,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Key,
  Layers,
  Server,
  FileCheck2
} from 'lucide-react';

export default function SecuritySpecDocsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'Architecture & Trust', href: '/docs/architecture' },
            { label: 'Security & Zero-Retention Spec' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Security & Zero-Retention Specifications</h1>
            <p className="text-xs text-zinc-400">
              Technical details on AES-256-GCM authenticated encryption, ephemeral RAM transit, and cryptographic memory zeroization.
            </p>
          </div>

          <Link
            href="/compliance"
            className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-2 transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Compliance Repository →</span>
          </Link>
        </div>

        <DocsSubNav />

        {/* Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-emerald-500/30 bg-emerald-500/5">
            <span className="text-emerald-400 text-[10px] uppercase font-sans font-semibold">Data Retention</span>
            <div className="text-xl font-bold text-emerald-300">Zero Persistent Storage</div>
            <div className="text-[11px] text-emerald-400 font-sans">0ms retention on prompts/completions</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-cyan-500/30 bg-cyan-500/5">
            <span className="text-cyan-400 text-[10px] uppercase font-sans font-semibold">In-Transit Encryption</span>
            <div className="text-xl font-bold text-cyan-300">TLS 1.3 / Perfect Secrecy</div>
            <div className="text-[11px] text-cyan-400 font-sans">End-to-end encrypted pipelines</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
            <span className="text-zinc-500 text-[10px] uppercase font-sans">Vault Isolation</span>
            <div className="text-xl font-bold text-white">AES-256-GCM + AAD</div>
            <div className="text-[11px] text-zinc-400 font-sans">Strict cryptographic tenant isolation</div>
          </div>
        </div>

        {/* Section: Ephemeral Pipe Protocol */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              1. Ephemeral Pipe Architecture (Zero Disk Writes)
            </h2>
            <p className="text-xs text-zinc-400">
              Unlike traditional logging gateways, GALXAI routes tokens directly in volatile RAM buffers.
            </p>
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            Requests and streaming responses flow through ephemeral chunk buffers in volatile process memory. No prompts, completion tokens, code snippets, or user metadata are ever persisted to disk, relational databases, or cold object storage.
          </p>
        </div>

        {/* Section: Memory Zeroization */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-400" />
              2. Cryptographic Memory Zeroization
            </h2>
            <p className="text-xs text-zinc-400">
              Deterministic buffer wiping upon HTTP stream termination.
            </p>
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            Immediately upon HTTP stream termination or socket disconnect, internal buffer segments undergo cryptographic memory zeroization:
          </p>

          <pre className="p-4 rounded-2xl bg-black/60 border border-white/5 font-mono text-xs text-cyan-300 overflow-x-auto">
            <code>{`// Deterministic memory zeroization in runtime heap
crypto.randomFillSync(buffer);
buffer.fill(0);`}</code>
          </pre>
        </div>
      </main>
    </div>
  );
}
