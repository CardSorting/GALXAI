'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Key,
  Activity,
  ShieldCheck,
  Users2,
  Wallet
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
    { name: 'Top up', href: '/keys/top-up', icon: Wallet },
    {
      name: 'Scopes & Policies',
      href: '/keys/permissions',
      icon: ShieldCheck
    },
    {
      name: 'Activity',
      href: '/keys/activity',
      icon: Activity
    },
    {
      name: 'Team members',
      href: '/teams/seats',
      icon: Users2
    }
  ];

  return (
    <nav aria-label="API keys" className="flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.02] border border-white/[0.08] overflow-x-auto text-xs font-sans">
      {tabs.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-indigo-600/25 text-indigo-200 border border-indigo-500/40 font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-300' : 'text-zinc-400'}`} />
            <span>{tab.name}</span>

          </Link>
        );
      })}
    </nav>
  );
}
