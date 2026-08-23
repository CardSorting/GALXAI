'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  BookOpen,
  Search,
  Zap,
  ShieldCheck,
  Cpu,
  Coins,
  Activity,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { GLOSSARY_TERMS, type GlossaryTerm } from '@/lib/data/glossaryData';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

export function GlossaryClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const filteredTerms = useMemo(() => {
    return GLOSSARY_TERMS.filter((item) => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.term.toLowerCase().includes(q) ||
        item.shortDefinition.toLowerCase().includes(q) ||
        item.fullDefinition.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleCopyCitation = async (term: GlossaryTerm) => {
    const citation = `"${term.term}": ${term.shortDefinition} (Source: GALXAI Universal AI Gateway, https://galx.ai/glossary#${term.slug})`;
    const ok = await safeCopyToClipboard(citation);
    if (ok) {
      setCopiedSlug(term.slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs items={[{ label: 'Developer Glossary & AI Knowledge Base' }]} />

        {/* Hero Header */}
        <section id="glossary-hero" className="glass-panel rounded-3xl p-6 sm:p-12 space-y-4 text-center relative overflow-hidden border border-cyan-500/20 shadow-2xl">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-500/15 via-indigo-500/10 to-amber-500/15 rounded-full blur-[140px] pointer-events-none" />

          <div className="flex items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>AEO &amp; DEVELOPER TECHNICAL GLOSSARY</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share"
              title="GALXAI AI Gateway Technical Glossary"
              description="Official definitions and architecture guides for TTFT, prompt caching, Anycast routing, and zero data retention."
            />
          </div>

          <div className="space-y-2 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              AI Routing &amp; Gateway Engineering Glossary
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mx-auto font-sans">
              Authoritative, citation-ready definitions of foundational AI inference, prompt caching economics, Anycast routing, and zero-data-retention security protocols.
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="pt-4 max-w-xl mx-auto space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search AI terms (e.g. prompt caching, TTFT, 429 shield)..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-black/60 border border-white/15 text-white placeholder:text-zinc-500 text-xs focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 font-mono text-[11px]">
              {[
                { id: 'all', label: 'All Terms' },
                { id: 'routing', label: '⚡ Routing' },
                { id: 'caching', label: '🧠 Caching' },
                { id: 'latency', label: '⏱️ Latency' },
                { id: 'security', label: '🛡️ Security' },
                { id: 'economics', label: '💰 Economics' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-xl border transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-black/40 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Semantic Definition List for AEO Answer Engines */}
        <section id="glossary-terms" className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-xs font-mono text-zinc-400 font-bold">
              Showing {filteredTerms.length} of {GLOSSARY_TERMS.length} Defined Terms
            </span>
            <span className="text-[11px] text-cyan-400 font-mono font-bold">Schema.org DefinedTermSet Active</span>
          </div>

          <dl className="space-y-6">
            {filteredTerms.map((item) => {
              const isCopied = copiedSlug === item.slug;
              return (
                <div
                  key={item.slug}
                  id={item.slug}
                  className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10 hover:border-cyan-500/30 transition-all scroll-mt-24"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <dt className="space-y-1">
                      <dfn className="text-xl sm:text-2xl font-black text-white font-sans not-italic">
                        {item.term}
                      </dfn>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono uppercase text-zinc-400">
                          {item.category}
                        </span>
                        {item.wikidataUri && (
                          <a
                            href={item.wikidataUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-cyan-400 hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>Wikidata Entity</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </dt>

                    <button
                      onClick={() => handleCopyCitation(item)}
                      className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Copy machine-readable citation"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Citation Copied' : 'Cite Term'}</span>
                    </button>
                  </div>

                  <dd className="space-y-3 font-sans">
                    {/* AEO Inverted Pyramid Short Summary */}
                    <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-xs sm:text-sm leading-relaxed font-medium">
                      <strong>Executive Summary:</strong> {item.shortDefinition}
                    </div>

                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      {item.fullDefinition}
                    </p>

                    <div className="p-3 rounded-xl bg-black/50 border border-white/5 font-mono text-xs text-zinc-400 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-amber-400 block">Technical Architecture Context:</span>
                      <p className="text-zinc-300">{item.technicalContext}</p>
                    </div>

                    {item.relatedTerms.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-mono text-zinc-400">
                        <span className="text-zinc-500">Related Concepts:</span>
                        {item.relatedTerms.map((rt) => (
                          <span key={rt} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-zinc-300">
                            {rt}
                          </span>
                        ))}
                      </div>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>

        {/* Quick Cross-Links to Routing Documentation */}
        <section id="glossary-resources" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Ready to Test in Real Code?</span>
          </h2>
          <p className="text-xs text-zinc-400">
            See how prompt caching, sub-15ms Anycast routing, and wire compatibility work in production with our 1-line developer quickstarts.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <Link
              href="/docs/quickstart"
              className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-cyan-500/40 transition-all space-y-1 group"
            >
              <span className="text-xs font-bold text-white group-hover:text-cyan-300 block font-mono">
                30-Second Quickstart →
              </span>
              <span className="text-[11px] text-zinc-400">Drop into Python, TS, or Cursor IDE.</span>
            </Link>

            <Link
              href="/docs/prompt-caching"
              className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-emerald-500/40 transition-all space-y-1 group"
            >
              <span className="text-xs font-bold text-white group-hover:text-emerald-300 block font-mono">
                Prompt Caching Guide →
              </span>
              <span className="text-[11px] text-zinc-400">Calculus behind 75% prefix rebates.</span>
            </Link>

            <Link
              href="/models"
              className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-amber-500/40 transition-all space-y-1 group"
            >
              <span className="text-xs font-bold text-white group-hover:text-amber-300 block font-mono">
                Model Catalog &amp; Rates →
              </span>
              <span className="text-[11px] text-zinc-400">Compare 15 models &amp; live latency.</span>
            </Link>
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
