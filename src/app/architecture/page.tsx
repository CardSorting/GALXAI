import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Shield,
  Zap,
  Activity,
  Layers,
  Cpu,
  Lock,
  Power,
  ArrowRight,
} from 'lucide-react';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Cryptographic Architecture & Systems Pipeline — Zero-Residual Ingress',
  description: 'Interactive pipeline explaining the zero-residual cryptographic request traversal, HKDF-SHA256 derivation, monotonic leases, and continuous rate governance.',
  canonicalPath: '/architecture',
  keywords: [
    'AI Router Architecture',
    'Cryptographic Pipeline',
    'HKDF-SHA256 Key Derivation',
    'Monotonic Fencing Tokens',
    'AES-256-GCM Vaulting',
  ],
});

export default function ArchitecturePipelinePage() {
  const stages = [
    {
      id: 'ingress',
      title: '1. Ingress & Bearer Validation',
      desc: 'Incoming HTTP request authenticated via SHA-256 bearer key hash in < 1ms.',
      icon: Lock,
      color: 'text-amber-400',
      tag: '< 1MS AUTH',
    },
    {
      id: 'rate_check',
      title: '2. Continuous Token Calculus',
      desc: 'Continuous fractional calculus ensures sub-millisecond capacity verification without burst spikes.',
      icon: Activity,
      color: 'text-emerald-400',
      tag: 'FRACTIONAL REFILL',
    },
    {
      id: 'lease',
      title: '3. Monotonic Lease Allocation',
      desc: 'Atomic lock acquired with incremental fencing token to prevent concurrency races.',
      icon: Layers,
      color: 'text-indigo-400',
      tag: 'FENCING TOKEN',
    },
    {
      id: 'vault',
      title: '4. AES-256-GCM Decryption & Stream',
      desc: 'Secret decrypted with Authenticated Associated Data (AAD) and dispatched to OpenAI or xAI.',
      icon: Zap,
      color: 'text-cyan-400',
      tag: 'AAD BINDING',
    },
    {
      id: 'zeroize',
      title: '5. Heap Memory Zeroization',
      desc: 'Decrypted key buffer zeroized in volatile RAM instantly after handshake.',
      icon: Power,
      color: 'text-rose-400',
      tag: 'ZERO RETENTION',
    },
  ];

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'Cryptographic Systems Pipeline & Ingress Architecture',
        description: 'Detailed analysis of zero-residual cryptographic request traversal, HKDF-SHA256, and rate governance.',
        path: '/architecture',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Architecture', url: '/architecture' },
      ]),
    ],
  };

  return (
    <div className="min-h-screen flex flex-col">
      <JsonLd data={pageSchema} />
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Infrastructure', href: '/status' },
            { label: 'Cryptographic Systems Pipeline' },
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden bg-gradient-to-r from-cyan-500/10 via-black/40 to-black/60 shadow-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Cpu className="w-3.5 h-3.5" />
            <span>0-RESIDUAL SYSTEMS PIPELINE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Cryptographic Request Execution Pipeline
          </h1>

          <p className="text-sm text-zinc-300 max-w-2xl leading-relaxed">
            Step-by-step cryptographic visualization of how an inference payload traverses GALXAI: sub-millisecond edge validation, monotonic lease governance, and immediate heap zeroization.
          </p>
        </div>

        {/* Pipeline Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.id}
                className="glass-panel rounded-3xl p-6 border border-white/10 space-y-3 relative flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center ${stage.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                      {stage.tag}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white leading-snug">{stage.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">{stage.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Invariants Box */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Substrate Security Guarantees
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-emerald-400 font-bold uppercase text-[10px]">Zero Persistence</span>
              <p className="text-zinc-400 font-sans text-xs">No prompt or completion payloads are ever written to non-volatile storage.</p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-cyan-400 font-bold uppercase text-[10px]">Deterministic Fencing</span>
              <p className="text-zinc-400 font-sans text-xs">Monotonic fencing tokens reject stale concurrent requests unconditionally.</p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-indigo-400 font-bold uppercase text-[10px]">AAD Authentication</span>
              <p className="text-zinc-400 font-sans text-xs">GCM tags cryptographically bound to tenant identity prevent cross-tenant substitution.</p>
            </div>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Read Complete Mathematical Specifications</h3>
            <p className="text-xs text-zinc-400">Explore the exact rate equations and cryptographic derivation proofs.</p>
          </div>

          <Link
            href="/docs/architecture"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs font-mono uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 self-start sm:self-auto shrink-0"
          >
            <span>Technical Deep Dive →</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
