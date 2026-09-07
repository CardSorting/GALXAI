import type { ReactNode } from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
export default function DocsLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#090b10] text-zinc-100">
    <Navigation />
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12 lg:px-8">
      <aside className="min-w-0 lg:self-start lg:sticky lg:top-24"><p className="mb-3 px-3 text-xs font-medium uppercase tracking-widest text-zinc-500">Documentation</p><DocsSubNav /></aside>
      <main id="docs-content" className="min-w-0 w-full max-w-3xl">{children}</main>
    </div>
  </div>;
}
