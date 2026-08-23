'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Cpu,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Zap,
  Flame,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import type { ProviderPortalItem } from '@/lib/data/providersData';
import { PROVIDERS_DATA } from '@/lib/data/providersData';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface ProviderPortalClientProps {
  provider: ProviderPortalItem;
}

export function ProviderPortalClient({ provider }: ProviderPortalClientProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleCopyCode = async () => {
    const ok = await safeCopyToClipboard(provider.quickstartSnippet.code);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const siblingProviders = PROVIDERS_DATA.filter((p) => p.slug !== provider.slug);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        <Breadcrumbs
          items={[
            { label: 'Models', href: '/models' },
            { label: `${provider.providerName} Gateway` },
          ]}
        />

        {/* Hero Section with AEO Inverted Pyramid Lead */}
        <section id="provider-hero" className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-cyan-500/20 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <Cpu className="w-3.5 h-3.5" />
              <span>{provider.badge} • UP TO {provider.discountPct}% OFF</span>
            </div>
            <ShareButton
              variant="pill"
              label="Share Provider Portal"
              title={provider.title}
              description={provider.description}
            />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            {provider.headline}
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl font-sans">
            {provider.description}
          </p>

          <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-xs leading-relaxed font-sans font-medium">
            <strong>Fleet Scope:</strong> {provider.fleetSummary}
          </div>
        </section>

        {/* Model Fleet Comparison Matrix */}
        <section id="model-fleet" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-4">
            <span className="text-[10px] font-mono uppercase font-bold text-amber-400">
              Verified Production Endpoints
            </span>
            <h2 className="text-xl font-black text-white font-mono">
              {provider.providerName} Model Fleet &amp; Wholesale Rates
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4 font-sans">Model Engine</th>
                  <th className="py-3 px-4 font-sans">Primary Specialization</th>
                  <th className="py-3 px-4 font-sans text-cyan-300">Context Window</th>
                  <th className="py-3 px-4 font-sans text-emerald-300">Input / 1M</th>
                  <th className="py-3 px-4 font-sans text-amber-300">Output / 1M</th>
                  <th className="py-3 px-4 font-sans">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {provider.featuredModels.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-sans font-bold text-white">
                      <div>{m.name}</div>
                      <span className="text-[10px] text-zinc-500 font-mono">{m.id}</span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300 font-sans">{m.role}</td>
                    <td className="py-3.5 px-4 text-cyan-300 font-bold">{m.context}</td>
                    <td className="py-3.5 px-4 text-emerald-300 font-bold">
                      {m.inputPrice}{' '}
                      <span className="text-[10px] text-emerald-400 font-normal">({m.discount})</span>
                    </td>
                    <td className="py-3.5 px-4 text-amber-300 font-bold">{m.outputPrice}</td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/models/${m.id.replace('/', '-')}`}
                        className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-sans text-xs font-semibold inline-flex items-center gap-1 transition-all"
                      >
                        <span>Profile</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 1-Line Drop-in Client Recipe */}
        <section id="quickstart" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                1-Line Drop-in Quickstart
              </span>
              <h2 className="text-lg font-bold text-white font-mono">
                Connect {provider.providerName} SDK in 30 Seconds
              </h2>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
            {provider.quickstartSnippet.code}
          </pre>
        </section>

        {/* Key Advantages Checklist */}
        <section id="advantages" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>GALXAI Gateway Advantages for {provider.providerName} Models</span>
            </h2>
            <p className="text-xs text-zinc-400">High-concurrency infrastructure guarantees.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 font-sans text-xs">
            {provider.keyAdvantages.map((adv, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-zinc-200 leading-relaxed">{adv}</span>
              </div>
            ))}
          </div>
        </section>

        {/* AEO Frequently Asked Questions */}
        <section id="provider-faqs" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Frequently Asked Questions ({provider.providerName} Fleet)</span>
            </h2>
            <p className="text-xs text-zinc-400">Model authenticity, prompt caching pass-through, and billing terms.</p>
          </div>

          <div className="space-y-3 pt-2">
            {provider.faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="font-bold text-white text-sm font-sans">{faq.q}</span>
                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-zinc-400">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-zinc-300 leading-relaxed border-t border-white/5 font-sans">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Sibling Provider Portals */}
        <section id="other-providers" className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="space-y-1 border-b border-white/10 pb-3">
            <h2 className="text-base font-bold text-white font-mono">
              Explore More AI Model Providers
            </h2>
            <p className="text-xs text-zinc-400">Compare wholesale gateways across major AI research labs.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {siblingProviders.map((sp) => (
              <Link
                key={sp.slug}
                href={`/providers/${sp.slug}`}
                className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-cyan-500/40 transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300 font-mono">
                    {sp.providerName} Gateway
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">
                  {sp.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />
      </main>

      {/* Floating Conversion Dock */}
      <FloatingConversionDock />
    </div>
  );
}
