'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Code2,
  Zap,
  Flame,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Terminal,
} from 'lucide-react';
import type { ErrorTroubleshootItem } from '@/lib/data/errorsData';
import { ERROR_TROUBLESHOOT_DATA } from '@/lib/data/errorsData';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface ErrorTroubleshootClientProps {
  errorItem: ErrorTroubleshootItem;
}

export function ErrorTroubleshootClient({ errorItem }: ErrorTroubleshootClientProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(errorItem.codeSnippet.code);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const siblingErrors = ERROR_TROUBLESHOOT_DATA.filter((e) => e.code !== errorItem.code);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'Error Troubleshooting', href: '/docs/error-handling' },
            { label: `HTTP ${errorItem.httpStatus} (${errorItem.errorType})` },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Lead */}
        <section id="error-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-rose-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>HTTP {errorItem.httpStatus} • {errorItem.badge}</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {errorItem.headline}
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            {errorItem.description}
          </p>
        </section>

        <DocsSubNav />

        {/* Root Cause & Sample Error Payload Grid */}
        <section id="root-cause" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-white/10">
            <span className="text-[10px] font-mono uppercase font-bold text-amber-400 block">
              Architectural Root Cause
            </span>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              {errorItem.rootCause}
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-2 border border-rose-500/20 bg-rose-500/5">
            <span className="text-[10px] font-mono uppercase font-bold text-rose-400 block">
              Typical Upstream Error JSON
            </span>
            <pre className="p-3 rounded-xl bg-black/60 border border-white/5 font-mono text-[11px] text-rose-300 overflow-x-auto">
              {errorItem.sampleErrorPayload}
            </pre>
          </div>
        </section>

        {/* Permanent Fix & 1-Line Solution Code */}
        <section id="permanent-fix" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                Permanent Architectural Fix
              </span>
              <h2 className="text-lg font-bold text-white font-mono">1-Line Drop-in Gateway Resolution</h2>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Solution'}</span>
            </button>
          </div>

          <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
            {errorItem.permanentFix}
          </p>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
            {errorItem.codeSnippet.code}
          </pre>
        </section>

        {/* AEO Frequently Asked Questions */}
        <section id="error-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions ({errorItem.errorType})</span>
            </h2>
            <p className="text-xs text-zinc-400">Direct answers for production reliability and failover policies.</p>
          </div>

          <div className="space-y-3 pt-2">
            {errorItem.faqs.map((faq, idx) => {
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

        {/* Sibling Error Troubleshooting Guides */}
        <section id="other-errors" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono">
              Explore More Error Resolution Guides
            </h2>
            <p className="text-xs text-zinc-400">Fix timeout, authentication, context boundary, and JSON parse errors.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {siblingErrors.map((err) => (
              <Link
                key={err.code}
                href={`/docs/errors/${err.code}`}
                className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-rose-500/40 transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-rose-300 font-mono">
                    HTTP {err.httpStatus}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-rose-300 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">
                  {err.headline}
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
