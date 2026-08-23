'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ArrowRight,
  Zap,
  Activity,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Server,
  HeartHandshake,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import type { ReliabilityItem } from '@/lib/data/reliabilityData';
import { RELIABILITY_DATA } from '@/lib/data/reliabilityData';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface ReliabilityClientProps {
  reliability: ReliabilityItem;
}

export function ReliabilityClient({ reliability }: ReliabilityClientProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(reliability.runbookCodeSnippet.code);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const siblingReliabilities = RELIABILITY_DATA.filter(
    (r) => r.slug !== reliability.slug
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Reliability', href: '/status' },
            { label: 'Resilience Architecture', href: '/docs/architecture' },
            { label: reliability.badge },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Lead */}
        <section id="reliability-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-rose-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>RELIABILITY &amp; INCIDENT RESILIENCE • {reliability.badge}</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Case Study"
              title={reliability.title}
              description={reliability.description}
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {reliability.headline}
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            {reliability.description}
          </p>

          {/* SLA Guarantee Banner */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs leading-relaxed font-sans font-medium flex items-center gap-3">
            <HeartHandshake className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <strong className="text-white block font-mono text-[11px] uppercase">
                SLA Guarantee:
              </strong>
              <span>{reliability.uptimeGuarantee}</span>
            </div>
          </div>
        </section>

        <DocsSubNav />

        {/* Incident Scenario Analysis */}
        <section id="scenario-analysis" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3 border border-white/10">
          <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Incident Scenario &amp; Threat Analysis</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
            {reliability.incidentScenario}
          </p>
        </section>

        {/* Mitigation Strategy */}
        <section id="mitigation-strategy" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Engineered Mitigation Mechanisms</span>
            </h2>
            <p className="text-xs text-zinc-400">Architectural safeguards deployed to prevent service disruption.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 font-sans text-xs">
            {reliability.mitigationStrategy.map((strategy, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-zinc-200 leading-relaxed">{strategy}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Runbook Code Snippet */}
        <section id="runbook-code" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">
                Resilience Runbook ({reliability.runbookCodeSnippet.language})
              </span>
              <h2 className="text-lg font-bold text-white font-mono">
                {reliability.runbookCodeSnippet.title}
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
            {reliability.runbookCodeSnippet.code}
          </pre>
        </section>

        {/* AEO Frequently Asked Questions */}
        <section id="reliability-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions ({reliability.badge})</span>
            </h2>
            <p className="text-xs text-zinc-400">Failover latency, circuit breaker thresholds, and zero-downtime operations.</p>
          </div>

          <div className="space-y-3 pt-2">
            {reliability.faqs.map((faq, idx) => {
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

        {/* Sibling Reliability Guides */}
        <section id="other-reliabilities" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono">
              Explore More Reliability &amp; Resilience Case Studies
            </h2>
            <p className="text-xs text-zinc-400">Learn how GALXAI guarantees high availability across mission-critical AI applications.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {siblingReliabilities.map((sr) => (
              <Link
                key={sr.slug}
                href={`/reliability/${sr.slug}`}
                className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-rose-500/40 transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-rose-300 font-mono">
                    {sr.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-rose-300 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">
                  {sr.description}
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
