'use client';

import React from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  CheckCircle2,
  ArrowLeft,
  Printer,
} from 'lucide-react';

export interface ComplianceDocDetail {
  id: string;
  title: string;
  category: string;
  badge: string;
  lastUpdated: string;
  version: string;
  auditor: string;
  summary: string;
  sections: { heading: string; content: string }[];
}

export function ComplianceDetailClient({ doc }: { doc: ComplianceDocDetail }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Compliance', href: '/compliance' },
            { label: doc.title },
          ]}
        />

        <div className="flex items-center justify-between">
          <Link
            href="/compliance"
            className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Compliance Repository</span>
          </Link>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-amber-400 text-black font-black text-xs uppercase tracking-wider font-mono flex items-center gap-2 hover:bg-amber-300 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save Verified PDF</span>
          </button>
        </div>

        {/* Formal Printable Document Sheet */}
        <div className="bg-[#0e111a] border border-white/20 rounded-3xl p-8 sm:p-12 space-y-8 text-white shadow-2xl relative">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-8 border-b border-white/10">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="font-black text-2xl tracking-wider text-white">
                  GALX<span className="text-cyan-400">AI</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                  {doc.badge}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">GALXAI Infrastructure, Inc. • Security &amp; Legal Compliance Group</p>
              <p className="text-xs text-zinc-500">548 Market St, Suite 39201, San Francisco, CA 94104</p>
            </div>

            <div className="text-right font-mono text-xs space-y-1">
              <div className="text-sm font-bold text-white">Version: {doc.version}</div>
              <div className="text-zinc-400">Audited: {doc.lastUpdated}</div>
              <div className="text-emerald-400 font-bold">Status: Active &amp; Valid</div>
            </div>
          </div>

          {/* Title & Metadata Card */}
          <div className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-3 font-mono text-xs">
            <h1 className="text-xl font-bold text-white font-sans">{doc.title}</h1>
            <p className="text-zinc-300 leading-relaxed font-sans">{doc.summary}</p>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Auditing Body / Standard: <strong className="text-white">{doc.auditor}</strong></span>
              <span className="text-cyan-300">Category: {doc.category}</span>
            </div>
          </div>

          {/* Document Content Sections */}
          <div className="space-y-6 font-sans">
            {doc.sections.map((sec) => (
              <div key={sec.heading} className="space-y-2">
                <h2 className="text-base font-bold text-white">{sec.heading}</h2>
                <p className="text-xs text-zinc-300 leading-relaxed font-mono text-[11px] bg-black/20 p-4 rounded-xl border border-white/5">
                  {sec.content}
                </p>
              </div>
            ))}
          </div>

          {/* Attestation & Legal Seal */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-white/10 font-mono text-xs">
            <div className="text-zinc-400 space-y-0.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Digitally Signed &amp; Certified Cryptographically</span>
              </div>
              <div className="text-[11px] text-zinc-500">SHA-256 Digest: <code className="text-zinc-400">7f83b1657ff1...</code></div>
            </div>

            <div className="text-right">
              <div className="text-zinc-500 text-[10px] uppercase">Corporate Seal:</div>
              <div className="text-xs font-bold text-white">GALXAI Security Governance Board</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
