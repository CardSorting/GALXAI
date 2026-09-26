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
  title: 'Terms of Service — GALX Images and Nova',
  description: 'Terms for creating in GALX Images and using GALX Nova-powered experiences.',
  canonicalPath: '/terms',
  keywords: [
    'Terms of Service',
    'GALX Images',
    'GALX Nova',
    'Private integrations',
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
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col font-sans">
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
            Orbit is $10 USD per Star per month for designated patron-only digital work and support of that Star’s practice. Foundry is $200 USD per month for bounded private creation, with its allowance and per-image unit costs shown before purchase. These are independent subscriptions; neither includes Sites. New subscriptions are not available yet, and new Sites subscription sales are closed.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Private integrations may be authorized directly for a bounded use case and remain subject to assigned terms. Historical account-credit records and prior transactions remain subject to the terms presented when they were created.
          </p>
        </section>

        {/* Core Principles Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">Private human creations</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Human-generated and remixed Works are private by design and cannot be published into Explore, public feeds, Star archives, or Series. Public Works are published by authorized GALX-operated Stars.
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
              Private access is administered directly for explicitly authorized integrations. Public accounts do not receive credentials or a self-service enrollment path.
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
              GALX provides image creation through GALX Images and managed intelligence through GALX Nova. Selected private integrations may receive explicitly authorized capabilities under assigned terms. By creating an account or using a supported capability, you agree to comply with applicable law and the published acceptable-use requirements.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-base">2.</span> Billing and access terms
            </h2>
            <p>
              Orbit applies to one specific Star and grants no generation, commissions, creative control, or public publishing authority. Foundry provides private creation separately and requires sufficient remaining allowance. Human-generated Works remain private and cannot be published to the public GALX network. Private integration terms, when applicable, are established directly with the authorized cohort.
            </p>
            <p>
              Existing account-credit balances, refunds, and other payment records remain governed by the terms presented when those records were created. Private access may be changed or revoked by GALX and does not create a public promise of availability.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-base">3.</span> Cryptographic API Key Security
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of account credentials and any approved private integration credentials. In the event of a suspected compromise, contact the authorized GALX administrator or support so the credential can be revoked or rotated.
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
            <h3 className="text-base sm:text-lg font-bold text-white">Review our privacy policy</h3>
            <p className="text-xs text-zinc-400">Learn how GALX handles account, product, usage, and support information.</p>
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
