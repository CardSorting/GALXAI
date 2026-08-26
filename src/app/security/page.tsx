import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Lock, FileCheck, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { SECURITY_SPECIFICATIONS_DATA } from '@/lib/data/securityData';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTopicHubGraph } from '@/lib/seo/jsonld';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

export const metadata: Metadata = constructMetadata({
  title: 'Enterprise AI Security & Regulatory Governance',
  description:
    'Explore enterprise security specifications, regulatory compliance, and cryptographic audit standards on GALXAI: SOC 2 Type II, ISO 27001, HIPAA BAA, PCI DSS, and EU AI Act.',
  canonicalPath: '/security',
  keywords: [
    'Enterprise AI Security',
    'SOC 2 AI Gateway',
    'HIPAA BAA AI API',
    'EU AI Act Compliance',
    'Zero Data Retention AI',
    'PCI DSS Token Gateway',
    'FedRAMP AI Readiness',
  ],
});

export default function SecurityHubPage() {
  const hubSchema = createTopicHubGraph({
    canonicalPath: '/security',
    title: 'GALXAI Enterprise AI Security & Regulatory Governance',
    description:
      'Enterprise security specifications, regulatory audit attestations, and compliance certifications for AI model routing.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Security', url: '/security' },
    ],
    items: SECURITY_SPECIFICATIONS_DATA.map((s) => ({
      name: s.headline,
      description: s.description,
      url: `/security/${s.slug}`,
    })),
  });

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <JsonLd data={hubSchema} />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Security', href: '/security' }]} />

        {/* Header & Hero */}
        <header className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold tracking-wide">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ZERO-TRUST SECURITY ARCHITECTURE</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Enterprise Security &amp; <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">Compliance</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Comprehensive compliance specifications, third-party attestations, and cryptographic enforcement mechanisms ensuring zero customer data retention and verifiable security.
          </p>

          {/* Quick Link to Security Patterns */}
          <div className="pt-2">
            <Link
              href="/security/patterns"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono transition-all"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Looking for OWASP AI Defense Runbooks? View Security Patterns</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Security Specs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SECURITY_SPECIFICATIONS_DATA.map((spec) => (
            <Link
              key={spec.slug}
              href={`/security/${spec.slug}`}
              className="group relative rounded-2xl border border-white/10 bg-[#0d111a]/80 hover:bg-[#121724]/90 p-6 flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 cursor-pointer backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-emerald-300">
                    {spec.badge}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                    {spec.auditFrequency}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors mb-2">
                  {spec.headline}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-6">
                  {spec.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500 truncate max-w-[180px]">{spec.enforcementMechanism}</span>
                <div className="flex items-center gap-1 text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <span>Read Spec</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
