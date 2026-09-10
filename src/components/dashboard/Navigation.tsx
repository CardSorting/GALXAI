'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Search,
  LogOut,
  Cpu,
  Users2,
  DollarSign,
  BookOpen,
  Key,
  Coins,
  ChevronDown,
  CreditCard,
  Settings,
  Image as ImageIcon
} from 'lucide-react';
import { CommandMenu } from '@/components/common/CommandMenu';
import { LanguageBadge } from '@/components/common/LanguageBadge';
import { GalxGalaxyLogo } from '@/components/brand/GalxGalaxyLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDepositVerification } from '@/lib/hooks/useDepositVerification';
import { BroccoliOmniSearch } from '@/lib/resilience/BroccoliOmniSearch';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

const NAV_LINKS = [
  { name: 'Models', href: '/models', icon: Cpu },
  { name: 'Images', href: '/images', icon: ImageIcon },
  { name: 'Docs', href: '/docs', icon: BookOpen },
  { name: 'Pricing', href: '/pricing', icon: DollarSign },
  { name: 'API Keys', href: '/keys', icon: Key },
  { name: 'Teams', href: '/teams/seats', icon: Users2 },
];

function BaseNavigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { walletBalance, isLoaded: walletLoaded } = useDepositVerification();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Throttled scroll listener using requestAnimationFrame for zero jitter
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isScrolled = window.scrollY > 8;
          setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      <CommandMenu
        isOpen={commandMenuOpen}
        onClose={() => setCommandMenuOpen(false)}
      />

      <header
        role="banner"
        className={`sticky top-0 z-40 w-full transform-gpu transition-[background-color,border-color] duration-150 px-3 sm:px-6 ${
          scrolled
            ? 'bg-[#07080d]/95 backdrop-blur-md border-b border-white/[0.10]'
            : 'bg-[#07080d]/80 backdrop-blur-md border-b border-white/[0.06]'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 w-full h-11">
          {/* Left: Brand Logo & Navigation */}
          <div className="flex items-center gap-5 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-1.5 group cursor-pointer shrink-0 rounded p-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 transition-transform active:scale-95"
              aria-label="GALXAI Home - Universal AI Gateway & Model Router"
            >
              <GalxGalaxyLogo size={20} showText={true} textClassName="text-sm font-extrabold tracking-tight" />
            </Link>

            {/* Desktop Direct Navigation Links */}
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
                    className={`px-2.5 py-1 rounded text-xs font-medium tracking-normal transition-colors cursor-pointer select-none ${
                      isActive
                        ? 'text-white bg-white/[0.08]'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                    } focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Search, Auth & Actions */}
          <div className="flex items-center gap-1.5">
            {/* Quick ⌘K Search Trigger */}
            <button
              onClick={() => setCommandMenuOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/20 text-zinc-400 hover:text-zinc-200 text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
              title="Search documentation and models (⌘K)"
              aria-label="Search"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline text-xs text-zinc-400">Search</span>
              <kbd className="hidden sm:inline-block px-1 py-0.2 rounded bg-white/[0.06] text-[10px] text-zinc-400 font-mono border border-white/[0.08] leading-none">
                ⌘K
              </kbd>
            </button>

            {/* Live Wallet Balance Pill */}
            {user && walletLoaded && (
              <Link
                href="/billing"
                className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium transition-colors cursor-pointer"
                title="Active Compute Credit Balance"
              >
                <Coins className="w-3 h-3 text-emerald-400" />
                <span>${walletBalance.toFixed(2)}</span>
              </Link>
            )}

            {/* User State & Dropdown */}
            {user ? (
              <div className="relative" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-xs font-medium text-zinc-200 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="hidden sm:inline font-mono max-w-[90px] truncate text-xs">
                    {user.name || user.email?.split('@')[0] || 'Account'}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 rounded-xl bg-[#090b12] border border-white/10 p-1.5 shadow-xl space-y-0.5 z-50 animate-in fade-in duration-100">
                    <div className="px-2.5 py-1.5 border-b border-white/[0.08] mb-1">
                      <p className="text-xs font-semibold text-white truncate">{user.name || 'Developer'}</p>
                      <p className="text-[10px] text-zinc-400 font-mono truncate">{user.email || 'Sandbox User'}</p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          {user.role || 'Developer'}
                        </span>
                        {walletLoaded && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            ${walletBalance.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      href="/library"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Image Library</span>
                    </Link>

                    <Link
                      href="/teams/seats"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <Users2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Teams &amp; Seats</span>
                    </Link>

                    <Link
                      href="/billing"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Wallet &amp; Billing</span>
                    </Link>

                    <Link
                      href="/keys"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <Key className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Universal API Keys</span>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Settings</span>
                    </Link>

                    <div className="pt-1 border-t border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
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
                className="px-2.5 py-1 rounded text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
              >
                {t('nav.signin', 'Sign In')}
              </Link>
            )}

            {/* Mobile Drawer Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              className="lg:hidden p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
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
            className="lg:hidden pt-2 pb-3 border-t border-white/[0.08] space-y-2 max-w-7xl mx-auto max-h-[calc(100vh-3.5rem)] overflow-y-auto animate-in fade-in duration-100"
          >
            {/* User Profile Card on Mobile */}
            {user ? (
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-white">{user.name || 'Developer'}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">{user.email || 'Sandbox Account'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-0.5 font-mono text-[11px]">
                  <Link
                    href="/teams/seats"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded bg-black/40 border border-white/[0.06] text-center text-amber-300 hover:bg-white/5"
                  >
                    Seats
                  </Link>
                  <Link
                    href="/billing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded bg-black/40 border border-white/[0.06] text-center text-emerald-300 hover:bg-white/5"
                  >
                    Billing
                  </Link>
                  <Link
                    href="/keys"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded bg-black/40 border border-white/[0.06] text-center text-indigo-300 hover:bg-white/5"
                  >
                    Keys
                  </Link>
                </div>
              </div>
            ) : (
              <Link
                href={pathname && pathname !== '/' && !pathname.startsWith('/auth') ? `/auth/signin?next=${encodeURIComponent(pathname)}` : '/auth/signin'}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded text-xs font-semibold text-center bg-white/[0.06] hover:bg-white/10 text-white border border-white/[0.08]"
              >
                {t('nav.signin', 'Sign In')}
              </Link>
            )}

            {/* Direct Links */}
            <div className="space-y-0.5">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                const cleanHref = link.href.split('#')[0];
                const isActive = pathname === cleanHref || (cleanHref !== '/' && pathname.startsWith(cleanHref));

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded transition-colors text-xs font-medium ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                        : 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile Language Selector */}
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-black/30 rounded border border-white/[0.06]">
              <span className="text-[11px] font-mono text-zinc-400">Language:</span>
              <LanguageBadge placement="bottom" />
            </div>
          </div>
        )}
      </header>
    </>
  );
}

function NavigationFallback() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#07090e]/95 backdrop-blur-md px-3 sm:px-6 h-11 flex items-center">
      <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
        <Link href="/" className="flex items-center gap-1.5">
          <GalxGalaxyLogo size={20} showText={true} textClassName="text-sm font-extrabold tracking-tight" />
        </Link>
        <div className="flex items-center gap-3 text-xs font-mono">
          <Link href="/models" className="text-zinc-400 hover:text-white transition-colors">Models</Link>
          <Link href="/docs" className="text-zinc-400 hover:text-white transition-colors">Docs</Link>
          <Link href="/pricing" className="text-zinc-400 hover:text-white transition-colors">Pricing</Link>
          <Link href="/keys" className="text-zinc-400 hover:text-white transition-colors">API Keys</Link>
        </div>
      </div>
    </header>
  );
}

export const Navigation = withErrorBoundary(BaseNavigation, {
  name: 'Global Navigation Header',
  fallback: <NavigationFallback />
});
