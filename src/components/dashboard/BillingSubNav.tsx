'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Wallet,
  Receipt,
  PieChart,
  RefreshCw,
  CreditCard,
  Flame,
  FileSpreadsheet,
  Building2,
  BellRing,
  ShieldCheck
} from 'lucide-react';

export function BillingSubNav() {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Wallet & Top-Up',
      href: '/billing',
      icon: Wallet,
      exact: true
    },
    {
      name: 'Business Invoices',
      href: '/billing/invoices',
      icon: FileSpreadsheet,
      badge: '3 Tax Statements'
    },
    {
      name: 'Expense Reporting',
      href: '/billing/expenses',
      icon: PieChart
    },
    {
      name: 'Auto-Top Up',
      href: '/billing/auto-reload',
      icon: RefreshCw,
      badge: 'Protected'
    },
    {
      name: 'Budget Alerts',
      href: '/billing/budget-alerts',
      icon: BellRing
    },
    {
      name: 'Enterprise Tier',
      href: '/billing/enterprise',
      icon: Building2,
      badge: '40% Wholesale'
    }
  ];

  return (
    <div className="flex items-center gap-1 sm:gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10 overflow-x-auto font-mono text-xs">
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
