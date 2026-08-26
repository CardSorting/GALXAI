import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert, ArrowRight, ShieldCheck, Bug, Terminal, CheckCircle2 } from 'lucide-react';
import { SECURITY_PATTERNS_DATA } from '@/lib/data/securityPatternsData';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTopicHubGraph } from '@/lib/seo/jsonld';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

export const metadata: Metadata = constructMetadata({
  title: 'OWASP LLM Security Patterns & Red-Teaming Defense Runbooks',
  description:
    'Production security defense runbooks and code patterns for the OWASP Top 10 for LLMs: Prompt Injection, Jailbreaking, Data Exfiltration, SSRF, and PII Masking on GALXAI.',
  canonicalPath: '/security/patterns',
  keywords: [
    'OWASP LLM Top 10',
    'Prompt Injection Defense',
    'AI Jailbreak Mitigation',
    'LLM Data Exfiltration Prevention',
    'AI Agent Security Patterns',
    'PII Masking LLM',
    'AI Red Teaming Runbooks',
  ],
});

export default function SecurityPatternsHubPage() {
  const hubSchema = createTopicHubGraph({
    canonicalPath: '/security/patterns',
    title: 'GALXAI OWASP LLM Security Patterns & Red-Teaming Defense Runbooks',
    description:
      'Production hardening patterns and defense architectures for securing AI agents and LLM applications against adversarial vulnerabilities.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Security', url: '/security' },
      { name: 'Security Patterns', url: '/security/patterns' },
    ],
    items: SECURITY_PATTERNS_DATA.map((p) => ({
      name: p.headline,
      description: p.description,
      url: `/security/patterns/${p.slug}`,
    })),
  });

  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <JsonLd data={hubSchema} />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Security', href: '/security' },
            { label: 'Security Patterns', href: '/security/patterns' },
          ]}
        />

        {/* Header & Hero */}
        <header className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold tracking-wide">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>OWASP TOP 10 LLM DEFENSE RUNBOOKS</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            AI Security <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">Defense Patterns</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Production-tested defensive architectures, delimiter isolation mechanisms, and mitigation code snippets addressing the most critical vulnerabilities in autonomous AI agents.
          </p>
        </header>

        {/* Patterns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SECURITY_PATTERNS_DATA.map((pattern) => (
            <Link
              key={pattern.slug}
              href={`/security/patterns/${pattern.slug}`}
              className="group relative rounded-2xl border border-white/10 bg-[#0d111a]/80 hover:bg-[#121724]/90 p-6 flex flex-col justify-between transition-all hover:border-rose-500/40 hover:shadow-xl hover:shadow-rose-500/5 cursor-pointer backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-rose-300">
                    {pattern.owaspLlmMapping}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                    {pattern.badge}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-rose-300 transition-colors mb-2">
                  {pattern.title}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-6">
                  {pattern.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500 truncate max-w-[180px]">{pattern.defenseMechanisms[0] || 'Active Defense'}</span>
                <div className="flex items-center gap-1 text-rose-400 group-hover:translate-x-1 transition-transform">
                  <span>View Runbook</span>
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
