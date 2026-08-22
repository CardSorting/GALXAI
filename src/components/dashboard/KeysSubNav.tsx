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
      name: 'Active Keys',
      href: '/keys',
      icon: Key,
      exact: true
    },
    {
      name: 'Mint New Key',
      href: '/keys/new',
      icon: Plus,
      badge: 'Presets'
    },
    {
      name: 'Live Activity & Telemetry',
      href: '/keys/activity',
      icon: Activity,
      badge: 'Live'
    },
    {
      name: 'Security & IP Allowlists',
      href: '/keys/permissions',
      icon: ShieldCheck
    },
    {
      name: 'Rate Limits & Quotas',
      href: '/keys/rate-limits',
      icon: Gauge
    }
  ];

  return (
    <div className="flex items-center gap-1 sm:gap-2 p-1 rounded-2xl bg-black/40 border border-white/5 overflow-x-auto font-mono text-xs">
      {tabs.map((tab) => {
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
  );
}
