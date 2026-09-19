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
  title: 'Terms of Service — GALX Images, Nova, and Developer access',
  description: 'Terms for creating in GALX Images, using GALX Nova, and subscribing to separate Developer API access.',
  canonicalPath: '/terms',
  keywords: [
    'Terms of Service',
    'GALX Images',
    'GALX Nova',
    'Developer API access',
    'Account billing terms',
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
            Terms of Service
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-3xl leading-relaxed">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to GALX Images, GALX Nova, and any separately approved Developer capabilities. Product pages and access materials describe the supported customer experience; implementation details are not part of the public product contract.
          </p>
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 pt-2">
            <span>Effective Date: {lastUpdated}</span>
            <span>•</span>
            <span>Version: 2026.1</span>
          </div>
        </header>

        <section className="rounded-2xl border border-indigo-400/20 bg-indigo-500/5 p-6 space-y-3" aria-labelledby="current-scope">
          <h2 id="current-scope" className="font-bold text-white text-base">Current product and pricing scope</h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            GALX Pro is the consumer Image Studio plan at $10 USD per month for one account. GALX Nova Developer Access is a separate $50/month recurring API access subscription.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Usage is billed separately from the access subscription, and no usage credits are included. Start through <Link href="/developers" className="text-cyan-300 hover:underline">Developer</Link> and review the supported capabilities and usage terms before building. Historical account-credit records and prior transactions remain subject to the terms presented when they were created.
          </p>
        </section>

        {/* Core Principles Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">Public creations</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Creations made in GALX Images are public by default and may appear in the community stream. Review the current product controls before creating anything that should not be shared.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">Managed intelligence</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              GALX Nova is the managed intelligence layer for reasoning and generation. Managed describes the service relationship; it does not promise unlimited capacity, guaranteed outputs, dedicated infrastructure, human review, enterprise support, or a proprietary foundation model.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">Reviewed access</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Private preview is a separate request path for supported Nova capabilities. Applying does not grant subscription access; Developer Access is granted by an active subscription and follows its published terms.
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
              GALX provides image creation through GALX Images and managed intelligence through GALX Nova. Developer API capabilities are available only through the approved access path and documented supported contract. By creating an account or using a supported capability, you agree to comply with applicable law and the published acceptable-use requirements.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-base">2.</span> Billing and access terms
            </h2>
            <p>
              GALX Pro is a consumer subscription at $10 USD per month for one account and follows the published Image Studio terms and fair-use boundaries. GALX Nova Developer Access is a separate $50 USD per month recurring subscription for API access. Usage is billed separately; no usage credits are included.
            </p>
            <p>
              Existing account-credit balances, refunds, and other payment records remain governed by the terms presented when those records were created. Developer Access is purchased through the Developer surface; an active subscription grants API admission and cancellation or expiration removes it according to the subscription lifecycle.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-base">3.</span> Cryptographic API Key Security
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of account credentials and any approved API keys. In the event of a suspected key compromise, revoke or rotate the key from the <Link href="/keys" className="text-cyan-400 hover:underline">API Keys Management Console</Link> and contact support if you need help.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-base">4.</span> Acceptable Use Policy
            </h2>
            <p>
              You agree not to use GALX services to generate unlawful content, abuse the service, bypass applicable safety controls, or attempt to obtain access to private implementation details or another account.
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
