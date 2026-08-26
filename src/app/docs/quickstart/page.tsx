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
import { Zap, Sparkles, Terminal, Code2, ArrowRight } from 'lucide-react';
import { constructMetadata } from '@/lib/seo/metadata';
import {
  JsonLd,
  createHowToSchema,
  createTechArticleSchema,
  createBreadcrumbSchema,
  createSoftwareSourceCodeSchema,
} from '@/lib/seo/jsonld';

export const metadata: Metadata = constructMetadata({
  title: '30-Second Quickstart Guide — Connect Python, TS & cURL',
  description: 'Connect to the GALXAI API Gateway in under 30 seconds using Python, TypeScript, Cursor IDE, or cURL with 25%–40% wholesale savings and 0 code refactoring.',
  canonicalPath: '/docs/quickstart',
  keywords: [
    'GALXAI Quickstart',
    'OpenAI Python Quickstart',
    'TypeScript LLM Setup',
    'Cursor IDE Setup Guide',
    'Fastest AI Router Quickstart',
  ],
});

export default function QuickstartDocPage() {
  const pythonCode = `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Explain prompt caching in 20 words"}]
)
print(response.choices[0].message.content)`;

  const tsCode = `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY || "galx_live_your_gateway_key",
});

const completion = await client.chat.completions.create({
  model: "gpt-5.6-sol",
  messages: [{ role: "user", content: "Hello GALXAI!" }],
});
console.log(completion.choices[0].message.content);`;

  const howToSchema = createHowToSchema({
    name: 'How to Connect to the GALXAI Universal AI Gateway in 30 Seconds',
    description: 'Learn how to route OpenAI Codex and xAI Grok requests through GALXAI with 25%–40% wholesale savings and zero code refactoring.',
    totalTime: 'PT30S',
    steps: [
      {
        name: 'Mint Your Gateway API Key',
        text: 'Generate a live developer API key (galx_live_...) with $5 free introductory credit.',
      },
      {
        name: 'Set Your Base URL',
        text: 'Set the OpenAI SDK or Cursor IDE Base URL to https://api.galx.ai/v1.',
      },
      {
        name: 'Execute Your First Completion',
        text: 'Run standard chat completion code against GPT-5.6 Sol or Grok 4.5.',
      },
    ],
  });

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      howToSchema,
      createSoftwareSourceCodeSchema({
        name: 'GALXAI Python SDK Quickstart Snippet',
        programmingLanguage: 'Python',
        codeSample: pythonCode,
        targetUrl: 'https://galx.ai/docs/quickstart#python-quickstart',
      }),
      createSoftwareSourceCodeSchema({
        name: 'GALXAI TypeScript SDK Quickstart Snippet',
        programmingLanguage: 'TypeScript',
        codeSample: tsCode,
        targetUrl: 'https://galx.ai/docs/quickstart#ts-quickstart',
      }),
      createTechArticleSchema({
        headline: '30-Second Quickstart Guide: Connect Python, TS & cURL to GALXAI',
        description: 'Complete quickstart tutorial with 1-line connection code for Python, TypeScript, and cURL.',
        path: '/docs/quickstart',
      }),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Docs', url: '/docs' },
        { name: 'Quickstart', url: '/docs/quickstart' },
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
            { label: 'Getting Started' },
            { label: '30-Second Quickstart Guide' },
          ]}
        />

        {/* Hero Header */}
        <section id="hero-summary" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <Zap className="w-3.5 h-3.5" />
              <span>30-SECOND ONBOARDING • 0 REFACTORING</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Guide"
              title="GALXAI 30-Second Developer Quickstart"
              description="Learn how to connect to the GALXAI API Gateway in 30 seconds with 25%–40% wholesale savings."
            />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">30-Second Developer Quickstart</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-sans">
            Start routing completions through GALXAI in 30 seconds. Seamless 1-line drop-in for the official OpenAI Python and Node.js SDKs with sub-15ms Anycast latency.
          </p>
        </section>

        <DocsSubNav />

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* Guided Wizard & Code Sandbox */}
        <section id="guided-setup-wizard">
          <GuidedSetupWizard />
        </section>

        {/* Quick Links & Next Steps */}
        <section id="sdk-deep-dives" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/docs/sdks/python"
            className="glass-card rounded-3xl p-6 border border-white/5 space-y-2 hover:border-cyan-500/40 transition-all group"
          >
            <div className="flex items-center justify-between">
              <Code2 className="w-5 h-5 text-cyan-400" />
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 group-hover:text-cyan-400 transition-all" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
              Python SDK Deep Dive
            </h3>
            <p className="text-xs text-zinc-400">
              Explore AsyncIO gathering, streaming generators, and Pydantic structured schemas.
            </p>
          </Link>

          <Link
            href="/docs/sdks/typescript"
            className="glass-card rounded-3xl p-6 border border-white/5 space-y-2 hover:border-amber-500/40 transition-all group"
          >
            <div className="flex items-center justify-between">
              <Terminal className="w-5 h-5 text-amber-400" />
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 group-hover:text-amber-400 transition-all" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
              TypeScript SDK Deep Dive
            </h3>
            <p className="text-xs text-zinc-400">
              Integrate with Vercel AI SDK, Next.js App Router, and end-to-end Zod parsing.
            </p>
          </Link>

          <Link
            href="/docs/ide-setup"
            className="glass-card rounded-3xl p-6 border border-white/5 space-y-2 hover:border-indigo-500/40 transition-all group"
          >
            <div className="flex items-center justify-between">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 group-hover:text-indigo-400 transition-all" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-zinc-200 transition-colors">
              Cursor &amp; Windsurf IDE Setup
            </h3>
            <p className="text-xs text-zinc-400">
              Configure your AI code editor in 1 click for instant sub-second completions.
            </p>
          </Link>
        </section>

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
