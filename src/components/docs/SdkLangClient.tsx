'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Code2,
  Terminal,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Zap,
  Flame,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { SdkLangGuide } from '@/lib/data/sdksData';
import { SDK_LANG_GUIDES } from '@/lib/data/sdksData';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface SdkLangClientProps {
  guide: SdkLangGuide;
}

export function SdkLangClient({ guide }: SdkLangClientProps) {
  const [activeCodeTab, setActiveCodeTab] = useState<'standard' | 'streaming'>('standard');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleCopy = async (text: string, id: string) => {
    const ok = await safeCopyToClipboard(text);
    if (ok) {
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const siblingSdks = SDK_LANG_GUIDES.filter((s) => s.slug !== guide.slug);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'SDKs', href: '/docs/sdks' },
            { label: guide.language },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Lead */}
        <section id="sdk-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-indigo-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
              <Code2 className="w-3.5 h-3.5" />
              <span>{guide.badge}</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {guide.headline}
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            {guide.description}
          </p>
        </section>

        <DocsSubNav />

        {/* Installation Command Block */}
        <section id="install-step" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-400">Step 1: Install Package</span>
              <h2 className="text-lg font-bold text-white font-mono">{guide.packageManager}</h2>
            </div>

            <button
              onClick={() => handleCopy(guide.installCommand, 'install')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedKey === 'install' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'install' ? 'Copied' : 'Copy Command'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-amber-300 overflow-x-auto">
            {guide.installCommand}
          </pre>
        </section>

        {/* Code Example with Standard & Streaming Tabs */}
        <section id="code-snippet" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">Step 2: Initialize Client</span>
              <h2 className="text-lg font-bold text-white font-mono">1-Line Drop-in Gateway Setup</h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-xl bg-black/50 p-1 border border-white/10 font-mono text-xs">
                <button
                  onClick={() => setActiveCodeTab('standard')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeCodeTab === 'standard' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Standard
                </button>
                <button
                  onClick={() => setActiveCodeTab('streaming')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeCodeTab === 'streaming' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  SSE Streaming
                </button>
              </div>

              <button
                onClick={() => handleCopy(activeCodeTab === 'standard' ? guide.codeSnippet : guide.streamingSnippet, 'code')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedKey === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'code' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
            {activeCodeTab === 'standard' ? guide.codeSnippet : guide.streamingSnippet}
          </pre>
        </section>

        {/* AEO Frequently Asked Questions */}
        <section id="sdk-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions ({guide.language})</span>
            </h2>
            <p className="text-xs text-zinc-400">Integration specifics and configuration guidance.</p>
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

        {/* Sibling SDK Guides */}
        <section id="other-sdks" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono">
              Explore More Language &amp; SDK Guides
            </h2>
            <p className="text-xs text-zinc-400">Native drop-in clients for every major backend runtime.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            <Link
              href="/docs/sdks/python"
              className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-cyan-500/40 transition-all space-y-1 group"
            >
              <span className="text-xs font-bold text-white group-hover:text-cyan-300 font-mono block">
                Python SDK Guide →
              </span>
              <span className="text-[11px] text-zinc-400">Official OpenAI Python library drop-in.</span>
            </Link>

            <Link
              href="/docs/sdks/typescript"
              className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-amber-500/40 transition-all space-y-1 group"
            >
              <span className="text-xs font-bold text-white group-hover:text-amber-300 font-mono block">
                TypeScript SDK Guide →
              </span>
              <span className="text-[11px] text-zinc-400">Node.js &amp; Edge runtime TypeScript drop-in.</span>
            </Link>

            {siblingSdks.map((sdk) => (
              <Link
                key={sdk.slug}
                href={`/docs/sdks/${sdk.slug}`}
                className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-indigo-500/40 transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-indigo-300 font-mono">
                    {sdk.language} Guide
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-300 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">
                  {sdk.description}
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
