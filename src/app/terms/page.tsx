import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createBreadcrumbSchema } from '@/lib/seo/jsonld';
import { Shield, FileText, Lock, Scale, Zap, ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'Terms of Service — Enterprise AI Gateway & SLA',
  description: 'GALXAI Terms of Service, API Master Service Agreement, 99.99% SLA guarantees, wholesale pricing terms, and Zero Data Retention obligations.',
  canonicalPath: '/terms',
  keywords: [
    'Terms of Service',
    'Master Service Agreement',
    'AI Gateway SLA',
    'Zero Data Retention Agreement',
    'Enterprise API Terms',
    'Wholesale Token Billing',
  ],
});

export default function TermsOfServicePage() {
  const lastUpdated = 'January 1, 2026';

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Terms of Service', href: '/terms' },
  ];

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <JsonLd
        data={createBreadcrumbSchema([
          { name: 'Home', url: SITE_CONFIG.url },
          { name: 'Terms of Service', url: `${SITE_CONFIG.url}/terms` },
        ])}
      />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 w-full space-y-12">
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero Header */}
        <header className="space-y-4 border-b border-white/10 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold">
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
            <span>LEGAL &amp; COMPLIANCE FRAMEWORK</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Terms of Service &amp; SLA
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-3xl leading-relaxed">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of GALXAI&rsquo;s universal AI inference routing gateway, API endpoints, developer console, and wholesale compute infrastructure.
          </p>
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 pt-2">
            <span>Effective Date: {lastUpdated}</span>
            <span>•</span>
            <span>Version: 2026.1</span>
          </div>
        </header>

        {/* Core Principles Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">Zero Data Retention (ZDR)</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We never store, log, inspect, or train on your customer prompts, responses, or vector embeddings. All memory is zeroed out immediately after HTTP stream closure.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">99.99% High-Availability SLA</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Enterprise workloads benefit from our multi-region distributed active-active failover. If a backend cluster experiences an outage, requests reroute in under 50ms.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">SOC 2 &amp; HIPAA Compliant</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Fully compliant with SOC 2 Type II, ISO 27001, and HIPAA Business Associate Agreements (BAA) for healthcare, fintech, and sovereign enterprise deployments.
            </p>
          </div>
        </section>

        {/* Detailed Sections */}
        <div className="space-y-10 text-zinc-300 text-sm leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-base">1.</span> Provision of Services
            </h2>
            <p>
              GALXAI provides high-performance, low-latency proxy routing for OpenAI-compatible LLM inference. By creating an account or querying the API at <code>https://galx.ai/v1</code>, you agree to comply with all applicable local, national, and international laws, as well as the safety policies of upstream model providers.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-base">2.</span> Wholesale Token Billing &amp; 75% Prompt Caching
            </h2>
            <p>
              Token usage is metered per individual request based on exact input, output, and cached token counts returned by upstream GPU clusters. Prompt caching rebates (up to 75% off standard input token rates) are automatically applied to matching prefix prompts exceeding 1,024 tokens.
            </p>
            <p>
              Prepaid developer wallet balances never expire. Refunds for unspent credit balances can be requested via our support portal within 30 days of purchase.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-base">3.</span> Cryptographic API Key Security
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your API keys. GALXAI stores only salted cryptographic hashes of your keys. In the event of a suspected key compromise, you can instantly revoke and rotate keys from the <Link href="/keys" className="text-cyan-400 hover:underline">API Keys Management Console</Link>.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-base">4.</span> Acceptable Use Policy
            </h2>
            <p>
              You agree not to use GALXAI services to generate unlawful content, launch denial-of-service attacks, bypass upstream model safety guardrails via automated adversarial attacks, or reverse-engineer upstream frontier model weights.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-base">5.</span> Contact &amp; Legal Notices
            </h2>
            <p>
              For legal inquiries, DPA execution, or enterprise custom contracts, please contact our legal counsel at <a href="mailto:legal@galx.ai" className="text-cyan-400 hover:underline">legal@galx.ai</a>.
            </p>
          </section>
        </div>

        {/* CTA Strip */}
        <section className="p-8 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-indigo-950/40 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-bold text-white">Review our Zero Data Retention Privacy Architecture</h3>
            <p className="text-xs text-zinc-400">Learn how ephemeral memory zeroization protects enterprise confidentiality.</p>
          </div>
          <Link
            href="/privacy"
            className="px-5 py-2.5 rounded-xl bg-cyan-400 text-black font-bold text-xs font-mono flex items-center gap-2 hover:bg-cyan-300 transition-all shrink-0 cursor-pointer"
          >
            <span>Read Privacy Policy</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      </main>
    </div>
  );
}
