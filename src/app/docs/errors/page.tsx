import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Terminal, Bug, CheckCircle2 } from 'lucide-react';
import { ERROR_TROUBLESHOOT_DATA } from '@/lib/data/errorsData';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createTopicHubGraph } from '@/lib/seo/jsonld';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

export const metadata: Metadata = constructMetadata({
  title: 'AI Gateway Error Codes & Resolution Runbooks',
  description:
    'Developer resolution runbooks and troubleshooting guides for HTTP 429 Rate Limit Exceeded, 500 Gateway Errors, 503 Provider Outages, 401 Authentication, and context overflow errors on GALXAI.',
  canonicalPath: '/docs/errors',
  keywords: [
    'AI API Error Codes',
    'HTTP 429 Rate Limit Fix',
    'OpenAI 500 Internal Error',
    'AI Gateway Troubleshooting',
    'Context Window Exceeded',
    'LLM Error Handling',
  ],
});

export default function ErrorCodesHubPage() {
  const hubSchema = createTopicHubGraph({
    canonicalPath: '/docs/errors',
    title: 'GALXAI AI Gateway Error Codes & Resolution Runbooks',
    description:
      'Comprehensive error code reference, causes, and step-by-step resolution runbooks for AI API integrations.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Docs', url: '/docs' },
      { name: 'Errors', url: '/docs/errors' },
    ],
    items: ERROR_TROUBLESHOOT_DATA.map((e) => ({
      name: `HTTP ${e.httpStatus}: ${e.title}`,
      description: e.description,
      url: `/docs/errors/${e.code}`,
    })),
  });

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex flex-col font-sans selection:bg-cyan-500/30">
      <JsonLd data={hubSchema} />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Docs', href: '/docs' },
            { label: 'Error Codes', href: '/docs/errors' },
          ]}
        />

        <header className="mb-10 max-w-3xl space-y-4">
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
            Error resolution
          </h1>
          <p className="text-base leading-7 text-zinc-400">
            Diagnose API status errors, timeouts, and invalid requests.
          </p>
        </header>

        {/* Errors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ERROR_TROUBLESHOOT_DATA.map((err) => (
            <Link
              key={err.code}
              href={`/docs/errors/${err.code}`}
              className="group relative rounded-2xl border border-white/10 bg-[#0d111a]/80 hover:bg-[#121724]/90 p-6 flex flex-col justify-between transition-all hover:border-rose-500/40 hover:shadow-xl hover:shadow-rose-500/5 cursor-pointer backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20">
                    HTTP {err.httpStatus}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10">
                    {err.code}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-rose-300 transition-colors mb-2">
                  {err.title}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-6">
                  {err.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">{err.errorType}</span>
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
