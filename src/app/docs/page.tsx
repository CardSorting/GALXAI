import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { QuickstartDocs } from '@/components/dashboard/QuickstartDocs';
import {
  Code2,
  BookOpen,
  Layers,
  ShieldCheck,
  Zap,
  Radio,
  Terminal,
  Cpu,
  ArrowRight,
  Sparkles,
  Gauge,
  Lock,
  Flame,
  AlertTriangle
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Developer Documentation & SDK Integration Hub | GALXAI',
  description: 'Connect your Python, TypeScript, LangChain, LlamaIndex, Cursor IDE, or backend applications to the GALXAI Universal API Gateway.',
};

export default function DocsPage() {
  const docSections = [
    { title: '30-Second Quickstart', desc: 'Mint your API key and run your first completion in under 30 seconds.', href: '/docs/quickstart', icon: Zap, color: 'text-amber-400' },
    { title: 'Python & Node.js SDKs', desc: '1-line drop-in OpenAI client library integration examples.', href: '/docs/sdks', icon: Code2, color: 'text-cyan-400' },
    { title: 'Cursor & IDE Setup', desc: 'Configure Cursor, Windsurf, and Continue.dev with sub-second latency.', href: '/docs/ide-setup', icon: Terminal, color: 'text-emerald-400' },
    { title: 'SSE Streaming Guide', desc: 'Low-latency token streaming with sub-15ms Time-To-First-Token.', href: '/docs/streaming', icon: Radio, color: 'text-indigo-400' },
    { title: 'REST API & OpenAPI Reference', desc: 'Complete OpenAPI reference for chat, models, image, and management routes.', href: '/docs/api-reference', icon: Cpu, color: 'text-rose-400' },
    { title: 'Model Capability Guide', desc: 'Benchmark comparison across all 12 supported frontier models.', href: '/docs/models-guide', icon: Flame, color: 'text-amber-300' },
    { title: '75% Prompt Caching', desc: 'Prefix caching mechanics that cut inference costs by 75% automatically.', href: '/docs/prompt-caching', icon: Sparkles, color: 'text-emerald-400' },
    { title: 'Errors & Retry Backoff', desc: 'HTTP status codes, exponential backoff with jitter, and sub-15ms failover.', href: '/docs/error-handling', icon: AlertTriangle, color: 'text-orange-400' },
    { title: 'Router Architecture', desc: 'Continuous token-bucket calculus, AAD isolation, and circuit breakers.', href: '/docs/architecture', icon: Layers, color: 'text-indigo-400' },
    { title: 'Security & Zero-Retention', desc: 'AES-256-GCM vaulting, ephemeral RAM transit, and memory zeroization.', href: '/docs/security-spec', icon: Lock, color: 'text-cyan-400' },
    { title: 'Rate Limits & Quotas', desc: 'Continuous fractional token calculus and concurrency governor guide.', href: '/docs/rate-limits', icon: Gauge, color: 'text-amber-400' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'Developer Documentation' }]} />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-3 relative overflow-hidden border border-white/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
            <Code2 className="w-3.5 h-3.5" />
            <span>DEVELOPER DOCUMENTATION HUB</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Universal SDK & API Documentation</h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed font-sans">
            GALXAI exposes a standard OpenAI-compatible API surface at <code className="text-cyan-300 font-mono">https://api.galxai.com/v1</code>. Drop it in as a 1-line base URL replacement for any existing application.
          </p>
        </div>

        <DocsSubNav />

        {/* Documentation Sub-sections Grid */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-white">Explore Documentation Guides</h2>
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
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
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
