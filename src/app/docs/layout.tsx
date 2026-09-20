import type { ReactNode } from 'react';
import Link from 'next/link';
import { Terminal, Activity, ShieldCheck, Download } from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07080d] text-zinc-100 selection:bg-indigo-500/30 selection:text-white">
      <Navigation />

      {/* Main Docs Shell */}
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6 lg:px-8">
        <div className="flex gap-8 lg:gap-12">
          {/* Left Navigation Sidebar */}
          <aside className="hidden w-56 shrink-0 lg:block lg:self-start lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 custom-scrollbar">
            <DocsSubNav />
          </aside>

          {/* Center Documentation Content */}
          <main id="docs-content" className="min-w-0 flex-1 max-w-3xl xl:max-w-4xl">
            {children}
          </main>

          {/* Right Rail (Quick Documentation Actions on Wide Screens) */}
          <aside className="hidden w-56 shrink-0 xl:block xl:self-start xl:sticky xl:top-24 space-y-6">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                Documentation utilities
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link
                    href="/docs"
                    className="flex items-center gap-2 text-zinc-300 transition-colors hover:text-indigo-300"
                  >
                    <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Supported capabilities</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/status"
                    className="flex items-center gap-2 text-zinc-300 transition-colors hover:text-indigo-300"
                  >
                    <Activity className="h-3.5 w-3.5 text-amber-400" />
                    <span>Service status</span>
                  </Link>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 mb-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Credential guidance</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-400">
                Keep API keys server-side and review the current access and data terms before integrating.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-4 shadow-sm">
              <p className="text-xs font-semibold text-indigo-200 mb-1">
                Agent Setup Brief
              </p>
              <p className="text-[11px] text-zinc-400 mb-3">
                Pre-formatted for Cursor, Claude Code, and Windsurf.
              </p>
              <a
                href="/docs/agent-setup?download=1"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-500/20 px-2.5 py-1.5 text-xs font-medium text-indigo-100 transition-colors hover:bg-indigo-500/30"
              >
                <Download className="h-3.5 w-3.5" />
                Download Brief (.md)
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
