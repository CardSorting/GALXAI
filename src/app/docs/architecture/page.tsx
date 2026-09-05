import React from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Activity,
  Cpu,
  Server,
  Zap,
  Bot,
} from 'lucide-react';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTechArticleSchema, createBreadcrumbSchema } from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: 'Routing, Rate Governance, and Failover Architecture',
  description: 'Deep architectural dive into continuous token-bucket calculus, 4-state circuit breaker FSM, TASD swarm dispersion, and HKDF-SHA256 authenticated envelope encryption.',
  canonicalPath: '/docs/architecture',
  keywords: [
    'AI Gateway Architecture',
    'Circuit Breaker FSM',
    'Predictive Adaptive Headroom',
    'Tenant-Affinity Channel Dispersion',
    'AES-256-GCM Envelope Encryption',
  ],
});

export default function ArchitectureDocPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      createTechArticleSchema({
        headline: 'GALXAI Core Substrate Architecture & Rate Governor',
        description: 'Comprehensive technical specification of token-bucket rate calculus, 4-state circuit breakers, and AES-256-GCM vaulting.',
        path: '/docs/architecture',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'Architecture', url: '/docs/architecture' },
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
            { label: 'Docs', href: '/docs' },
            { label: 'Architecture & Rate Governor' },
          ]}
        />

        {/* Hero Banner */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden bg-gradient-to-r from-indigo-500/10 via-black/40 to-black/60 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none" />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
            <Cpu className="w-3.5 h-3.5" />
            <span>CORE SUBSTRATE ARCHITECTURE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Rate Governor, Failover &amp; Cryptographic Security
          </h1>

          <p className="text-sm text-zinc-300 max-w-2xl leading-relaxed">
            The request path from authenticated ingress through rate governance, routing, provider execution, metering, and response delivery.
          </p>

          <DocsSubNav />
        </div>

        {/* Anycast ingestion */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white font-mono">1. Anycast Global Edge Ingestion (&lt;15ms TTFT)</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-mono font-bold">
              Edge Tier
            </span>
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            Inbound API traffic hits the nearest Cloudflare Edge PoP across 300+ global locations. TLS termination and token authentication occur in &lt;1.2ms without hitting origin database instances:
          </p>

          <div className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-zinc-300 border border-white/5 space-y-2 overflow-x-auto">
            <div className="text-zinc-500">// Edge Ingestion Pipeline</div>
            <div>1. Client Request → Anycast DNS Routing</div>
            <div>2. Edge Worker → Key Verification and Admission</div>
            <div>3. Prompt Prefix Match: RAM Cache Hash Lookup (&lt;0.4ms)</div>
            <div>4. SSE Streaming Tunnel: Zero-Copy Token Passthrough</div>
          </div>
        </section>

        {/* Section 2: 2-Phase Reservation & Token-Bucket Calculus */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white font-mono">2. 2-Phase Token Reservation &amp; CAS Settlement</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-mono font-bold">
              Sub-Microsecond Locks
            </span>
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            When hundreds of concurrent agent workers query available capacity simultaneously, simple atomic checks fail because multiple workers may believe they have enough room before any has deducted tokens. GALXAI solves this with a 2-Phase Protocol:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="text-amber-300 font-bold uppercase text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Phase 1: Soft Reservation (reserve)
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
                Phase 2: Final Settlement (commit)
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

        {/* Section 3: Predictive Adaptive Headroom & TASD */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bot className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white font-mono">3. Adaptive Headroom &amp; Swarm Dispersion (TASD)</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-mono font-bold">
              Autonomous Swarms
            </span>
          </div>

          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            GALXAI ranks upstream compute channels using the <strong>Predictive Adaptive Headroom (P-AHT)</strong> formula combined with <strong>Tenant-Affinity Channel Dispersion (TACD)</strong> to prevent agent loops from concentrating load onto a single upstream channel:
          </p>

          <div className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-cyan-300 border border-white/5 space-y-2 overflow-x-auto">
            <div className="text-zinc-500">// Dynamic routing scoring equation</div>
            <div className="text-white font-bold">
              Score = (PostAllocationHeadroom)^1.2 × ConcurrencyHeadroom × CircuitHealth × ReliabilityWeight × TenantDispersion + MicroJitter
            </div>
          </div>

          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            If a tenant launches 30 parallel tool executions, TACD penalizes candidate channels that already have active leases for that tenant (<code className="text-cyan-300">0.88^tenantLeasesOnChannel</code>), naturally distributing the swarm across distinct compute channels.
          </p>
        </section>

        {/* Section 4: 4-State Circuit Breaker FSM & Canary Warming */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-rose-400" />
              <h2 className="text-lg font-bold text-white font-mono">4. 4-State Circuit Breaker &amp; Canary Warming</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 text-[10px] font-mono font-bold">
              Circuit-breaker failover
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
            AAD = &quot;tenantUid:keyId:provider&quot;;
          </div>

          <p className="text-xs text-zinc-400 font-sans">
            If an attacker attempts to transplant a ciphertext across tenants or providers, the GCM authentication tag verification fails immediately and triggers a cryptographic security fault.
          </p>
        </section>

        {/* Founding Cohort Rate Lock Ribbon */}

        {/* Consumer-Grade Trust Seals */}
      </main>

      {/* Floating Conversion Dock */}
    </div>
  );
}
