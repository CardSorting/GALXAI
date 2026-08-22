import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Shield,
  Zap,
  Layers,
  Activity,
  CheckCircle2,
  Lock,
  Cpu,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Power
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'How It Works — Multi-Account Router Architecture',
  description: 'Understand the zero-residual cryptographic lifecycle of multi-account routing, continuous rate governance, and automated failover.',
};

export default function HowItWorksPage() {
  const steps = [
    {
      num: '01',
      title: '1-Click Provider Authentication',
      desc: 'Connect your OpenAI or xAI Grok account. GALXAI automatically provisions compute quota into the router pool with AES-256-GCM hardware vaulting.',
      icon: Shield,
      tag: 'SECURITY INVARIANT'
    },
    {
      num: '02',
      title: 'Monotonic Execution Lease Governor',
      desc: 'When an incoming completion request arrives, the router acquires an atomic execution lease with an incremental fencing token, preventing concurrency races.',
      icon: Layers,
      tag: 'CONCURRENCY GOVERNOR'
    },
    {
      num: '03',
      title: 'Continuous Token Calculus & Header Sync',
      desc: 'Capacity is replenished continuously based on elapsed time without burst spikes. Upon receiving upstream responses, the bucket reconciles with authoritative rate-limit headers.',
      icon: Activity,
      tag: 'RATE GOVERNOR'
    },
    {
      num: '04',
      title: 'Immediate Heap Memory Zeroization',
      desc: 'When the HTTP response or SSE stream finishes, decrypted plaintext keys in RAM are immediately overwritten with binary zeroes in an unconditional finally block.',
      icon: Cpu,
      tag: '0% RESIDUAL MEMORY'
    },
    {
      num: '05',
      title: '1-Click Instant Disconnect Killswitch',
      desc: 'Disconnect or sign out anytime. Pressing Retract aborts active leases and wipes cached tokens in less than 40 milliseconds.',
      icon: Power,
      tag: '< 40MS RETRACTION'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs items={[{ label: 'How Routing Works' }]} />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>CRYPTOGRAPHIC ZERO-RESIDUAL ARCHITECTURE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">How Unified Multi-Account Routing Works</h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            A transparent architectural walkthrough of how GALXAI routes requests across multiple provider accounts with automated failover, zero RAM residue, and instant disengagement.
          </p>
        </div>

        {/* 5-Step Lifecycle Visual */}
        <section className="space-y-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="glass-card rounded-3xl p-6 sm:p-8 border border-white/5 flex flex-col sm:flex-row items-start gap-6 relative overflow-hidden group"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-lg shrink-0 group-hover:scale-105 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-mono text-cyan-400 font-bold">STEP {step.num}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold border border-indigo-500/30">
                      {step.tag}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">{step.title}</h2>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        {/* CTA Footer */}
        <div className="glass-panel rounded-3xl p-8 text-center space-y-4">
          <h3 className="text-xl font-bold text-white">Ready to Start Routing?</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Connect your OpenAI or xAI Grok account in 1-click and start routing immediately.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/auth/connect"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20"
            >
              1-Click Connect
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
