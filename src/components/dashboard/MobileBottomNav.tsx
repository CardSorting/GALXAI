'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap,
  Flame,
  Smile,
  BookOpen,
  Wallet,
  Key,
  Users2,
  Coins
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';
import { BroccoliOmniSearch } from '@/lib/resilience/BroccoliOmniSearch';

function BaseMobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const tabs = [
    {
      label: 'Models',
      href: '/models',
      icon: Flame,
      exact: false,
    },
    {
      label: 'Seats',
      href: '/teams/seats',
      icon: Users2,
      exact: false,
    },
    {
      label: 'Pricing',
      href: '/pricing',
      icon: Coins,
      exact: true,
    },
    {
      label: 'Docs',
      href: '/docs',
      icon: BookOpen,
      exact: false,
    },
    {
      label: user ? 'Wallet' : 'Sign In',
      href: user ? '/billing' : '/auth/signin',
      icon: user ? Wallet : Key,
      exact: false,
    },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#07080d]/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 safe-area-pb">
      <nav className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onMouseEnter={() => BroccoliOmniSearch.prefetchRoute(tab.href)}
              onTouchStart={() => BroccoliOmniSearch.prefetchRoute(tab.href)}
              onPointerDown={() => BroccoliOmniSearch.prefetchRoute(tab.href)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all relative group ${
                isActive
                  ? 'text-cyan-400 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {isActive && (
                <div className="absolute -top-1 w-6 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              )}
              <Icon className={`w-4 h-4 mb-0.5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export const MobileBottomNav = withErrorBoundary(BaseMobileBottomNav, {
  name: 'Mobile Bottom Navigation',
  fallback: null
});
