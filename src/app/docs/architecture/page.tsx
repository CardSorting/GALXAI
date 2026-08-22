import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Shield,
  Activity,
  Layers,
  Cpu,
  Server,
  CheckCircle2,
  Zap,
  Lock,
  ArrowRight,
  GitBranch,
  Radio,
  Clock,
  Sparkles,
  Bot
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Rate Governor & Failover Architecture | GALXAI Docs',
  description: 'Deep architectural dive into continuous token-bucket calculus, 4-state circuit breaker FSM, TASD swarm dispersion, and HKDF-SHA256 authenticated envelope encryption.',
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

        {/* Hero Banner */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden bg-gradient-to-r from-indigo-500/10 via-black/40 to-black/60 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>ARCHITECTURAL SPECIFICATIONS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Continuous Rate Governor & Routing Architecture
          </h1>
          <p className="text-sm text-zinc-300 max-w-3xl leading-relaxed font-sans">
            Detailed mathematical and cryptographic specifications governing GALXAI's continuous token-bucket calculus, 2-phase token reservation, circuit breaker state machine, and Tenant-Affinity Shard Dispersion (TASD).
          </p>
        </div>

        <DocsSubNav />

        {/* Section 1: Continuous Token-Bucket Calculus */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white font-mono">1. Continuous Fractional Token Calculus</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-mono font-bold">
              Sub-Millisecond Precision
            </span>
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            Traditional API gateways use discrete 60-second polling windows, which trigger massive artificial traffic spikes at the start of each minute. GALXAI calculates continuous replenishment as a smooth linear function of elapsed microsecond time:
          </p>

          <div className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-cyan-300 border border-white/5 space-y-1.5 overflow-x-auto">
            <div className="text-zinc-500">// Continuous fractional replenishment formula</div>
            <div>const elapsedMinutes = (nowMs - lastRefillMs) / 60000;</div>
            <div>const tokensToAdd = elapsedMinutes * refillRatePerMinute;</div>
            <div>const remainingTokens = Math.min(maxTokens, currentTokens + tokensToAdd);</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-mono text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase">Quantization Drift</span>
              <div className="text-emerald-400 font-bold">0.00% Error</div>
              <p className="text-[10px] text-zinc-500 font-sans">Fractional remainders preserved</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase">NTP Clock Skew</span>
              <div className="text-cyan-300 font-bold">Immune</div>
              <p className="text-[10px] text-zinc-500 font-sans">Handles backward time steps</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase">Upstream Sync</span>
              <div className="text-amber-300 font-bold">Header Ingestion</div>
              <p className="text-[10px] text-zinc-500 font-sans">Reconciles x-ratelimit-reset</p>
            </div>
          </div>
        </section>

        {/* Section 2: 2-Phase Token Reservation Protocol */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <GitBranch className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white font-mono">2. 2-Phase Atomic Token Reservation</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-mono font-bold">
              Stampede Immunity
            </span>
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            When hundreds of concurrent agent workers query available capacity simultaneously, simple atomic checks fail because multiple workers may believe they have enough room before any has deducted tokens. GALXAI solves this with a 2-Phase Protocol:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="text-amber-300 font-bold uppercase text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Phase 1: Soft Reservation (`reserve`)
              </div>
              <p className="text-zinc-400 font-sans text-xs leading-relaxed">
                When a lease is acquired, the router locks the estimated token capacity (<code className="text-cyan-300">reservedTokens</code>). Subsequent requests immediately see reduced headroom:
              </p>
              <div className="p-2.5 rounded-xl bg-black/60 text-cyan-300 text-[11px]">
                Available = max(0, remainingTokens - reservedTokens)
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="text-emerald-300 font-bold uppercase text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Phase 2: Final Settlement (`commit`)
              </div>
              <p className="text-zinc-400 font-sans text-xs leading-relaxed">
                When the upstream response finishes or the stream ends, actual token consumption is deducted and the soft reservation is released.
              </p>
              <div className="p-2.5 rounded-xl bg-black/60 text-emerald-300 text-[11px]">
                reservedTokens -= estimated; remainingTokens -= actual;
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Predictive Adaptive Hydraulic Headroom & TASD */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bot className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white font-mono">3. Adaptive Hydraulic Headroom & Swarm Dispersion (TASD)</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-mono font-bold">
              Autonomous Swarms
            </span>
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            GALXAI ranks available pooled credentials using the **Predictive Adaptive Hydraulic Headroom (P-AHT)** formula combined with **Tenant-Affinity Shard Dispersion (TASD)** to prevent agent loops from concentrating bursts onto a single upstream credential:
          </p>

          <div className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-cyan-300 border border-white/5 space-y-2 overflow-x-auto">
            <div className="text-zinc-500">// Dynamic hydraulic scoring equation</div>
            <div className="text-white font-bold">
              Score = (PostAllocationHeadroom)^1.2 × ConcurrencyHeadroom × CircuitHealth × ReliabilityWeight × TenantDispersion + MicroJitter
            </div>
          </div>

          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            If a tenant launches 30 parallel tool executions, TASD penalizes candidate shards that already have active leases for that tenant (<code className="text-cyan-300">0.88^tenantLeasesOnShard</code>), naturally distributing the swarm across distinct physical credentials.
          </p>
        </section>

        {/* Section 4: 4-State Circuit Breaker FSM & Canary Warming */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-rose-400" />
              <h2 className="text-lg font-bold text-white font-mono">4. 4-State Circuit Breaker & Canary Warming</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 text-[10px] font-mono font-bold">
              Sub-15ms Failover
            </span>
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            Every upstream routing lane operates under a deterministic 4-state finite state machine:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
              <span className="text-emerald-400 font-bold uppercase text-[10px]">1. HEALTHY</span>
              <p className="text-zinc-400 font-sans text-xs">Normal operations. 100% lease allocation eligibility.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
              <span className="text-amber-400 font-bold uppercase text-[10px]">2. COOLDOWN</span>
              <p className="text-zinc-400 font-sans text-xs">Triggered on HTTP 429. Backs off with decorrelated exponential jitter.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1">
              <span className="text-rose-400 font-bold uppercase text-[10px]">3. EXHAUSTED</span>
              <p className="text-zinc-400 font-sans text-xs">5-minute freeze on 5+ consecutive non-terminal errors.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-zinc-800 border border-white/10 space-y-1">
              <span className="text-zinc-400 font-bold uppercase text-[10px]">4. DEAD</span>
              <p className="text-zinc-500 font-sans text-xs">Permanent eviction on 401/403 auth errors.</p>
            </div>
          </div>
        </section>

        {/* Section 5: Cryptographic AAD Envelope Binding */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white font-mono">5. Cryptographic AAD Envelope Binding</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-mono font-bold">
              Zero-Trust Vault
            </span>
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            AES-256-GCM ciphertexts are bound to the tenant signature using Authenticated Associated Data (AAD):
          </p>

          <div className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-emerald-300 border border-white/5">
            AAD = `${`tenantUid`}:${`keyId`}:${`provider`}`;
          </div>

          <p className="text-xs text-zinc-400 font-sans">
            If an attacker attempts to transplant a ciphertext across tenants or providers, the GCM authentication tag verification fails immediately and triggers a cryptographic security fault.
          </p>
        </section>
      </main>
    </div>
  );
}
