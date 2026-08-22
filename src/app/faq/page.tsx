'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  HelpCircle,
  ShieldCheck,
  Zap,
  Sparkles,
  Lock,
  ArrowRight,
  ChevronDown,
  Coins,
  Cpu,
  Layers,
  Terminal,
  Code2,
  Flame,
  CheckCircle2,
  Database
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';

interface FAQItem {
  id: string;
  category: 'general' | 'pricing' | 'developer' | 'security';
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    id: 'what-is-galxai',
    category: 'general',
    q: 'What is GALXAI and how does it work?',
    a: 'GALXAI is an enterprise-grade Universal AI Gateway that provides direct, high-throughput access to the world\'s most powerful models—including OpenAI GPT-5.6 Sol, Terra, Luna and xAI Grok 4.5—at 25% to 40% below direct retail prices. It operates as a seamless, 1-line drop-in replacement for the official OpenAI SDK.'
  },
  {
    id: 'discounts-explained',
    category: 'pricing',
    q: 'How does GALXAI offer 25%–40% discounts compared to direct providers?',
    a: 'Through high-volume enterprise compute infrastructure and intelligent low-latency routing, GALXAI secures wholesale capacity and passes the direct savings to developers. We charge zero platform markup fees or monthly seat surcharges.'
  },
  {
    id: 'prompt-caching-rebate',
    category: 'pricing',
    q: 'How does the 75% Prompt Caching Rebate work?',
    a: 'When sending prompts with repeated context, system instructions, or document prefixes exceeding 1,024 tokens, cached input tokens automatically receive a 75% discount. Unlike other gateways that retain caching margins, GALXAI passes 100% of the prompt caching rebate directly to your wallet.'
  },
  {
    id: 'dropin-integration',
    category: 'developer',
    q: 'How do I integrate GALXAI into Python, Node.js, or Cursor IDE?',
    a: 'Integration takes under 30 seconds. In your OpenAI client code or Cursor/Windsurf IDE settings, set the Base URL to "https://api.galxai.com/v1" and supply your GALXAI developer key ("galx_live_..."). All standard parameters (stream, temperature, tools, structured JSON) work identically without changing your code.'
  },
  {
    id: 'wallet-billing-flow',
    category: 'pricing',
    q: 'How does the Developer Compute Wallet and billing work?',
    a: 'GALXAI operates a prepaid, pay-as-you-go developer wallet. Every new account receives an instant $5.00 free compute grant. Deductions are micro-metered in real-time per token with zero hidden minimums. You can top up with bonus packs (+5% to +20% extra credits) or activate auto-reload protection to guarantee zero downtime.'
  },
  {
    id: 'data-privacy-retention',
    category: 'security',
    q: 'Does GALXAI store, log, or train on my prompt data?',
    a: 'Strictly zero retention. GALXAI operates a strict zero-content-logging policy. Prompts and streaming tokens are processed entirely in ephemeral memory buffers and are never persisted to disk, recorded in database logs, or used for model training.'
  },
  {
    id: 'model-fleet-coverage',
    category: 'general',
    q: 'Which AI models and modalities are available?',
    a: 'GALXAI exclusively hosts 12 flagship models: 4 frontier LLM and reasoning engines (GPT-5.6 Sol, GPT-5.6 Terra, GPT-5.6 Luna, xAI Grok 4.5 with 500K context) and 8 high-definition visual synthesis models (GPT-Image-2, DALL-E 3, Grok Imagine, and more).'
  },
  {
    id: 'uptime-failover-sla',
    category: 'developer',
    q: 'What is GALXAI\'s uptime SLA and failover capability?',
    a: 'GALXAI provides a 99.99% Enterprise Uptime SLA. Our gateway continuously monitors endpoint health and applies sub-15ms automated failover, shielding your production applications and agent fleets from upstream downtime and rate limit spikes.'
  }
];

export default function FaqPage() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'general' | 'pricing' | 'developer' | 'security'>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>('what-is-galxai');

  const filteredFaqs = FAQS.filter(f => activeCategory === 'all' || f.category === activeCategory);

  const toggleFaq = (id: string) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a
      }
    }))
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs items={[{ label: 'Knowledge & FAQ Center' }]} />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-12 space-y-4 text-center relative overflow-hidden border border-amber-500/20 shadow-2xl">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

          <div className="flex items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>KNOWLEDGE BASE & DEVELOPER FAQ</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share FAQ"
              title="GALXAI Knowledge Base & FAQ"
              description="Learn how GALXAI delivers wholesale AI token rates, 75% prompt caching, and zero code changes."
            />
          </div>

          <div className="space-y-2 max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Everything you need to know about GALXAI's 25%–40% wholesale pricing, 1-line OpenAI SDK drop-in integration, developer wallet, and enterprise security.
            </p>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/5 text-xs font-semibold">
          {[
            { id: 'all', label: 'All Questions' },
            { id: 'general', label: 'General & Gateway' },
            { id: 'pricing', label: 'Pricing & Discounts' },
            { id: 'developer', label: 'Integration & SDKs' },
            { id: 'security', label: 'Security & Privacy' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeCategory === tab.id
                  ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openFaqId === faq.id;

            return (
              <div
                key={faq.id}
                className={`glass-panel rounded-2xl border transition-all overflow-hidden ${
                  isOpen
                    ? 'border-amber-500/40 bg-white/[0.03] shadow-lg shadow-amber-500/5'
                    : 'border-white/5 hover:border-white/15 bg-black/30'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-bold text-white flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 text-amber-300 text-xs font-mono flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span>{faq.q}</span>
                  </span>

                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-amber-400' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 sm:px-6 pl-14 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-white/5 pt-4 animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Conversion Banner */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 text-center space-y-4 border border-emerald-500/30 bg-emerald-500/5 shadow-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
            <Flame className="w-3.5 h-3.5 text-emerald-400" />
            <span>START WITH $5 FREE COMPUTE CREDIT</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white">Ready to Cut Your AI API Costs?</h3>
          <p className="text-xs text-zinc-400 max-w-lg mx-auto">
            Switch in 30 seconds with 1 line of code. No credit card required to begin testing.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/keys/new"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer font-mono"
            >
              <span>Create Free Developer Key</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/playground"
              className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-all border border-white/10"
            >
              <span>Test in Playground</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
