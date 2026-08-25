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
  ShieldCheck,
  Users2,
  Landmark,
  FileCheck,
  Webhook,
  Gift,
  FileCheck2,
  Download,
  ArrowRight
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  exact?: boolean;
}

interface NavGroup {
  id: 'finance' | 'governance' | 'enterprise';
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'finance',
    title: 'Financial Ledger',
    items: [
      { name: 'Wallet & Top-Up', href: '/billing', icon: Wallet, exact: true },
      { name: 'Invoices', href: '/billing/invoices', icon: FileSpreadsheet, badge: '3' },
      { name: 'Expenses', href: '/billing/expenses', icon: PieChart },
      { name: 'Custom Reports', href: '/billing/reports', icon: Download },
      { name: 'Promo Grants', href: '/billing/promo', icon: Gift, badge: '$320' },
      { name: 'Tax & W-9', href: '/billing/tax', icon: FileCheck2 },
      { name: 'Payment Methods', href: '/billing/payment-methods', icon: Landmark }
    ]
  },
  {
    id: 'governance',
    title: 'Spend Governance',
    items: [
      { name: 'Auto-Reload', href: '/billing/auto-reload', icon: RefreshCw, badge: 'Active' },
      { name: 'Budget Alerts', href: '/billing/budget-alerts', icon: BellRing },
      { name: 'Webhooks & SIEM', href: '/billing/webhooks', icon: Webhook },
      { name: 'Cost Centers', href: '/teams/cost-centers', icon: Building2, badge: '4 Squads' }
    ]
  },
  {
    id: 'enterprise',
    title: 'Enterprise & Trust',
    items: [
      { name: 'Audit Trail', href: '/billing/audit-logs', icon: FileCheck, badge: 'SOC2' },
      { name: 'Volume Contracts', href: '/solutions/enterprise', icon: Building2, badge: '40% OFF' },
      { name: 'Legal & BAA', href: '/compliance', icon: ShieldCheck }
    ]
  }
];

export function BillingSubNav() {
  const pathname = usePathname();

  // Find active group
  const activeGroup = NAV_GROUPS.find(group =>
    group.items.some(item => (item.exact ? pathname === item.href : pathname.startsWith(item.href)))
  ) || NAV_GROUPS[0];

  return (
    <div className="space-y-3 font-mono">
      {/* Category Pillars (Top Bar) */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          {NAV_GROUPS.map((group) => {
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

        <div className="flex items-center gap-2 text-xs font-sans">
          <Link
            href="/teams/seats"
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 transition-all font-mono font-bold"
          >
            <Users2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Workspace &amp; Seats</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-zinc-400'}`} />
              <span>{tab.name}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
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
