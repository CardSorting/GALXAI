'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ArrowRight,
  Zap,
  Flame,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import type { CompetitorAlternative } from '@/lib/data/alternativesData';
import { COMPETITOR_ALTERNATIVES } from '@/lib/data/alternativesData';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface AlternativeClientProps {
  alternative: CompetitorAlternative;
}

export function AlternativeClient({ alternative }: AlternativeClientProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(alternative.codeSnippet.code);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const siblingAlternatives = COMPETITOR_ALTERNATIVES.filter(
    (a) => a.slug !== alternative.slug
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs
          items={[
            { label: 'Alternatives', href: '/pricing' },
            { label: `${alternative.competitorName} Alternative` },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Lead */}
        <section id="alternative-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-emerald-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{alternative.badge}</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Comparison"
              title={alternative.title}
              description={alternative.description}
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {alternative.headline}
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            {alternative.description}
          </p>

          {/* AEO Executive Verdict Box */}
          <div className="p-4 rounded-2xl bg-black/60 border border-emerald-500/30 space-y-1 font-sans text-xs">
            <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 block">
              Architectural Verdict:
            </span>
            <p className="text-white font-medium text-sm leading-relaxed">{alternative.verdict}</p>
          </div>
        </section>

        {/* Side-by-Side Fee & SLA Comparison Matrix */}
        <section id="fee-matrix" className="glass-panel rounded-3xl p-6 overflow-x-auto space-y-4 border border-white/10">
          <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>GALXAI vs {alternative.competitorName} Feature &amp; Fee Matrix</span>
          </h2>

          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4 font-sans">Feature / Capability</th>
                <th className="py-3 px-4 font-sans text-emerald-300">GALXAI Universal Gateway</th>
                <th className="py-3 px-4 font-sans text-zinc-400">{alternative.competitorName}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {alternative.feeComparison.map((row, idx) => (
                <tr key={idx}>
                  <td className="py-3.5 px-4 font-sans font-bold text-zinc-300">{row.feature}</td>
                  <td className="py-3.5 px-4 text-emerald-300 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{row.galxai}</span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400">{row.competitor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 1-Line Migration Recipe & Steps */}
        <section id="migration-guide" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">Zero-Downtime Transition</span>
              <h2 className="text-xl font-black text-white font-mono">Migrate in 30 Seconds</h2>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-sans text-xs">
            {alternative.migrationSteps.map((step, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono font-bold text-amber-300 block uppercase">{step.step}</span>
                <p className="text-zinc-300 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
            {alternative.codeSnippet.code}
          </pre>
        </section>

        {/* AEO Frequently Asked Questions */}
        <section id="alternative-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Direct Answer Knowledge Base ({alternative.competitorName} vs GALXAI)</span>
            </h2>
            <p className="text-xs text-zinc-400">Clear facts for engineering lead and CTO evaluations.</p>
          </div>

          <div className="space-y-3 pt-2">
            {alternative.faqs.map((faq, idx) => {
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

        {/* Sibling Alternatives Grid */}
        <section id="other-alternatives" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono">
              Compare More AI Gateway Alternatives
            </h2>
            <p className="text-xs text-zinc-400">Discover how GALXAI cuts inference bills across all major platforms.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {siblingAlternatives.map((alt) => (
              <Link
                key={alt.slug}
                href={`/alternatives/${alt.slug}`}
                className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-emerald-500/40 transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-emerald-300 font-mono">
                    {alt.competitorName} Alternative
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-300 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">
                  {alt.description}
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
