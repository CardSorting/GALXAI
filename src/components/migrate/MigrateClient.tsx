'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  ArrowLeftRight,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Zap,
  Flame,
  ShieldCheck,
  Code2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import type { MigrationGuideItem } from '@/lib/data/migrationData';
import { MIGRATION_GUIDES_DATA } from '@/lib/data/migrationData';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface MigrateClientProps {
  guide: MigrationGuideItem;
}

export function MigrateClient({ guide }: MigrateClientProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [migrationEmail, setMigrationEmail] = useState('');
  const [migrationCompany, setMigrationCompany] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [migrationSubmitted, setMigrationSubmitted] = useState(false);

  const handleRequestMigrationAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!migrationEmail || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/inbound/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: migrationEmail,
          companyName: migrationCompany || 'Migrating Team',
          source: 'migrate',
          notes: `Migration Inquiry from ${guide.sourceProvider} (${guide.slug}). Estimated cost reduction: ~${guide.estimatedCostReductionPct}%.`,
        }),
      });
      setMigrationSubmitted(true);
    } catch {
      // fallback
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(guide.afterCode.code);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const siblingGuides = MIGRATION_GUIDES_DATA.filter((g) => g.slug !== guide.slug);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs
          items={[
            { label: 'Migration Guides', href: '/docs/migration' },
            { label: `Migrate from ${guide.sourceProvider}` },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Lead */}
        <section id="migration-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{guide.badge}</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Guide"
              title={guide.title}
              description={guide.description}
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {guide.headline}
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            {guide.description}
          </p>

          <div className="p-4 rounded-2xl bg-black/60 border border-emerald-500/30 flex items-center justify-between gap-3 font-mono text-xs">
            <span className="text-zinc-400">Estimated Enterprise Cloud Cost Reduction:</span>
            <span className="text-emerald-400 font-black text-sm flex items-center gap-1">
              <Flame className="w-4 h-4 fill-emerald-400" />
              <span>~{guide.estimatedCostReductionPct}% Net Savings</span>
            </span>
          </div>
        </section>

        {/* Key Architectural Improvements Checklist */}
        <section id="benefits-checklist" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Why Migrate from {guide.sourceProvider} to GALXAI?</span>
            </h2>
            <p className="text-xs text-zinc-400">Architectural bottlenecks and billing friction eliminated.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 font-sans text-xs">
            {guide.keyPainPointsSolved.map((point, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-zinc-200 leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Side-by-Side Code Diff (Before vs After) */}
        <section id="code-diff" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-400">Direct Code Comparison</span>
              <h2 className="text-xl font-black text-white font-mono">1-Line Configuration Diff</h2>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy GALXAI Code'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs">
            {/* Before Code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2">
                <span className="text-zinc-500 font-bold text-[11px] uppercase">
                  BEFORE ({guide.sourceProvider})
                </span>
                <span className="text-rose-400 text-[10px]">Legacy Complex SDK</span>
              </div>
              <pre className="p-4 rounded-2xl bg-black/70 border border-rose-500/20 text-rose-300/80 overflow-x-auto min-h-[160px] leading-relaxed">
                {guide.beforeCode.code}
              </pre>
            </div>

            {/* After Code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2">
                <span className="text-emerald-400 font-bold text-[11px] uppercase">
                  AFTER (GALXAI Universal Gateway)
                </span>
                <span className="text-emerald-400 text-[10px] font-bold">Standard 1-Line Drop-in</span>
              </div>
              <pre className="p-4 rounded-2xl bg-black/70 border border-emerald-500/40 text-emerald-300 overflow-x-auto min-h-[160px] leading-relaxed">
                {guide.afterCode.code}
              </pre>
            </div>
          </div>
        </section>

        {/* Inbound Migration Assessment Lead Card */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-black/60 to-emerald-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Request Free Assisted Migration &amp; Spend Audit</span>
              </h3>
              <p className="text-xs text-zinc-300">
                Receive a ready-to-merge GitHub pull request and custom token spend modeling for your team.
              </p>
            </div>

            {migrationSubmitted ? (
              <div className="px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
                ✔ Migration Request Received! Our engineering team will reach out shortly.
              </div>
            ) : (
              <form onSubmit={handleRequestMigrationAudit} className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <input
                  type="email"
                  required
                  value={migrationEmail}
                  onChange={(e) => setMigrationEmail(e.target.value)}
                  placeholder="tech-lead@company.com"
                  className="px-3 py-2 rounded-xl bg-black border border-white/20 text-white placeholder:text-zinc-500 text-xs font-mono focus:border-cyan-400 focus:outline-none w-full sm:w-56"
                />
                <input
                  type="text"
                  value={migrationCompany}
                  onChange={(e) => setMigrationCompany(e.target.value)}
                  placeholder="Company / Repo (optional)"
                  className="px-3 py-2 rounded-xl bg-black border border-white/20 text-white placeholder:text-zinc-500 text-xs font-mono focus:border-cyan-400 focus:outline-none w-full sm:w-48"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs uppercase tracking-wider shrink-0 transition-all cursor-pointer disabled:opacity-50 font-mono"
                >
                  {isSubmitting ? 'Requesting...' : 'Request Migration Plan →'}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Step-by-Step Migration Breakdown */}
        <section id="step-breakdown" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span>3-Step Migration Walkthrough</span>
            </h2>
            <p className="text-xs text-zinc-400">Zero-downtime cutover plan for production environments.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 font-sans text-xs">
            {guide.migrationSteps.map((s, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-cyan-300 block uppercase">{s.step}</span>
                <p className="text-zinc-300 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* AEO Frequently Asked Questions */}
        <section id="migration-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions ({guide.sourceProvider} Migration)</span>
            </h2>
            <p className="text-xs text-zinc-400">Security compliance, latency parity, and billing transition facts.</p>
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

        {/* Sibling Migration Guides */}
        <section id="other-migrations" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono">
              Explore More Cloud Migration Guides
            </h2>
            <p className="text-xs text-zinc-400">Step-by-step cutover tutorials for every major cloud AI platform.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {siblingGuides.map((sg) => (
              <Link
                key={sg.slug}
                href={`/migrate/${sg.slug}`}
                className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-cyan-500/40 transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300 font-mono">
                    Migrate from {sg.sourceProvider}
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
        <TrustSeals />
      </main>

      {/* Floating Conversion Dock */}
      <FloatingConversionDock />
    </div>
  );
}
