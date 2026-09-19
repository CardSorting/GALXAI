import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Code2, Cpu, Images, Sparkles } from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd, createBreadcrumbSchema } from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';

export const metadata: Metadata = constructMetadata({
  title: 'About GALX — Managed intelligence for creation',
  description: 'GALX is where people create. GALX Nova is our managed intelligence layer for reasoning and generation, with a separate Developer path for API access.',
  canonicalPath: '/about',
  keywords: ['About GALX', 'GALX Nova', 'managed intelligence', 'AI image creation', 'Developer API access'],
});

const hierarchy = [
  {
    icon: Images,
    name: 'GALX',
    description: 'The platform people visit and create in.',
  },
  {
    icon: Cpu,
    name: 'GALX Nova',
    description: 'Our managed intelligence service for reasoning and generation.',
  },
  {
    icon: Code2,
    name: 'Developer',
    description: 'The separate route to API information and access.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#07090e] text-foreground flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <JsonLd
        data={createBreadcrumbSchema([
          { name: 'Home', url: SITE_CONFIG.url },
          { name: 'About', url: `${SITE_CONFIG.url}/about` },
        ])}
      />
      <Navigation />

      <main id="main-content" className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 w-full space-y-16">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About', href: '/about' }]} />

        <header className="space-y-5 border-b border-white/10 pb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>GALX</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Create first.<br />Intelligence, handled.
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 max-w-3xl leading-relaxed">
            GALX is where people create. Bring an idea, make an image, and explore what others are making. Behind the experience is GALX Nova, our managed intelligence layer for reasoning and generation.
          </p>
        </header>

        <section className="space-y-6" aria-labelledby="definition-heading">
          <div className="space-y-2">
            <h2 id="definition-heading" className="text-2xl sm:text-3xl font-black text-white tracking-tight">A simple relationship</h2>
            <p className="text-sm text-zinc-400 max-w-2xl">Managed intelligence is AI capability delivered through a GALX-managed service—for people creating in GALX and developers building with its API.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {hierarchy.map(({ icon: Icon, name, description }) => (
              <div key={name} className="p-6 rounded-3xl bg-zinc-900/40 border border-white/10 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-white">{name}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6" aria-label="GALX and Nova definitions">
          <div className="p-7 rounded-3xl bg-zinc-900/40 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">What is GALX?</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">GALX lets people create AI images. The intelligence service behind it is called Nova, and developers can subscribe for API access.</p>
          </div>
          <div className="p-7 rounded-3xl bg-zinc-900/40 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">What is Nova?</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">GALX Nova is our managed intelligence layer for reasoning and generation.</p>
            <p className="text-sm text-zinc-400 leading-relaxed">You bring the task. GALX operates the service behind it.</p>
          </div>
        </section>

        <section className="p-8 rounded-3xl bg-zinc-900/30 border border-white/10 space-y-4" aria-labelledby="managed-heading">
          <h2 id="managed-heading" className="text-xl font-bold text-white">What “managed” means</h2>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl">Managed means GALX operates the service through which you access the supported capability. It does not automatically mean unlimited capacity, guaranteed outputs, dedicated infrastructure, human-reviewed responses, enterprise support, or a proprietary foundation model.</p>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl">We explain supported capabilities and integration requirements. Operational implementation details stay internal.</p>
        </section>

        <section className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-indigo-950/40 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-lg sm:text-xl font-bold text-white">Bring an idea, not an infrastructure plan.</h2>
            <p className="text-sm text-zinc-400">Create in GALX, or build with supported capabilities through Developer.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/images" className="px-5 py-3 rounded-2xl bg-cyan-400 text-black font-bold text-xs flex items-center gap-2 hover:bg-cyan-300 transition-all">
              <span>Create an image</span><ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link href="/developers" className="px-5 py-3 rounded-2xl border border-white/15 text-white font-bold text-xs hover:bg-white/5 transition-all">
              Explore Developer
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
