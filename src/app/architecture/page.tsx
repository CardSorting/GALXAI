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
  Sparkles,
  Server
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cryptographic Architecture & Systems Pipeline | GALXAI',
  description: 'Interactive pipeline explaining the zero-residual cryptographic request traversal, HKDF-SHA256 derivation, monotonic leases, and continuous rate governance.',
};

export default function ArchitecturePipelinePage() {
  const stages = [
    {
      id: 'ingress',
      title: '1. Ingress & Bearer Validation',
      desc: 'Incoming HTTP request authenticated via SHA-256 bearer key hash in < 1ms.',
      icon: Lock,
      color: 'text-amber-400',
      tag: '< 1MS AUTH'
    },
    {
      id: 'rate_check',
      title: '2. Continuous Token Calculus',
      desc: 'Continuous fractional calculus ensures sub-millisecond capacity verification without burst spikes.',
      icon: Activity,
      color: 'text-emerald-400',
      tag: 'FRACTIONAL REFILL'
    },
    {
      id: 'lease',
      title: '3. Monotonic Lease Allocation',
      desc: 'Atomic lock acquired with incremental fencing token to prevent concurrency races.',
      icon: Layers,
      color: 'text-indigo-400',
      tag: 'FENCING TOKEN'
    },
    {
      id: 'vault',
      title: '4. AES-256-GCM Decryption & Stream',
      desc: 'Secret decrypted with Authenticated Associated Data (AAD) and dispatched to OpenAI or xAI.',
      icon: Zap,
      color: 'text-cyan-400',
      tag: 'AAD BINDING'
    },
    {
      id: 'zeroize',
      title: '5. Heap Memory Zeroization',
      desc: 'Decrypted key buffer in RAM overwritten with zeroes via Buffer.fill(0) inside finally block.',
      icon: Cpu,
      color: 'text-rose-400',
      tag: '0% RESIDUAL'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'Architecture Pipeline' }]} />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-3 relative overflow-hidden text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
            <Server className="w-3.5 h-3.5" />
            <span>SYSTEMS ENGINEERING ARCHITECTURE</span>
          </div>
          <h1 className="text-3xl font-black text-white">Cryptographic Request Pipeline</h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Trace the complete end-to-end traversal of a model completion request from client ingress to RAM zeroization.
          </p>
        </div>

        {/* Pipeline Traversal Flow */}
        <div className="space-y-4">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.id}
                className="glass-card rounded-3xl p-6 sm:p-8 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:border-indigo-500/40 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${stage.color} shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {stage.title}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">{stage.desc}</p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-[10px] font-mono font-bold border border-indigo-500/30 shrink-0">
                  {stage.tag}
                </span>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="glass-panel rounded-3xl p-8 text-center space-y-3">
          <h3 className="text-lg font-bold text-white">Test the System in Action</h3>
          <p className="text-xs text-zinc-400">Run live benchmarks or simulate traffic spikes in the interactive simulator.</p>
          <div className="flex justify-center gap-3 pt-1">
            <Link
              href="/vault/simulator"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
            >
              Open Traffic Simulator
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
