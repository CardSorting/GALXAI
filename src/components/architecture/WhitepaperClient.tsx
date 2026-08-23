'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Layers,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Zap,
  ShieldCheck,
  Cpu,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  FileText,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import type { ArchitectureWhitepaperItem } from '@/lib/data/architectureWhitepapersData';
import { ARCHITECTURE_WHITEPAPERS_DATA } from '@/lib/data/architectureWhitepapersData';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface WhitepaperClientProps {
  whitepaper: ArchitectureWhitepaperItem;
}

export function WhitepaperClient({ whitepaper }: WhitepaperClientProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(whitepaper.codeVerificationSnippet.code);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const siblingWhitepapers = ARCHITECTURE_WHITEPAPERS_DATA.filter(
    (w) => w.slug !== whitepaper.slug
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Architecture', href: '/architecture' },
            { label: 'Whitepapers', href: '/docs/architecture' },
            { label: whitepaper.badge },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Lead */}
        <section id="whitepaper-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <FileText className="w-3.5 h-3.5" />
              <span>TECHNICAL ARCHITECTURE WHITEPAPER • {whitepaper.badge}</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Whitepaper"
              title={whitepaper.title}
              description={whitepaper.description}
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {whitepaper.headline}
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            {whitepaper.description}
          </p>

          {/* Technical Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-mono">
            {whitepaper.technicalMetrics.map((metric, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-black/60 border border-cyan-500/30 space-y-1">
                <span className="text-[10px] uppercase text-zinc-400 font-bold block">{metric.label}</span>
                <span className="text-2xl font-black text-cyan-300 block">{metric.value}</span>
                <span className="text-[10px] text-zinc-500 block">{metric.context}</span>
              </div>
            ))}
          </div>
        </section>

        <DocsSubNav />

        {/* Abstract */}
        <section id="abstract" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3 border border-white/10">
          <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>Executive Abstract &amp; Problem Statement</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
            {whitepaper.abstract}
          </p>
        </section>

        {/* Engineering Principles */}
        <section id="principles" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Core Architectural Principles &amp; Guarantees</span>
            </h2>
            <p className="text-xs text-zinc-400">Formal specifications governing this subsystem.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 font-sans text-xs">
            {whitepaper.engineeringPrinciples.map((principle, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-zinc-200 leading-relaxed">{principle}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Verification Code Snippet */}
        <section id="verification-code" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                Technical Verification ({whitepaper.codeVerificationSnippet.language})
              </span>
              <h2 className="text-lg font-bold text-white font-mono">
                {whitepaper.codeVerificationSnippet.title}
              </h2>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
            {whitepaper.codeVerificationSnippet.code}
          </pre>
        </section>

        {/* AEO Frequently Asked Questions */}
        <section id="whitepaper-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions ({whitepaper.badge})</span>
            </h2>
            <p className="text-xs text-zinc-400">Architecture details, fault tolerance, and benchmarks.</p>
          </div>

          <div className="space-y-3 pt-2">
            {whitepaper.faqs.map((faq, idx) => {
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

        {/* Sibling Whitepapers */}
        <section id="other-whitepapers" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono">
              Explore More Technical Whitepapers
            </h2>
            <p className="text-xs text-zinc-400">Deep-dive systems engineering documentation across GALXAI.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {siblingWhitepapers.map((sw) => (
              <Link
                key={sw.slug}
                href={`/architecture/${sw.slug}`}
                className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-cyan-500/40 transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300 font-mono">
                    {sw.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">
                  {sw.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />
      </main>

      {/* Floating Conversion Dock */}
      <FloatingConversionDock />
    </div>
  );
}
