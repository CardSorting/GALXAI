'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Key,
  Plus,
  Activity,
  ShieldCheck,
  Sliders,
  Terminal,
  Gauge,
  Lock
} from 'lucide-react';

export function KeysSubNav() {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'API Keys',
      href: '/keys',
      icon: Key,
      exact: true
    },
    {
      name: 'New Key',
      href: '/keys/new',
      icon: Plus
    },
    {
      name: 'Scopes & Policies',
      href: '/keys/permissions',
      icon: ShieldCheck
    },
    {
      name: 'Rate Limits',
      href: '/keys/rate-limits',
      icon: Gauge
    },
    {
      name: 'Activity & Telemetry',
      href: '/keys/activity',
      icon: Activity,
      badge: 'Live'
    },
    {
      name: 'Settings',
      href: '/settings?tab=developer',
      icon: Sliders
    }
  ];

  return (
    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.02] border border-white/[0.08] overflow-x-auto text-xs font-sans">
      {tabs.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-indigo-600/25 text-indigo-200 border border-indigo-500/40 font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-300' : 'text-zinc-400'}`} />
            <span>{tab.name}</span>
            {tab.badge && (
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold leading-none ${
                  isActive
                    ? 'bg-indigo-400/20 text-indigo-200'
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
  );
}
