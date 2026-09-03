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
  Shield,
  ShieldCheck,
  Radio,
  Sparkles,
  BookOpen,
  Gauge,
  Lock,
  AlertTriangle,
  Flame,
  FileCode2,
  ArrowLeftRight,
  BookMarked,
  Wrench,
  Database,
  Bot,
  Smile
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';

interface DocsNavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  exact?: boolean;
}

const ALL_DOCS_ITEMS: DocsNavItem[] = [
  { name: 'Agents Hub', href: '/docs/agents', icon: Bot, badge: 'Agents' },
  { name: 'Plain English', href: '/docs/simple', icon: Smile, badge: 'Simple' },
  { name: 'Overview', href: '/docs', icon: BookOpen, exact: true },
  { name: '30s Quickstart', href: '/docs/quickstart', icon: Zap, badge: '30s' },
  { name: '1-Click Migration', href: '/docs/migration', icon: ArrowLeftRight, badge: '0-Code' },
  { name: 'Python SDK', href: '/docs/sdks/python', icon: Code2 },
  { name: 'TypeScript SDK', href: '/docs/sdks/typescript', icon: FileCode2 },
  { name: 'Cursor Guide', href: '/docs/integrations/cursor', icon: Terminal, badge: 'IDE' },
  { name: 'SSE Streaming', href: '/docs/streaming', icon: Radio },
  { name: 'Cookbooks', href: '/docs/cookbook', icon: BookMarked, badge: 'Recipes' },
  { name: 'Function Calling', href: '/docs/function-calling', icon: Wrench },
  { name: 'Structured Outputs', href: '/docs/structured-outputs', icon: Sparkles, badge: 'JSON' },
  { name: 'Model Guide', href: '/docs/models-guide', icon: Flame },
  { name: '75% Prompt Caching', href: '/docs/prompt-caching', icon: Sparkles, badge: '-75%' },
  { name: 'REST API Ref', href: '/docs/api-reference', icon: Cpu },
  { name: 'Security Spec', href: '/docs/security-spec', icon: Lock },
  { name: 'Rate Limits', href: '/docs/rate-limits', icon: Gauge },
  { name: 'Architecture', href: '/docs/architecture', icon: Layers }
];

export function DocsSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between gap-2 p-0.5 rounded-lg bg-white/[0.02] border border-white/[0.08] font-mono text-xs overflow-x-auto">
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {ALL_DOCS_ITEMS.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md whitespace-nowrap text-xs transition-colors ${
                isActive
                  ? 'bg-amber-400 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-950' : 'text-zinc-400'}`} />
              <span>{tab.name}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1 py-0.2 rounded-full font-bold leading-none ${
                    isActive
                      ? 'bg-black/20 text-zinc-950'
                      : 'bg-white/10 text-zinc-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="shrink-0 hidden sm:block pl-2 border-l border-white/10">
        <ShareButton variant="pill" label="Share" className="text-[11px] py-1" />
      </div>
    </div>
  );
}
