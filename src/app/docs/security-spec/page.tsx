'use client';

import React, { useState } from 'react';
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
  FileCheck2,
  Cpu,
  Flame,
  Play,
  RotateCcw
} from 'lucide-react';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';

export default function SecuritySpecDocsPage() {
  const [zeroized, setZeroized] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  const triggerWipe = () => {
    setIsWiping(true);
    setTimeout(() => {
      setIsWiping(false);
      setZeroized(true);
    }, 600);
  };

  const resetWipe = () => {
    setZeroized(false);
  };

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

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>CRYPTOGRAPHIC ZERO-DATA-RETENTION (ZDR)</span>
            </div>
            <Link
              href="/compliance"
              className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Compliance Repository →</span>
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Security &amp; Zero-Retention Specifications</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-sans">
            Technical specifications on AES-256-GCM authenticated encryption, ephemeral RAM transit, and cryptographic memory zeroization upon HTTP stream completion.
          </p>
        </div>

        <DocsSubNav />

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

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

        {/* Interactive RAM Zeroization Sandbox */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                <Lock className="w-5 h-5 text-emerald-400" />
                <span>Interactive Memory Buffer Zeroization Sandbox</span>
              </h2>
              <p className="text-xs text-zinc-400">Simulate how chunk buffers are deterministically wiped upon HTTP socket termination.</p>
            </div>

            <button
              onClick={zeroized ? resetWipe : triggerWipe}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-2 shadow-md ${
                zeroized
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-emerald-400 text-black hover:bg-emerald-300'
              }`}
            >
              {zeroized ? <RotateCcw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-black" />}
              <span>{isWiping ? 'Wiping Buffer...' : zeroized ? 'Reload Fresh Buffer' : 'Trigger Cryptographic Zeroization'}</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs overflow-hidden space-y-2">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 border-b border-white/5 pb-1 uppercase">
              <span>Memory Heap Segment (Volatile RAM)</span>
              <span className={zeroized ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                {zeroized ? 'STATUS: ZEROIZED (0x00...00)' : 'STATUS: ACTIVE ENCRYPTED STREAM'}
              </span>
            </div>

            <pre className={zeroized ? 'text-emerald-400/70 overflow-x-auto text-[11px]' : 'text-cyan-300 overflow-x-auto text-[11px]'}>
              {zeroized
                ? '0x00000000: 00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  ................\n0x00000010: 00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  ................\n0x00000020: 00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  ................'
                : '0x00000000: 7b 22 70 72 6f 6d 70 74  22 3a 22 72 65 66 61 63  {"prompt":"refac\n0x00000010: 74 6f 72 22 2c 22 6d 6f  64 65 6c 22 3a 22 73 6f  tor","model":"so\n0x00000020: 6c 22 7d 00 e4 a2 19 8c  ff 90 28 11 b4 c2 88 a1  l"}.......(....'}
            </pre>
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
