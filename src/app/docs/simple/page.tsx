'use client';

import React from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { DocsFeedback } from '@/components/dashboard/DocsFeedback';
import { WorkloadEstimator } from '@/components/dashboard/WorkloadEstimator';
import { GuidedSetupWizard } from '@/components/dashboard/GuidedSetupWizard';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';
import {
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  Smile,
  DollarSign,
  Lock,
  Copy,
  Terminal,
  Laptop
} from 'lucide-react';

export default function PlainEnglishDocsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'Plain English Guide (For Beginners)' }
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-amber-500/30 bg-amber-500/5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <Smile className="w-3.5 h-3.5" />
            <span>SIMPLE & PLAIN LANGUAGE • ZERO CONFUSION</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">The Plain English Guide to GALXAI</h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-sans">
            Confused by API jargon, rate limits, and tokens? Don't worry. This guide explains everything in simple everyday words with zero technical fluff.
          </p>
        </div>

        <DocsSubNav />

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* 30-Second Explanation Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-xl font-black text-white flex items-center gap-2 font-sans">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            1. What is GALXAI in 1 sentence?
          </h2>
          <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-3 font-sans text-sm text-zinc-200 leading-relaxed">
            <p className="font-semibold text-white text-base">
              GALXAI is a high-speed discount gateway that lets you use world-class AI models (like GPT-5.6 and Grok 4.5) for 25% to 40% cheaper than buying directly from OpenAI.
            </p>
            <p className="text-xs text-zinc-400">
              Think of it like Costco or a wholesale club for AI compute: you get the exact same authentic AI models, but with bulk wholesale savings passed directly to your account.
            </p>
          </div>
        </div>

        {/* Non-Technical Business Workload Estimator */}
        <WorkloadEstimator />

        {/* Why is my AI bill so high? */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-xl font-black text-white flex items-center gap-2 font-sans">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            2. How does it save me money without breaking anything?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="font-bold text-white text-sm">✓ 100% Identical Output</div>
              <p className="text-zinc-400 leading-relaxed">
                The answers, code, and completions you receive come from official OpenAI and xAI model infrastructure. There is zero difference in intelligence or quality.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <div className="font-bold text-white text-sm">✓ 75% Prompt Caching Automatic Discount</div>
              <p className="text-zinc-400 leading-relaxed">
                If your coding tool or app sends repeated instructions, GALXAI remembers them and cuts the cost of those words by 75% automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Universal 30-Second Guided Setup Wizard */}
        <GuidedSetupWizard />

        {/* Safety FAQ */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-xl font-black text-white flex items-center gap-2 font-sans">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            4. Common Questions (FAQ for Normal Humans)
          </h2>

          <div className="space-y-3 font-sans text-xs">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <div className="font-bold text-white">Q: Do you store my prompts or code?</div>
              <p className="text-zinc-400 leading-relaxed">
                <strong>No. Zero data retention.</strong> Your words flow through encrypted memory in real time and disappear the millisecond the answer is finished. Nothing is ever saved to disk or used for training.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <div className="font-bold text-white">Q: What happens if my balance runs out?</div>
              <p className="text-zinc-400 leading-relaxed">
                You can turn on <Link href="/billing/auto-reload" className="text-cyan-300 hover:underline">Auto-Top Up</Link> to automatically reload $25 or $50 when your balance is low, so your work never stops.
              </p>
            </div>
          </div>
        </div>

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />

        <DocsFeedback docTitle="The Plain English Guide to GALXAI" />
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
      <FloatingConversionDock />
      <LiveActivityToast />
      <ExitIntentModal />
    </div>
  );
}
