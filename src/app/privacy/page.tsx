import React from 'react';
import type { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createBreadcrumbSchema } from '@/lib/seo/jsonld';
import { Shield, Lock, EyeOff, Server, CheckCircle2, ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'Privacy Policy — GALX',
  description: 'How GALX handles account, product, usage, and support information.',
  canonicalPath: '/privacy',
  keywords: [
    'Privacy Policy',
    'Privacy Policy',
    'GDPR Compliance',
    'CCPA Data Rights',
    'Account privacy',
    'Product data controls',
  ],
});

export default function PrivacyPolicyPage() {
  const lastUpdated = 'January 1, 2026';

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Privacy Policy', href: '/privacy' },
  ];

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex flex-col font-sans selection:bg-cyan-500/30 selection:text-white">
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
            <span>PRIVACY &amp; DATA CONTROLS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-3xl leading-relaxed">
            This policy explains the information GALX collects, why it is used, and the choices available to you. Product-specific notices and access terms apply where they provide more detail.
          </p>
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 pt-2">
            <span>Last Updated: {lastUpdated}</span>
            <span>•</span>
            <span>Privacy rights available</span>
          </div>
        </header>

        {/* 4 Pillars of Data Protection */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <EyeOff className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">Product data controls</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              GALX uses product and account controls to manage information submitted through supported experiences. Review the controls shown in the product before sharing sensitive material.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">Limited collection</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              GALX aims to collect only the information needed to provide products, secure accounts, measure usage, process payments, and respond to support requests.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">Security safeguards</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              GALX maintains administrative, technical, and organizational safeguards appropriate to the information it handles.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">Privacy rights</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Depending on where you live, you may have rights to access, correct, delete, or restrict use of personal information. Contact GALX to exercise those rights.
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
              We collect information needed to operate GALX products and support users, which may include:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-xs text-zinc-400">
              <li><strong>Account Identification:</strong> Email address, hashed authentication credentials, and organization name.</li>
              <li><strong>Product and usage data:</strong> Information about features used, usage totals, preferences, and product interactions.</li>
              <li><strong>Payment and support data:</strong> Transaction metadata, invoices, communications, and support requests. Payment card details are handled by payment providers.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 font-mono text-base">2.</span> How information is used
            </h2>
            <p>
              GALX uses information to provide and improve supported products, authenticate accounts, prevent abuse, measure usage, process payments, communicate with users, and meet legal obligations.
            </p>
            <p>
              Retention depends on the type of information and the reason it was collected. GALX retains information only as long as reasonably necessary for those purposes and applicable legal requirements.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 font-mono text-base">3.</span> Your Data Privacy Rights (GDPR &amp; CCPA)
            </h2>
            <p>
              Depending on your jurisdiction, you have the right to request access to, correction of, or permanent erasure of your account metadata. You may export your billing data or request account termination through our support channels.
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
            <h3 className="text-base sm:text-lg font-bold text-white">Questions about privacy?</h3>
            <p className="text-xs text-zinc-400">Contact GALX if you have a privacy question or want to exercise an available privacy right.</p>
          </div>
          <a
            href="mailto:privacy@galx.ai"
            className="px-5 py-2.5 rounded-xl bg-emerald-400 text-black font-bold text-xs font-mono flex items-center gap-2 hover:bg-emerald-300 transition-all shrink-0 cursor-pointer"
          >
            <span>Contact privacy</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </section>
      </main>
    </div>
  );
}
