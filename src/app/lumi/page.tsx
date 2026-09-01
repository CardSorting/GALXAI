import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { LumiWorkloadVisualizer } from '@/components/lumi/LumiWorkloadVisualizer';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Lock,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Bot,
  Laptop,
  Coins,
  Terminal,
  Layers,
  Flame,
  HelpCircle,
  Building2,
  CreditCard,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'LUMI Stellar Pass — $10/Month Flat OpenAI Coding Models | GALXAI',
  description: 'Infinite cosmic throughput with generous rolling 5-hour limits on OpenAI flagship models (GPT-5.6 Sol, Terra, Luna, o3, GPT-4o). Zero Data Retention guaranteed.',
  keywords: [
    'GALXAI LUMI',
    'OpenAI coding subscription',
    'GPT-5.6 Sol pass',
    'o3 mini coding agent',
    'Cursor OpenAI API key',
    'Zero Data Retention AI',
    '10 dollar AI coding pass'
  ]
};

const ZDR_PRIVACY_MATRIX = [
  { model: 'GPT-5.6 Luna', role: 'Ultra-Fast Agentic Code', training: 'Never Used', retention: '0 Days (ZDR)', memory: 'Instant Flush', standard: 'SOC2 Type II / HIPAA' },
  { model: 'GPT-5.6 Sol', role: 'Apex Architecture & Reasoning', training: 'Never Used', retention: '0 Days (ZDR)', memory: 'Instant Flush', standard: 'SOC2 Type II / HIPAA' },
  { model: 'GPT-5.6 Terra', role: 'Deep Systems & Refactoring', training: 'Never Used', retention: '0 Days (ZDR)', memory: 'Instant Flush', standard: 'SOC2 Type II / HIPAA' },
  { model: 'o3 (Frontier)', role: 'Maximum Complex Reasoning', training: 'Never Used', retention: '0 Days (ZDR)', memory: 'Instant Flush', standard: 'SOC2 Type II / GDPR' },
  { model: 'o3-mini', role: 'Rapid Step-by-Step Problem Solving', training: 'Never Used', retention: '0 Days (ZDR)', memory: 'Instant Flush', standard: 'SOC2 Type II / GDPR' },
  { model: 'GPT-4.5 Preview', role: 'Massive Context Knowledge', training: 'Never Used', retention: '0 Days (ZDR)', memory: 'Instant Flush', standard: 'SOC2 Type II / GDPR' },
  { model: 'GPT-4o', role: 'Multimodal Vision & Realtime Code', training: 'Never Used', retention: '0 Days (ZDR)', memory: 'Instant Flush', standard: 'SOC2 Type II / HIPAA' },
  { model: 'GPT-4o Mini', role: 'Hyper-Velocity Agentic Swarms', training: 'Never Used', retention: '0 Days (ZDR)', memory: 'Instant Flush', standard: 'SOC2 Type II / HIPAA' },
  { model: 'Text-Embedding-3-Large', role: 'Dense Vector Embeddings & RAG', training: 'Never Used', retention: '0 Days (ZDR)', memory: 'Instant Flush', standard: 'ISO 27001 / SOC2' }
];

const FAQ_ITEMS = [
  {
    q: 'What is GALXAI LUMI?',
    a: 'LUMI is a flat $10/month micro-pass providing generous, reliable, high-speed access to OpenAI’s flagship frontier reasoning and coding models without the friction of unpredictable token-metered invoices.'
  },
  {
    q: 'Which models are included in the LUMI subscription?',
    a: 'LUMI exclusively curates OpenAI frontier intelligence, including GPT-5.6 Sol, GPT-5.6 Terra, GPT-5.6 Luna, o3, o3-mini, GPT-4.5 Preview, GPT-4o, GPT-4o Mini, and Text-Embedding-3-Large.'
  },
  {
    q: 'How do the rolling 5-hour warp limits work?',
    a: 'Instead of a rigid daily cap that abruptly locks you out, LUMI operates on a continuous 5-hour rolling burst window. As time elapses, your request capacity replenishes continuously so your agents can keep shipping code.'
  },
  {
    q: 'Can I use LUMI across Cursor, Windsurf, Claude Code, and Python?',
    a: 'Yes. All GALXAI keys are universal OpenAI-compatible drop-in tokens. Simply set your API base URL to https://galx.ai/v1.'
  },
  {
    q: 'What is the difference between Pay-As-You-Go vs LUMI $10/mo Pass?',
    a: 'Pay-As-You-Go charges per micro-token at raw wholesale rates with promotional match bonuses. LUMI is a flat $10/month subscription with generous rolling quotas (~$60/mo equivalent compute) tailored for continuous agentic coding.'
  },
  {
    q: 'Is my proprietary code or data ever used to train models?',
    a: 'Never. All LUMI traffic operates under hardware-enforced Zero Data Retention (ZDR) agreements. Enclave memory buffers are instantly purged upon stream completion.'
  },
  {
    q: 'Can I top up extra compute if I need massive concurrency bursts?',
    a: 'Yes. You can top up prepaid wallet credits at any time to scale your throughput up to 250x directly in the billing dashboard.'
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. You can cancel your subscription in 1 click from your account settings at any time without fees or lock-ins.'
  }
];

