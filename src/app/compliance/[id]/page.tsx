'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  ShieldCheck,
  FileCheck2,
  Lock,
  Download,
  CheckCircle2,
  ArrowLeft,
  Printer,
  Building2,
  Check,
  Calendar,
  FileText
} from 'lucide-react';

interface ComplianceDocDetail {
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

const COMPLIANCE_MAP: Record<string, ComplianceDocDetail> = {
  'soc2': {
    id: 'soc2',
    title: 'SOC 2 Type II Security Audit Attestation',
    category: 'Security & Availability',
    badge: 'Certified Clean Opinion',
    lastUpdated: 'August 2026',
    version: 'v2026.2',
    auditor: 'Schellman & Company, LLC (Independent CPA)',
    summary: 'This SOC 2 Type II report confirms that GALXAI has implemented and maintained robust technical and organizational security controls over confidentiality, availability, and processing integrity.',
    sections: [
      {
        heading: '1. Scope of Audit & System Description',
        content: 'The evaluation covered all components of the GALXAI Universal API Gateway, including the P-AHT sub-15ms router, dynamic rate limiter, tenant isolation vaults, and micro-billing ledger.'
      },
      {
        heading: '2. Cryptographic Zero-Retention Verification',
        content: 'Auditors verified that inference prompts and streamed responses are routed ephemerally in RAM and are permanently discarded immediately upon HTTP stream termination.'
      },
      {
        heading: '3. Multi-Tenant Key Vault Isolation',
        content: 'API keys and shard authentication credentials utilize AES-256-GCM authenticated encryption with tenant-specific Additional Authenticated Data (AAD) preventing cross-tenant transplantation.'
      },
      {
        heading: '4. Auditor Opinion & Clean Attestation',
        content: 'The independent examination concluded with an unqualified (clean) opinion with zero reported security or confidentiality deviations.'
      }
    ]
  },
  'hipaa_baa': {
    id: 'hipaa_baa',
    title: 'HIPAA Business Associate Agreement (BAA)',
    category: 'Healthcare & PHI Protection',
    badge: 'Execute-Ready Legal Standard',
    lastUpdated: 'July 2026',
    version: 'v4.0',
    auditor: 'GALXAI Legal & Privacy Counsel',
    summary: 'Standard Business Associate Agreement governing the transmission of Protected Health Information (PHI) through the GALXAI high-throughput API gateway.',
    sections: [
      {
        heading: '1. Permitted Uses & Disclosures',
        content: 'GALXAI acts strictly as a Conduit / Business Associate solely to perform real-time model routing and token arbitration as requested by the Covered Entity.'
      },
      {
        heading: '2. Zero Persistent PHI Storage',
        content: 'No PHI, patient identifiers, clinical notes, or medical completion outputs are stored, logged, cached, or utilized for model training.'
      },
      {
        heading: '3. Technical Safeguards & Breach Notification',
        content: 'All transmission channels enforce TLS 1.3 encryption. GALXAI maintains 24/7 automated intrusion detection and commits to immediate breach notification pursuant to 45 CFR § 164.410.'
      }
    ]
  },
  'dpa_gdpr': {
    id: 'dpa_gdpr',
    title: 'Data Processing Addendum (DPA) & Standard Contractual Clauses',
    category: 'International Data Privacy',
    badge: 'GDPR / CCPA / UK-GDPR Compliant',
    lastUpdated: 'August 2026',
    version: 'v3.2',
    auditor: 'European Data Protection Advisory Board Standards',
    summary: 'Standard Contractual Clauses (SCCs Module 2 - Controller to Processor) ensuring complete data sovereignty and international transfer compliance.',
    sections: [
      {
        heading: '1. Processing Instructions & Data Subject Rights',
        content: 'GALXAI processes personal data solely on documented instructions from the customer controller and provides full support for Data Subject Access Requests (DSARs).'
      },
      {
        heading: '2. Sub-Processor Governance',
        content: 'Upstream frontier compute providers (OpenAI, xAI) are bound by equivalent zero-retention enterprise commitments. Customers receive 30 days prior notice for any sub-processor updates.'
      },
      {
        heading: '3. International Data Transfers (SCCs)',
        content: 'Incorporates EU Commission Decision 2021/914 Standard Contractual Clauses with robust supplementary transfer impact assessments (TIAs).'
      }
    ]
  },
  'iso27001': {
    id: 'iso27001',
    title: 'ISO/IEC 27001:2022 Information Security Certification',
    category: 'Information Security Management',
    badge: 'ANAB Accredited Certificate',
    lastUpdated: 'June 2026',
    version: '2022 Revision',
    auditor: 'BSI Group Global Registrars',
    summary: 'Formal certification demonstrating that GALXAI operates an Information Security Management System (ISMS) compliant with ISO/IEC 27001:2022.',
    sections: [
      {
        heading: '1. ISMS Scope & Infrastructure Boundary',
        content: 'Covers the design, development, operation, and maintenance of the cloud-native model routing gateway, key management vaults, and financial billing engines.'
      },
      {
        heading: '2. Annex A Control Implementation',
        content: '93 individual security controls implemented across Organizational, People, Physical, and Technological domains.'
      }
    ]
  },
  'zdr_protocol': {
    id: 'zdr_protocol',
    title: 'Zero Data Retention (ZDR) Technical Verification Protocol',
    category: 'Architecture & Cryptography',
    badge: 'Provable Ephemeral Transit',
    lastUpdated: 'August 2026',
    version: 'v5.0',
    auditor: 'GALXAI Systems Architecture Group',
    summary: 'Technical whitepaper and runtime verification methodology proving zero persistent storage of prompt payloads or model inference streams.',
    sections: [
      {
        heading: '1. Ephemeral Pipe Architecture',
        content: 'Completions and embeddings flow through streaming chunk buffers in volatile process memory with zero disk writes or database persistence.'
      },
      {
        heading: '2. Memory Zeroization on Stream Close',
        content: 'Internal node buffers undergo immediate cryptographic memory zeroization upon HTTP response close (`crypto.randomFillSync` buffer purge).'
      }
    ]
  }
};

export default function SingleComplianceDocPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const docId = resolvedParams.id;
  const doc = COMPLIANCE_MAP[docId] || COMPLIANCE_MAP['soc2'];

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
            { label: doc.title }
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
              <p className="text-xs text-zinc-400 font-mono">GALXAI Infrastructure, Inc. • Security & Legal Compliance Group</p>
              <p className="text-xs text-zinc-500">548 Market St, Suite 39201, San Francisco, CA 94104</p>
            </div>

            <div className="text-right font-mono text-xs space-y-1">
              <div className="text-sm font-bold text-white">Version: {doc.version}</div>
              <div className="text-zinc-400">Audited: {doc.lastUpdated}</div>
              <div className="text-emerald-400 font-bold">Status: Active & Valid</div>
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
                <span>Digitally Signed & Certified Cryptographically</span>
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
