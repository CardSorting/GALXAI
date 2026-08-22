'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap,
  Code2,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck,
  Radio,
  Sparkles,
  BookOpen,
  Gauge,
  Lock,
  AlertTriangle,
  Flame
} from 'lucide-react';

interface DocsNavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  exact?: boolean;
}

interface DocsNavGroup {
  id: 'start' | 'api' | 'security';
  title: string;
  items: DocsNavItem[];
}

const DOCS_NAV_GROUPS: DocsNavGroup[] = [
  {
    id: 'start',
    title: 'Getting Started',
    items: [
      { name: 'Docs Overview', href: '/docs', icon: BookOpen, exact: true },
      { name: '30s Quickstart', href: '/docs/quickstart', icon: Zap, badge: '2 min' },
      { name: 'Python & Node SDKs', href: '/docs/sdks', icon: Code2 },
      { name: 'IDE & Cursor Setup', href: '/docs/ide-setup', icon: Terminal, badge: 'IDE' },
      { name: 'SSE Streaming', href: '/docs/streaming', icon: Radio }
    ]
  },
  {
    id: 'api',
    title: 'API & Model Reference',
    items: [
      { name: 'REST API Reference', href: '/docs/api-reference', icon: Cpu, badge: 'OpenAPI' },
      { name: 'Model Capabilities', href: '/docs/models-guide', icon: Flame },
      { name: '75% Prompt Caching', href: '/docs/prompt-caching', icon: Sparkles, badge: '-75%' },
      { name: 'Errors & Retry Backoff', href: '/docs/error-handling', icon: AlertTriangle }
    ]
  },
  {
    id: 'security',
    title: 'Architecture & Trust',
    items: [
      { name: 'Router Architecture', href: '/docs/architecture', icon: Layers },
      { name: 'Security & Zero-Retention', href: '/docs/security-spec', icon: Lock, badge: 'TLS 1.3' },
      { name: 'Rate Limits & Concurrency', href: '/docs/rate-limits', icon: Gauge }
    ]
  }
];

export function DocsSubNav() {
  const pathname = usePathname();

  // Find active group
  const activeGroup = DOCS_NAV_GROUPS.find(group =>
    group.items.some(item => (item.exact ? pathname === item.href : pathname.startsWith(item.href)))
  ) || DOCS_NAV_GROUPS[0];

  return (
    <div className="space-y-3 font-mono">
      {/* Category Pillars (Top Bar) */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          {DOCS_NAV_GROUPS.map((group) => {
            const isGroupActive = group.id === activeGroup.id;
            const defaultHref = group.items[0].href;

            return (
              <Link
                key={group.id}
                href={defaultHref}
                className={`px-3.5 py-1.5 rounded-xl text-xs uppercase tracking-wider font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isGroupActive
                    ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                <span>{group.title}</span>
                {isGroupActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] text-zinc-500 font-sans">
          <span>Drop-in OpenAI SDK Replacement</span>
        </div>
      </div>

      {/* Active Category Sub-Navigation Pills */}
      <div className="flex items-center gap-1.5 sm:gap-2 p-1 rounded-2xl bg-black/40 border border-white/5 overflow-x-auto text-xs">
        {activeGroup.items.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-zinc-400'}`} />
              <span>{tab.name}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive
                      ? 'bg-black/20 text-black'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
