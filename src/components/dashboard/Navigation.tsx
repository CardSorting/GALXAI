'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap,
  Menu,
  X,
  Search,
  LogOut,
  Cpu,
  Activity,
  Terminal,
  ShieldCheck,
  Users2,
  DollarSign,
  BookOpen,
  Key,
  Coins,
  MessageSquare,
  ChevronDown,
  CreditCard,
  Settings,
  Building2,
  User as UserIcon
} from 'lucide-react';
import { CommandMenu } from '@/components/common/CommandMenu';
import { LanguageBadge } from '@/components/common/LanguageBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDepositVerification } from '@/lib/hooks/useDepositVerification';
import { GtmPromoBanner } from '@/components/dashboard/GtmPromoBanner';
import { BroccoliOmniSearch } from '@/lib/resilience/BroccoliOmniSearch';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

const NAV_LINKS = [
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Gateway', href: '/gateway', icon: Zap },
  { name: 'Models', href: '/models', icon: Cpu },
  { name: 'Playground', href: '/playground', icon: Terminal },
  { name: 'Pricing', href: '/pricing', icon: DollarSign },
  { name: 'Docs', href: '/docs', icon: BookOpen },
];

function BaseNavigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { walletBalance } = useDepositVerification();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close mobile drawer and dropdown on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleOpenCommand = () => setCommandMenuOpen(true);
    window.addEventListener('open-command-menu', handleOpenCommand);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-command-menu', handleOpenCommand);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <GtmPromoBanner />

      <CommandMenu
        isOpen={commandMenuOpen}
        onClose={() => setCommandMenuOpen(false)}
      />

      <header
        role="banner"
        className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#07080d]/95 border-b border-white/10 px-4 sm:px-6 py-2.5 transition-all"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Brand Logo */}
          <div className="flex items-center gap-6 lg:gap-8 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2 group cursor-pointer shrink-0 rounded-xl p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080d] transition-all"
              aria-label="GALXAI Home - Universal AI Gateway & Model Router"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Zap className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <div className="flex items-baseline font-black tracking-tight text-base">
                <span className="text-white font-sans">GALX</span>
                <span className="text-cyan-400 font-sans">AI</span>
              </div>
            </Link>

            {/* Desktop Direct Navigation Links (No Dropdowns) */}
            <nav
              role="navigation"
              aria-label="Primary Navigation"
              className="hidden lg:flex items-center gap-1"
            >
              {NAV_LINKS.map((link) => {
                const cleanHref = link.href.split('#')[0];
                const isActive = pathname === cleanHref || (cleanHref !== '/' && pathname.startsWith(cleanHref));

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onMouseEnter={() => BroccoliOmniSearch.prefetchRoute(cleanHref)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-normal transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none ${
                      isActive
                        ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 shadow-sm font-bold'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400`}
                  >
                    <span>{link.name}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Search, Language Badge, API Keys, Auth & Actions */}
          <div className="flex items-center gap-2">
            {/* Quick ⌘K Search Trigger */}
            <button
              onClick={() => setCommandMenuOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 active:scale-[0.98] text-xs transition-all cursor-pointer border border-transparent hover:border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              title="Search documentation, models, and seats (⌘K)"
              aria-label="Search documentation and platform"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-zinc-300 font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Language Selector */}
            <LanguageBadge placement="top" className="hidden sm:inline-block" />

            {/* API Keys Link */}
            <Link
              href="/keys"
              onMouseEnter={() => BroccoliOmniSearch.prefetchRoute('/keys')}
              className={`hidden sm:inline-block px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                pathname.startsWith('/keys')
                  ? 'text-indigo-200 bg-indigo-500/20 border border-indigo-500/40 font-bold'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5 active:scale-[0.98]'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400`}
            >
              API Keys
            </Link>

            {/* User State & Dropdown */}
            {user ? (
              <div className="relative" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="hidden sm:inline font-mono max-w-[110px] truncate">
                    {user.name || user.email?.split('@')[0] || 'Account'}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl bg-[#0b0e17] border border-white/15 p-2 shadow-2xl space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-white/10 space-y-0.5">
                      <p className="text-xs font-bold text-white truncate">{user.name || 'Developer'}</p>
                      <p className="text-[10px] text-zinc-400 font-mono truncate">{user.email || 'Sandbox User'}</p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          {user.role || 'Developer'}
                        </span>
                        {user.company && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-400 bg-white/5 border border-white/10 truncate max-w-[110px]">
                            {user.company}
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      href="/teams/seats"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Users2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Teams &amp; Seats</span>
                    </Link>

                    <Link
                      href="/billing"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Wallet &amp; Billing</span>
                    </Link>

                    <Link
                      href="/keys"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Key className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Universal API Keys</span>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Settings</span>
                    </Link>

                    <div className="pt-1 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={pathname && pathname !== '/' && !pathname.startsWith('/auth') ? `/auth/signin?next=${encodeURIComponent(pathname)}` : '/auth/signin'}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {t('nav.signin', 'Sign In')}
              </Link>
            )}

            {/* Team Seats Button */}
            <Link
              href="/solutions/small-business"
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 text-black font-black text-xs font-sans tracking-tight shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Users2 className="w-3.5 h-3.5 text-black" />
              <span>Team Seats</span>
            </Link>

            {/* Mobile Drawer Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              className="lg:hidden p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            role="region"
            aria-label="Mobile Navigation Menu"
            className="lg:hidden mt-3 pt-3 border-t border-white/10 space-y-3 max-w-7xl mx-auto pb-4 max-h-[calc(100vh-5rem)] overflow-y-auto animate-in fade-in duration-150"
          >
            {/* User Profile Card on Mobile */}
            {user ? (
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <p className="text-xs font-bold text-white">{user.name || 'Developer'}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">{user.email || 'Sandbox Account'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                  <Link
                    href="/teams/seats"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-xl bg-black/40 border border-white/5 text-center text-amber-300 hover:bg-white/5"
                  >
                    Seats
                  </Link>
                  <Link
                    href="/billing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-xl bg-black/40 border border-white/5 text-center text-emerald-300 hover:bg-white/5"
                  >
                    Billing
                  </Link>
                  <Link
                    href="/keys"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-xl bg-black/40 border border-white/5 text-center text-indigo-300 hover:bg-white/5"
                  >
                    Keys
                  </Link>
                </div>
              </div>
            ) : (
              <Link
                href={pathname && pathname !== '/' && !pathname.startsWith('/auth') ? `/auth/signin?next=${encodeURIComponent(pathname)}` : '/auth/signin'}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2.5 rounded-2xl text-xs font-bold text-center bg-white/10 hover:bg-white/15 text-white font-sans border border-white/10"
              >
                {t('nav.signin', 'Sign In')}
              </Link>
            )}

            {/* Mobile Language Selector */}
            <div className="flex items-center justify-between px-3 py-2 bg-black/40 rounded-2xl border border-white/5">
              <span className="text-[11px] font-mono text-zinc-400">Language:</span>
              <LanguageBadge placement="bottom" />
            </div>

            {/* Direct Links */}
            <div className="space-y-1">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                const cleanHref = link.href.split('#')[0];
                const isActive = pathname === cleanHref || (cleanHref !== '/' && pathname.startsWith(cleanHref));

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-semibold ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold'
                        : 'text-zinc-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}

              <Link
                href="/keys"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-all text-xs font-semibold"
              >
                <Key className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>API Keys</span>
              </Link>
            </div>

            <div className="pt-2">
              <Link
                href="/solutions/small-business"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-2xl text-xs font-bold text-center bg-gradient-to-r from-amber-400 to-orange-500 text-black font-sans shadow-md"
              >
                Provision Team Seats →
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

function NavigationFallback() {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/10 bg-[#07090e]/95 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span className="font-sans font-black text-base text-white">
            GALX<span className="text-cyan-400">AI</span>
          </span>
        </Link>
        <div className="flex items-center gap-4 text-xs font-mono">
          <Link href="/models" className="text-zinc-300 hover:text-white transition-colors">Models</Link>
          <Link href="/playground" className="text-zinc-300 hover:text-white transition-colors">Playground</Link>
          <Link href="/pricing" className="text-zinc-300 hover:text-white transition-colors">Pricing</Link>
          <Link href="/docs" className="text-zinc-300 hover:text-white transition-colors">Docs</Link>
        </div>
      </div>
    </header>
  );
}

export const Navigation = withErrorBoundary(BaseNavigation, {
  name: 'Global Navigation Header',
  fallback: <NavigationFallback />
});
