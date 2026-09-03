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
    <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl bg-[#0d101c] border border-white/10 overflow-x-auto text-xs font-sans">
      {tabs.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 font-medium'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
            <span>{tab.name}</span>
            {tab.badge && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
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
