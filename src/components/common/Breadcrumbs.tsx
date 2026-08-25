'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, Home, Sparkles } from 'lucide-react';
import { BroccoliOmniSearch } from '@/lib/resilience/BroccoliOmniSearch';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  workspaceContext?: {
    name: string;
    plan?: string;
  };
}

export function Breadcrumbs({ items, workspaceContext }: BreadcrumbsProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://galx.ai';

  const schemaJson = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl
      },
      ...items.map((item, idx) => ({
        '@type': 'ListItem',
        position: idx + 2,
        name: item.label,
        item: item.href ? `${baseUrl}${item.href}` : undefined
      }))
    ]
  };

  useEffect(() => {
    if (typeof window === 'undefined' || items.length === 0) return;
    const current = items[items.length - 1];
    if (current?.label) {
      BroccoliOmniSearch.recordVisit(
        current.label,
        current.href || window.location.pathname,
        'Navigation'
      );
    }
  }, [items]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJson) }}
      />

      <nav
        aria-label="Breadcrumb"
        className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs text-zinc-400 font-sans font-medium mb-4 p-2 rounded-2xl bg-black/30 border border-white/5 backdrop-blur-md w-fit max-w-full overflow-x-auto"
      >
        {/* Workspace Indicator Pill if in /teams */}
        {workspaceContext && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-mono font-bold shrink-0">
            <span>🏢</span>
            <span>{workspaceContext.name}</span>
            {workspaceContext.plan && (
              <span className="text-[10px] text-amber-400/80">({workspaceContext.plan})</span>
            )}
            <ChevronRight className="w-3 h-3 text-amber-400/50" />
          </div>
        )}

        <Link
          href="/"
          className="flex items-center gap-1 px-2 py-1 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all shrink-0 font-mono"
        >
          <Home className="w-3.5 h-3.5 text-zinc-400" />
          <span>Home</span>
        </Link>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const Icon = item.icon;

          return (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-mono shrink-0"
                >
                  {Icon && <Icon className="w-3.5 h-3.5 text-zinc-400" />}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${item.badgeColor || 'bg-white/10 text-white'}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-white/10 text-white font-mono font-bold text-xs truncate max-w-[280px] shrink-0 shadow-sm border border-white/10">
                  {Icon && <Icon className="w-3.5 h-3.5 text-amber-400" />}
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${item.badgeColor || 'bg-amber-400 text-black'}`}>
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </>
  );
}
