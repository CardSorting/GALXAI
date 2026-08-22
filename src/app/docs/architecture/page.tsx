import React from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { Shield, Activity, Layers, Cpu, Server, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Rate Governor & Failover Architecture | GALXAI Docs',
  description: 'Deep architectural dive into continuous token-bucket calculus, 4-state circuit breaker FSM, and HKDF-SHA256 authenticated envelope encryption.',
};

export default function ArchitectureDocPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'Architecture & Rate Governor' }
          ]}
        />

        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>ARCHITECTURAL SPECIFICATIONS</span>
          </div>
          <h1 className="text-3xl font-black text-white">Continuous Rate Governor & Routing Architecture</h1>
          <p className="text-sm text-zinc-400 leading-relaxed font-sans">
            Detailed mathematical and security specifications of GALXAI's continuous token-bucket calculus, circuit breaker state machine, and authenticated envelope vaulting.
          </p>
        </div>

        <DocsSubNav />

        {/* Section 1: Continuous Token-Bucket Calculus */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white font-mono">1. Continuous Fractional Token Calculus</h2>
          </div>
          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            Traditional token buckets use discrete 60-second polling intervals, which cause bursty traffic spikes at the top of each minute. GALXAI calculates continuous replenishment using microsecond timestamps:
          </p>
          <div className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-cyan-300 border border-white/5 space-y-1">
            <div>tokensToAdd = (nowMs - lastRefillMs) * (refillRatePerMinute / 60000);</div>
            <div>remainingTokens = min(maxTokens, currentTokens + tokensToAdd);</div>
          </div>
          <p className="text-xs text-zinc-400 font-sans">
            This continuous formula prevents artificial burst queuing and guarantees smooth token replenishment.
          </p>
        </section>

        {/* Section 2: 4-State Circuit Breaker FSM */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white font-mono">2. 4-State Circuit Breaker FSM</h2>
          </div>
          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            Every upstream routing lane operates under a resilient 4-state finite state machine:
          </p>
          <ul className="space-y-2 text-xs text-zinc-400 font-mono">
            <li>• <strong className="text-emerald-400 font-sans">HEALTHY</strong>: Normal operations, eligible for least-latency lease allocation.</li>
            <li>• <strong className="text-amber-400 font-sans">COOLDOWN</strong>: Triggered on HTTP 429. Backs off with decorrelated exponential jitter (30s+).</li>
            <li>• <strong className="text-rose-400 font-sans">EXHAUSTED</strong>: Enters 5-minute freeze on 5+ consecutive non-terminal errors.</li>
            <li>• <strong className="text-zinc-500 font-sans">DEAD</strong>: Immediate eviction on permanent auth errors (401, 403, invalid_api_key).</li>
          </ul>
        </section>

        {/* Section 3: AAD Envelope Binding */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white font-mono">3. Cryptographic AAD Envelope Binding</h2>
          </div>
          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            AES-256-GCM ciphertexts are bound to the exact tenant signature using Authenticated Associated Data (AAD):
          </p>
          <div className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-emerald-300 border border-white/5">
            AAD = `${`tenantUid`}:${`keyId`}:${`provider`}`;
          </div>
          <p className="text-xs text-zinc-400 font-sans">
            If an attacker attempts to transplant a ciphertext across tenants or providers, the GCM authentication tag fails and throws <code className="text-rose-400">GalxVaultDecryptionError</code>.
          </p>
        </section>
      </main>
    </div>
  );
}