export default function LumiPage() {
  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 selection:bg-amber-500/30 selection:text-amber-200">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-32 space-y-20">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'LUMI Stellar Pass', href: '/lumi' }]} />

        {/* Hero Section */}
        <section className="text-center space-y-6 relative">
          {/* Ambient Cosmic Radial Blur */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono font-bold shadow-lg shadow-amber-500/10 animate-in fade-in duration-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>GALXAI LUMI STELLAR PASS • OPENAI FRONTIER LINEUP</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto leading-[1.1]">
            Low-Cost OpenAI Frontier Models for <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">Every Developer</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-300 max-w-3xl mx-auto leading-relaxed font-sans">
            LUMI powers software engineers and autonomous agent swarms with generous rolling 5-hour quotas, sub-15ms Anycast routing, and Zero Data Retention on OpenAI’s flagship models.
          </p>

          {/* Pricing Value Card Hero */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/checkout?plan=lumi&amount=10"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-sm uppercase tracking-wider font-mono shadow-2xl shadow-amber-500/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.03] active:scale-98"
            >
              <Zap className="w-4 h-4 text-black" />
              <span>Subscribe to LUMI ($10/Month)</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>

            <Link
              href="/keys"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-mono font-bold text-xs border border-white/10 flex items-center justify-center gap-2 transition-all"
            >
              <span>Mint Test Key ($30 Free Compute)</span>
            </Link>
          </div>

          {/* Guarantee Pills */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero Data Retention (ZDR)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-cyan-400" />
              <span>~$60/mo Compute Value</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Cancel Anytime with 1-Click</span>
            </span>
          </div>
        </section>

        {/* Interactive Workload Quotas Visualizer */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <Cpu className="w-6 h-6 text-amber-400" />
              <span>Rolling 5-Hour Cosmic Warp Limits</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-sans">
              Dynamic request limits replenish continuously across sliding 5-hour windows for zero downtime coding.
            </p>
          </div>

          <LumiWorkloadVisualizer />
        </section>

        {/* 3-Step Launch Protocol */}
        <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-zinc-950 via-black to-[#07080d] border border-white/10 space-y-8 shadow-2xl">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
              Galactic Deployment
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Launch in 3 Simple Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3 font-mono">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-black font-black flex items-center justify-center text-sm">
                1
              </div>
              <h3 className="text-base font-bold text-white font-sans">Generate Gateway Key</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Mint your universal Bearer token in the developer console. $0 card required for sandbox testing.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3 font-mono">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black flex items-center justify-center text-sm">
                2
              </div>
              <h3 className="text-base font-bold text-white font-sans">Activate LUMI ($10/mo)</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Subscribe in 1-click via Stripe Checkout with automatic VAT invoicing and zero retail platform markups.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3 font-mono">
              <div className="w-8 h-8 rounded-xl bg-emerald-400 text-black font-black flex items-center justify-center text-sm">
                3
              </div>
              <h3 className="text-base font-bold text-white font-sans">Start Agentic Coding</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Drop <code className="text-cyan-300">https://galx.ai/v1</code> into Cursor, Claude Code, Windsurf, or Python.
              </p>
            </div>
          </div>
        </section>

        {/* Zero Data Retention Privacy Matrix */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <span>Galactic Zero Data Retention (ZDR) Matrix</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-sans">
              Enterprise confidentiality: your proprietary source code, prompts, and completions are never retained or trained on.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-white/10 bg-black/40 shadow-2xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-white/5 border-b border-white/10 text-zinc-400 uppercase text-[10px]">
                <tr>
                  <th className="p-4">OpenAI Model</th>
                  <th className="p-4">Galactic Role</th>
                  <th className="p-4">Model Training</th>
                  <th className="p-4">Data Retention</th>
                  <th className="p-4">Memory Buffer</th>
                  <th className="p-4">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ZDR_PRIVACY_MATRIX.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{row.model}</span>
                    </td>
                    <td className="p-4 text-zinc-400 font-sans">{row.role}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                        {row.training}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30">
                        {row.retention}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-300">{row.memory}</td>
                    <td className="p-4 text-zinc-400">{row.standard}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 1-Click Code Ejection Tabs */}
        <section className="p-6 sm:p-8 rounded-3xl bg-black/70 border border-white/10 space-y-4 font-mono shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase text-white">Universal Drop-In Integration:</span>
            </div>
            <span className="text-[10px] text-zinc-400">OpenAI Compatible (v1)</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 text-xs text-zinc-300 overflow-x-auto space-y-2">
            <div className="text-zinc-500 text-[11px]"># .env.local</div>
            <code className="block text-emerald-400 font-mono">
              OPENAI_API_BASE=&quot;https://galx.ai/v1&quot;<br />
              OPENAI_API_KEY=&quot;galx_live_stellar_key_here&quot;
            </code>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="space-y-6 max-w-4xl mx-auto">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <HelpCircle className="w-6 h-6 text-amber-400" />
              <span>Frequently Asked Questions</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-sans">
              Everything you need to know about LUMI billing, model limits, and privacy guarantees.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-black/50 border border-white/10 space-y-2 font-mono text-xs">
                <h3 className="text-sm font-bold text-white font-sans flex items-center justify-between">
                  <span>{item.q}</span>
                </h3>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Final Conversion Strip */}
        <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-purple-500/20 border border-amber-500/40 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="space-y-2 relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Ready to Accelerate Your Coding Agents?
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
              Subscribe to LUMI for $10/month and unlock unlimited cosmic coding on OpenAI flagship models.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <Link
              href="/checkout?plan=lumi&amount=10"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider font-mono shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-98"
            >
              <Zap className="w-4 h-4 text-black" />
              <span>Subscribe to LUMI ($10/mo)</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
