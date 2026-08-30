import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createBreadcrumbSchema } from '@/lib/seo/jsonld';
import { Shield, Lock, EyeOff, Server, CheckCircle2, ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'Privacy Policy & Zero Data Retention (ZDR) Protocol',
  description: 'GALXAI Privacy Policy, Ephemeral Data Zeroization, Zero Data Retention (ZDR) guarantees, GDPR, CCPA, and HIPAA compliance data protection practices.',
  canonicalPath: '/privacy',
  keywords: [
    'Privacy Policy',
    'Zero Data Retention',
    'ZDR Protocol',
    'GDPR Compliance',
    'CCPA Data Rights',
    'HIPAA BAA Privacy',
    'Ephemeral Token Processing',
  ],
});

export default function PrivacyPolicyPage() {
  const lastUpdated = 'January 1, 2026';

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Privacy Policy', href: '/privacy' },
  ];

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <JsonLd
        data={createBreadcrumbSchema([
          { name: 'Home', url: SITE_CONFIG.url },
          { name: 'Privacy Policy', url: `${SITE_CONFIG.url}/privacy` },
        ])}
      />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 w-full space-y-12">
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero Header */}
        <header className="space-y-4 border-b border-white/10 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>ENTERPRISE PRIVACY &amp; DATA SOVEREIGNTY</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Privacy Policy &amp; ZDR Protocol
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-3xl leading-relaxed">
            GALXAI is architected from the ground up for strict confidentiality. We operate under a deterministic <strong>Zero Data Retention (ZDR)</strong> standard: your prompts, completions, embeddings, and fine-tuning datasets are never stored, inspected, or used for model training.
          </p>
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 pt-2">
            <span>Last Updated: {lastUpdated}</span>
            <span>•</span>
            <span>GDPR &amp; CCPA Compliant</span>
          </div>
        </header>

        {/* 4 Pillars of Data Protection */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <EyeOff className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">API Zero Data Retention &amp; Chat Controls</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Developer API endpoints are 100% private under strict Zero Data Retention (ZDR). Web chat users can manage or opt out of &quot;Improve the model for everyone&quot; in settings with zero raw session database storage and automated in-flight PII redaction.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">Ephemeral RAM Processing</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              All token payloads exist only in volatile server memory during active TCP stream transmission and are immediately zeroized upon response completion.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">End-to-End TLS 1.3 Encryption</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              All traffic between your client, our Anycast edge proxy, and upstream model providers is encrypted using modern TLS 1.3 with Perfect Forward Secrecy (PFS).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">GDPR &amp; CCPA Sovereign Rights</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Full support for developer data deletion, account purging, Data Processing Addenda (DPA), and sovereign routing within US or EU geographic boundaries.
            </p>
          </div>
        </section>

        {/* Detailed Policy Breakdown */}
        <div className="space-y-10 text-zinc-300 text-sm leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 font-mono text-base">1.</span> Information We Collect
            </h2>
            <p>
              We collect only the minimum account data required to maintain your developer wallet and compute quota:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-xs text-zinc-400">
              <li><strong>Account Identification:</strong> Email address, hashed authentication credentials, and organization name.</li>
              <li><strong>Billing Data:</strong> Payment transaction metadata, invoice history, and token consumption aggregates (integer counts of prompt and completion tokens). We never store raw credit card numbers.</li>
              <li><strong>Operational Telemetry:</strong> Aggregated latency (p50/p90/p99), HTTP status codes, and error counts stripped of request payload bodies.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 font-mono text-base">2.</span> Zero Data Retention (ZDR) Execution
            </h2>
            <p>
              When a request is submitted to <code>https://galx.ai/v1/chat/completions</code>, our Anycast proxy verifies your API key hash, meters available credit, and proxies the payload directly to the upstream model provider via an encrypted pipe. 
            </p>
            <p>
              At no point in the pipeline are prompt text strings, document uploads, or generated responses written to disk, persistent databases, or non-volatile storage.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 font-mono text-base">3.</span> Your Data Privacy Rights (GDPR &amp; CCPA)
            </h2>
            <p>
              Depending on your jurisdiction, you have the right to request access to, correction of, or permanent erasure of your account metadata. You may export your billing data or terminate your account at any time from the account settings dashboard.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 font-mono text-base">4.</span> Data Protection Officer &amp; Security Inquiries
            </h2>
            <p>
              To execute a custom enterprise Data Processing Addendum (DPA) or submit a privacy compliance audit request, contact our Data Protection Officer at <a href="mailto:privacy@galx.ai" className="text-emerald-400 hover:underline">privacy@galx.ai</a>.
            </p>
          </section>
        </div>

        {/* CTA Strip */}
        <section className="p-8 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-cyan-950/40 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-bold text-white">Review Security Certifications &amp; SOC 2 Type II</h3>
            <p className="text-xs text-zinc-400">Explore our complete compliance catalog and cryptographic proof of zero PHI storage.</p>
          </div>
          <Link
            href="/compliance"
            className="px-5 py-2.5 rounded-xl bg-emerald-400 text-black font-bold text-xs font-mono flex items-center gap-2 hover:bg-emerald-300 transition-all shrink-0 cursor-pointer"
          >
            <span>View Compliance Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      </main>
    </div>
  );
}
