import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { QuickstartDocs } from '@/components/dashboard/QuickstartDocs';
import { Code2, BookOpen, Layers, ShieldCheck, Zap, Radio, Terminal, Cpu, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'SDK Integration & Developer Documentation Hub',
  description: 'Connect your Python, TypeScript, LangChain, LlamaIndex, or Cursor applications to the GALXAI Universal API Gateway.',
};

export default function DocsPage() {
  const docSections = [
    { title: '2-Minute Quickstart', desc: 'Connect an account and run your first completion in under 2 minutes.', href: '/docs/quickstart', icon: Zap, color: 'text-amber-400' },
    { title: 'Architecture & Rate Governor', desc: 'Continuous fractional token calculus, AAD security, and 4-state circuit breaker.', href: '/docs/architecture', icon: Layers, color: 'text-indigo-400' },
    { title: 'SDKs (Python & Node.js)', desc: 'Drop-in standard OpenAI client library integration examples.', href: '/docs/sdks', icon: Code2, color: 'text-cyan-400' },
    { title: 'Cursor & IDE Setup', desc: 'Configure Cursor, Cline, and Roo-Code to route coding through your pool.', href: '/docs/ide-setup', icon: Terminal, color: 'text-emerald-400' },
    { title: 'REST API & SSE Reference', desc: 'Complete OpenAPI reference for chat, models, image, and management routes.', href: '/docs/api-reference', icon: Cpu, color: 'text-rose-400' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'Developer SDK & Documentation' }]} />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-3 relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <Code2 className="w-3.5 h-3.5" />
            <span>DEVELOPER DOCUMENTATION HUB</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Universal SDK & API Documentation</h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            GALXAI exposes a standard OpenAI-compatible API surface at <code className="text-cyan-300 font-mono">http://localhost:3000/v1</code>. Drop it in as a 1-line base URL replacement for any existing application.
          </p>
        </div>

        {/* Documentation Sub-sections Grid */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-white">Explore Documentation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docSections.map((sec) => {
              const Icon = sec.icon;
              return (
                <Link
                  key={sec.href}
                  href={sec.href}
                  className="glass-card rounded-3xl p-6 border border-white/5 space-y-3 flex flex-col justify-between group hover:border-indigo-500/40 transition-all"
                >
                  <div className="space-y-2">
                    <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${sec.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {sec.title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {sec.desc}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-indigo-400 font-semibold pt-2">
                    <span>Read guide</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Quickstart Interactive Snippets */}
        <QuickstartDocs />
      </main>
    </div>
  );
}
