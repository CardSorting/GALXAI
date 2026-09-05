'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Zap,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Terminal,
  Code2,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Laptop,
  Flame,
} from 'lucide-react';
import type { IntegrationGuide } from '@/lib/data/integrationsData';
import { INTEGRATION_GUIDES } from '@/lib/data/integrationsData';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface IntegrationClientProps {
  guide: IntegrationGuide;
}

export function IntegrationClient({ guide }: IntegrationClientProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleCopy = async (text: string, id: string) => {
    const ok = await safeCopyToClipboard(text);
    if (ok) {
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const siblingGuides = INTEGRATION_GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'Integrations', href: '/docs/ide-setup' },
            { label: guide.name },
          ]}
        />

        {/* Hero Banner with AEO Inverted Pyramid Lead */}
        <section id="integration-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <Laptop className="w-3.5 h-3.5" />
              <span>{guide.badge}</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {guide.headline}
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            {guide.description}
          </p>

          {/* Quick Stats Strip */}
          <div className="flex flex-wrap items-center gap-4 pt-2 font-mono text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <Zap className="w-3.5 h-3.5 fill-emerald-400" />
              <span>Setup Time: ~30 Seconds</span>
            </span>
            <span>•</span>
            <span className="text-amber-300 font-bold">One API key</span>
            <span>•</span>
            <span className="text-cyan-300 font-bold">Model-specific cache rates</span>
          </div>
        </section>

        <DocsSubNav />

        {/* Inverted Pyramid AEO Direct Setup Blocks */}
        <section id="environment-config" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">Step 1: Environment Variables</span>
              <h2 className="text-lg font-bold text-white font-mono">1-Line Base URL Override</h2>
            </div>

            <button
              onClick={() => handleCopy(guide.envSnippet, 'env')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedKey === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'env' ? 'Copied' : 'Copy .env'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
            {guide.envSnippet}
          </pre>
        </section>

        {/* Tool-Specific Configuration Snippet */}
        <section id="tool-config" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-400">Step 2: Tool Configuration</span>
              <h2 className="text-lg font-bold text-white font-mono">{guide.configSnippet.filename}</h2>
            </div>

            <button
              onClick={() => handleCopy(guide.configSnippet.code, 'config')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedKey === 'config' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'config' ? 'Copied' : 'Copy Config'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-amber-200 overflow-x-auto leading-relaxed">
            {guide.configSnippet.code}
          </pre>
        </section>

        {/* Code Execution Example */}
        <section id="code-example" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-indigo-400">Step 3: Verification &amp; Test Code</span>
              <h2 className="text-lg font-bold text-white font-mono">Verify Connection ({guide.codeExample.language})</h2>
            </div>

            <button
              onClick={() => handleCopy(guide.codeExample.code, 'example')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedKey === 'example' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'example' ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
            {guide.codeExample.code}
          </pre>
        </section>

        {/* Step-by-Step Breakdown List */}
        <section id="step-breakdown" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>Step-by-Step Walkthrough</span>
            </h2>
            <p className="text-xs text-zinc-400">Detailed connection guide for production pipelines.</p>
          </div>

          <ol className="space-y-3 pt-2 font-sans text-xs">
            {guide.steps.map((step, idx) => (
              <li key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center shrink-0 text-xs">
                  {idx + 1}
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-bold text-white text-sm">{step.name}</h3>
                  <p className="text-zinc-400 leading-relaxed">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* AEO Frequently Asked Questions */}
        <section id="integration-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions ({guide.name})</span>
            </h2>
            <p className="text-xs text-zinc-400">Direct answers for developer questions and setup hesitations.</p>
          </div>

          <div className="space-y-3 pt-2">
            {guide.faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="font-bold text-white text-sm font-sans">{faq.q}</span>
                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-zinc-400">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-zinc-300 leading-relaxed border-t border-white/5 font-sans">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Sibling Integration Guides (pSEO Grid) */}
        <section id="other-integrations" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono">
              Explore More Framework &amp; IDE Integrations
            </h2>
            <p className="text-xs text-zinc-400">1-Line connection walkthroughs for all leading AI developer tools.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {siblingGuides.map((sg) => (
              <Link
                key={sg.slug}
                href={`/docs/integrations/${sg.slug}`}
                className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-cyan-500/40 transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300 font-mono">
                    {sg.name} Guide
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">
                  {sg.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Consumer-Grade Trust Seals */}
      </main>

      {/* Floating Conversion Dock */}
    </div>
  );
}
