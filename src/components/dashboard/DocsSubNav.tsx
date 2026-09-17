'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Compass, 
  Terminal, 
  Sparkles, 
  Code2, 
  ShieldAlert, 
  ExternalLink,
  Search
} from 'lucide-react';

interface NavGroup {
  category: string;
  items: {
    href: string;
    title: string;
    badge?: string;
    icon: typeof Terminal;
    external?: boolean;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    category: 'Getting Started',
    items: [
      { href: '/docs', title: 'Developer Quickstart', badge: 'Start', icon: Compass },
      { href: '/playground', title: 'Interactive Playground', badge: 'Try', icon: Sparkles },
    ],
  },
  {
    category: 'Core Platform',
    items: [
      { href: '/docs/api-reference', title: 'API Reference', badge: 'REST', icon: Terminal },
      { href: '/docs/examples', title: 'Creative Playground', badge: 'Multimodal', icon: Sparkles },
    ],
  },
  {
    category: 'SDKs & Tools',
    items: [
      { href: '/docs/sdks', title: 'SDKs & IDE Setup', badge: 'Cursor/Py', icon: Code2 },
      { href: '/models', title: 'Curated Models', badge: 'Nova', icon: Sparkles },
    ],
  },
  {
    category: 'Production',
    items: [
      { href: '/docs/error-handling', title: 'Troubleshooting & Status', badge: 'Errors', icon: ShieldAlert },
      { href: '/keys', title: 'API Key Management', icon: Terminal },
      { href: '/status', title: 'System Edge Status', icon: ExternalLink },
    ],
  },
];

export function DocsSubNav() {
  const pathname = usePathname();
  const [filter, setFilter] = useState('');

  const filteredGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      item.title.toLowerCase().includes(filter.toLowerCase()) ||
      group.category.toLowerCase().includes(filter.toLowerCase())
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <nav aria-label="Documentation Navigation" className="space-y-6">
      {/* Quick Filter */}
      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
        <input
          type="text"
          placeholder="Filter topics..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>

      {filteredGroups.map((group) => (
        <div key={group.category} className="space-y-1.5">
          <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {group.category}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-500/15 text-indigo-200 shadow-sm ring-1 ring-indigo-500/30'
                      : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                        isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-400'
                      }`}
                    />
                    <span className="truncate">{item.title}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide shrink-0 ${
                        isActive
                          ? 'bg-indigo-500/30 text-indigo-100'
                          : 'bg-white/[0.06] text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
