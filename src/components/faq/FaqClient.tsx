'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  HelpCircle,
  ArrowRight,
  ChevronDown,
  Flame,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { FAQS, type FAQItem } from '@/lib/data/faqData';

export function FaqClient() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'general' | 'pricing' | 'developer' | 'security'>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>('what-is-galxai');

  const filteredFaqs = FAQS.filter(f => activeCategory === 'all' || f.category === activeCategory);

  const toggleFaq = (id: string) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs items={[{ label: 'Knowledge & FAQ Center' }]} />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-12 space-y-4 text-center relative overflow-hidden border border-amber-500/20 shadow-2xl">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

          <div className="flex items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>KNOWLEDGE BASE &amp; DEVELOPER FAQ</span>
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
              Everything you need to know about GALXAI&apos;s 25%–40% wholesale pricing, 1-line OpenAI SDK drop-in integration, developer wallet, and enterprise security.
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
            { id: 'security', label: 'Security & Privacy' },
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
              href="/keys"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer font-mono"
            >
              <span>Create Free Developer Key</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/docs/quickstart"
              className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-all border border-white/10"
            >
              <span>View Documentation</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
