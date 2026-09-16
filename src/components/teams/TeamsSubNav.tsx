'use client';
import { BILLING_PATHS } from '@/lib/billing/navigation';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users2,
  Building2,
  ShieldCheck,
  Lock,
  Wallet,
  ArrowRight,
  UserPlus,
  Sliders,
  Shield,
  Activity,
  Settings
} from 'lucide-react';

interface TeamNavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  exact?: boolean;
}

interface TeamNavGroup {
  id: string;
  title: string;
  items: TeamNavItem[];
}

const TEAM_NAV_GROUPS: TeamNavGroup[] = [
  {
    id: 'members',
    title: 'Members & Access',
    items: [
      {
        name: 'Team members',
        href: '/teams/seats',
        icon: Users2,
        exact: true,
      },
      {
        name: 'Pending Invites',
        href: '/teams/invites',
        icon: UserPlus,
        exact: false,
      },
      {
        name: 'Spend Caps',
        href: '/teams/spend-limits',
        icon: Sliders,
        exact: false,
      },
      {
        name: 'Cost Centers',
        href: '/teams/cost-centers',
        icon: Building2,
        exact: false,
      },
    ],
  },
  {
    id: 'security',
    title: 'Security & Identity',
    items: [
      {
        name: 'RBAC Roles',
        href: '/teams/roles',
        icon: ShieldCheck,
        exact: false,
      },
      {
        name: 'Security & 2FA',
        href: '/teams/security',
        icon: Shield,
        exact: false,
      },
      {
        name: 'SAML SSO & SCIM',
        href: '/teams/sso',
        icon: Lock,
        exact: false,
      },
    ],
  },
  {
    id: 'governance',
    title: 'Governance & Settings',
    items: [
      {
        name: 'Team Activity',
        href: '/teams/activity',
        icon: Activity,
        exact: false,
      },
      {
        name: 'Org Settings',
        href: '/teams/settings',
        icon: Settings,
        exact: false,
      },
    ],
  },
];

export function TeamsSubNav() {
  const pathname = usePathname();

  // Find active group
  const activeGroup = TEAM_NAV_GROUPS.find(group =>
    group.items.some(item => (item.exact ? pathname === item.href : pathname.startsWith(item.href)))
  ) || TEAM_NAV_GROUPS[0];

  return (
    <div className="space-y-3 font-mono">
      {/* Top Pillar Selector & Financial Cross-Link */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          {TEAM_NAV_GROUPS.map((group) => {
            const isGroupActive = group.id === activeGroup.id;
            const defaultHref = group.items[0].href;

            return (
              <Link
                key={group.id}
                href={defaultHref}
                className={`px-3.5 py-1.5 rounded-xl text-xs uppercase tracking-wider font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isGroupActive
                    ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                <span>{group.title}</span>
                {isGroupActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Link
            href={BILLING_PATHS.transactions}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-all font-sans"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Transactions</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Group Nav Items Pills */}
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
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive
                      ? 'bg-black/20 text-black'
                      : tab.badgeColor || 'bg-white/10 text-white'
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
