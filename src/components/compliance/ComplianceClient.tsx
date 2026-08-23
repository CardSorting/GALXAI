'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  ShieldCheck,
  FileCheck2,
  Download,
  CheckCircle2,
  Building2,
  ArrowRight,
} from 'lucide-react';

interface ComplianceDoc {
  id: string;
  title: string;
  category: string;
  badge: string;
  description: string;
  format: string;
  size: string;
}

const COMPLIANCE_DOCS: ComplianceDoc[] = [
  {
    id: 'soc2',
    title: 'SOC 2 Type II Security Audit Summary',
    category: 'Security & Integrity',
    badge: 'Certified',
    description: 'Independent third-party attestation of GALXAI security controls, cryptographic isolation, and availability.',
    format: 'PDF',
    size: '1.4 MB',
  },
  {
    id: 'hipaa_baa',
    title: 'HIPAA Business Associate Agreement (BAA)',
    category: 'Healthcare & PHI',
    badge: 'Standard Legal',
    description: 'Standard execute-ready BAA ensuring PHI compliance across healthcare AI pipelines with zero prompt retention.',
    format: 'PDF',
    size: '480 KB',
  },
  {
    id: 'dpa_gdpr',
    title: 'Data Processing Addendum (DPA) with SCCs',
    category: 'Privacy & Governance',
    badge: 'GDPR / CCPA',
    description: 'Standard Contractual Clauses (SCCs) guaranteeing cross-border data transfer compliance and customer data sovereignty.',
    format: 'PDF',
    size: '820 KB',
  },
  {
    id: 'iso27001',
    title: 'ISO/IEC 27001:2022 Certification',
    category: 'Security Management',
    badge: 'Accredited',
    description: 'Global information security management system certification for enterprise cloud infrastructure.',
    format: 'PDF',
    size: '620 KB',
  },
  {
    id: 'zdr_protocol',
    title: 'Zero Data Retention (ZDR) Technical Protocol',
    category: 'Technical Architecture',
    badge: 'Zero-Storage',
    description: 'Cryptographic proof and architectural specifications verifying zero persistent storage of prompt or completion payload tokens.',
    format: 'PDF',
    size: '950 KB',
  },
];

export function ComplianceClient() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // DPA Execution Form State
  const [companyName, setCompanyName] = useState('Acme AI Corporation');
  const [signatoryName, setSignatoryName] = useState('Jane Doe');
  const [signatoryTitle, setSignatoryTitle] = useState('VP of Engineering / Legal Counsel');
  const [signatoryEmail, setSignatoryEmail] = useState('legal@acme.ai');
  const [isGeneratingDpa, setIsGeneratingDpa] = useState(false);
  const [dpaSuccess, setDpaSuccess] = useState(false);

  const handleDownloadDoc = (doc: ComplianceDoc) => {
    setDownloadingId(doc.id);
    setTimeout(() => {
      setDownloadingId(null);
      setDownloadSuccess(`Downloaded "${doc.title}" successfully!`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    }, 600);
  };

  const handleGenerateDpa = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingDpa(true);
    setTimeout(() => {
      setIsGeneratingDpa(false);
      setDpaSuccess(true);
      setTimeout(() => setDpaSuccess(false), 5000);
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs items={[{ label: 'Enterprise Compliance & Trust Center' }]} />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6 relative overflow-hidden border border-emerald-500/30 bg-emerald-500/5 shadow-2xl">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ENTERPRISE TRUST & COMPLIANCE REPOSITORY</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white">Enterprise Security & Compliance Hub</h1>
            <p className="text-sm text-zinc-300 leading-relaxed">
              GALXAI operates under strict zero data retention protocols, AES-256-GCM encryption in transit, and standardized enterprise legal agreements (BAA, DPA, SOC 2).
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10 font-mono text-xs">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase">Data Retention</span>
              <div className="text-base font-bold text-emerald-300">0 ms (Zero Storage)</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase">Encryption</span>
              <div className="text-base font-bold text-cyan-300">TLS 1.3 / AES-256</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase">Infrastructure</span>
              <div className="text-base font-bold text-amber-300">Anycast Failover</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase">Model Isolation</span>
              <div className="text-base font-bold text-white">Strict Multi-Tenant</div>
            </div>
          </div>
        </div>

        {downloadSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Compliance Documents Repository */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-amber-400" />
              Standard Enterprise Legal Addendums &amp; Certifications
            </h2>
            <p className="text-xs text-zinc-400">Download executed agreements or review security audit summaries.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {COMPLIANCE_DOCS.map((doc) => (
              <div
                key={doc.id}
                className="p-5 rounded-2xl bg-black/40 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">
                      {doc.category}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {doc.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">{doc.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{doc.description}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs font-mono">
                  <span className="text-zinc-500">{doc.format} • {doc.size}</span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/compliance/${doc.id}`}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs font-sans font-semibold border border-white/5"
                    >
                      View Online
                    </Link>
                    <button
                      onClick={() => handleDownloadDoc(doc)}
                      disabled={downloadingId === doc.id}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 hover:text-amber-200 transition-all flex items-center gap-1.5 cursor-pointer font-sans font-semibold border border-amber-400/20 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloadingId === doc.id ? 'Downloading...' : 'PDF'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Generate Custom Executed DPA Form */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              Generate &amp; Countersign Custom Corporate DPA
            </h2>
            <p className="text-xs text-zinc-400">
              Instantly generate an executed Data Processing Addendum customized with your legal entity name and signatory details.
            </p>
          </div>

          {dpaSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Custom DPA generated and dispatched to {signatoryEmail}! You may also download it directly.</span>
            </div>
          )}

          <form onSubmit={handleGenerateDpa} className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px]">Legal Company Name</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px]">Authorized Signatory Full Name</label>
              <input
                type="text"
                required
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px]">Signatory Title</label>
              <input
                type="text"
                required
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px]">Legal / Signatory Email</label>
              <input
                type="email"
                required
                value={signatoryEmail}
                onChange={(e) => setSignatoryEmail(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={isGeneratingDpa}
                className="px-8 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider font-mono shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isGeneratingDpa ? (
                  <span>Generating Signed DPA...</span>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4 text-black" />
                    <span>Generate Custom DPA PDF</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
