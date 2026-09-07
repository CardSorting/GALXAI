'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  BookOpen,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Activity,
  ShieldCheck,
  Flame,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import type { GlossaryTerm } from '@/lib/data/glossaryData';
import { GLOSSARY_TERMS } from '@/lib/data/glossaryData';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface GlossaryTermClientProps {
  term: GlossaryTerm;
}

export function GlossaryTermClient({ term }: GlossaryTermClientProps) {
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const siblingTerms = GLOSSARY_TERMS.filter((t) => t.slug !== term.slug);

  const samplePythonCode = `from openai import OpenAI

# Leverage ${term.term} with GALXAI Universal Gateway
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Automated 25%-40% wholesale pricing and 75% prompt caching
response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Execute high-throughput inference with ${term.term}"}]
)
print(response.choices[0].message.content)`;

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(samplePythonCode);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs
          items={[
            { label: 'Glossary', href: '/glossary' },
            { label: term.term },
          ]}
        />

        {/* Hero Section */}
        <section id="term-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="uppercase">{term.category} ARCHITECTURE</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Definition"
              title={`${term.term} — AI Engineering Definition`}
              description={term.shortDefinition}
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight font-sans">
            {term.term}
          </h1>
          <p className="text-base sm:text-lg text-zinc-200 leading-relaxed font-sans font-medium">
            {term.shortDefinition}
          </p>

          {term.wikidataUri && (
            <div className="pt-2 flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span>Ontological Reference:</span>
              <a
                href={term.wikidataUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 hover:underline"
              >
                <span>Wikidata Entity</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </section>

        {/* Deep Architectural Context */}
        <section id="technical-deep-dive" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-xl font-bold text-white font-sans flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Full Architectural Specification</span>
            </h2>
            <p className="text-xs text-zinc-400">In-depth technical breakdown and gateway mechanics.</p>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed font-sans">
            {term.fullDefinition}
          </p>

          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-1.5 font-mono text-xs">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold">Engineering Implementation Context:</span>
            <p className="text-cyan-300 font-sans text-xs">{term.technicalContext}</p>
          </div>
        </section>

        {/* 1-Line Drop-in Implementation */}
        <section id="code-implementation" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                1-Line Implementation Example
              </span>
              <h2 className="text-lg font-bold text-white font-mono">Use {term.term} in Production</h2>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
            {samplePythonCode}
          </pre>
        </section>

        {/* Related Architectural Terms Graph */}
        <section id="related-terms" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono">
              Related Knowledge &amp; Architectural Concepts
            </h2>
            <p className="text-xs text-zinc-400">Cross-connected systems and infrastructure mechanics.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {siblingTerms.slice(0, 6).map((sibling) => (
              <Link
                key={sibling.slug}
                href={`/glossary/${sibling.slug}`}
                className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-cyan-500/40 transition-all space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300 font-sans">
                    {sibling.term}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">
                  {sibling.shortDefinition}
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
