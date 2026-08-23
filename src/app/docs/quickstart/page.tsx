import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { GuidedSetupWizard } from '@/components/dashboard/GuidedSetupWizard';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { TrustSeals } from '@/components/common/TrustSeals';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';
import { ShareButton } from '@/components/common/ShareButton';
import { Zap, Sparkles, Terminal, Code2, ArrowRight, CheckCircle2, Copy, Flame, Coins, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: '30-Second Quickstart Guide | GALXAI Docs',
  description: 'Learn how to connect to the GALXAI API Gateway in under 30 seconds using Python, TypeScript, or cURL with 25%-40% wholesale savings.',
};

export default function QuickstartDocPage() {
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Connect to the GALXAI Universal AI Gateway in 30 Seconds',
    description: 'Learn how to route OpenAI Codex and xAI Grok requests through GALXAI with 25%–40% wholesale savings and zero code refactoring.',
    totalTime: 'PT30S',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Mint Your Gateway API Key',
        text: 'Generate a live developer API key (galx_live_...) with $5 free introductory credit.'
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Set Your Base URL',
        text: 'Set the OpenAI SDK or Cursor IDE Base URL to https://api.galx.ai/v1.'
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Execute Your First Completion',
        text: 'Run standard chat completion code against GPT-5.6 Sol or Grok 4.5.'
      }
    ]
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: '30-Second Quickstart' }
          ]}
        />

        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <Zap className="w-3.5 h-3.5" />
              <span>GET STARTED IN 30 SECONDS</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Guide"
              title="GALXAI 30-Second Quickstart Guide"
              description="Connect to GALXAI Universal Gateway in under 30 seconds with 1 line of configuration."
            />
          </div>
          <h1 className="text-3xl font-black text-white">30-Second Gateway Quickstart</h1>
          <p className="text-sm text-zinc-400 leading-relaxed font-sans">
            Follow these 3 simple steps to route OpenAI and xAI Grok frontier models through the high-throughput GALXAI router with 25%–40% wholesale savings.
          </p>
        </div>

        {/* Founding Builder Grant Highlight Banner */}
        <div className="glass-panel rounded-2xl p-5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-indigo-600/15 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shrink-0">
              <Flame className="w-4 h-4 text-black fill-black" />
            </div>
            <div>
              <span className="text-white font-bold block">50% Instant Compute Match Bonus Active</span>
              <span className="text-zinc-300 text-[11px]">Deposit $50+ to receive 50% matched inference credits. Includes instant $5 free credit token.</span>
            </div>
          </div>
          <Link
            href="/keys/new"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 whitespace-nowrap cursor-pointer"
          >
            <span>Claim $5 Key</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </Link>
        </div>

        <DocsSubNav />

        {/* Universal 30-Second Guided Setup Wizard */}
        <GuidedSetupWizard />

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
      <FloatingConversionDock />
      <LiveActivityToast />
      <ExitIntentModal />
    </div>
  );
}
