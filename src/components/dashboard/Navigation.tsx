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
  ChevronDown,
  Rocket
} from 'lucide-react';
import { CommandMenu } from '@/components/common/CommandMenu';
import { ShareButton } from '@/components/common/ShareButton';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDepositVerification } from '@/lib/hooks/useDepositVerification';
import { GtmPromoBanner } from '@/components/dashboard/GtmPromoBanner';

export function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { walletBalance, hasVerifiedDeposit } = useDepositVerification();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpenCommand = () => setCommandMenuOpen(true);
    window.addEventListener('open-command-menu', handleOpenCommand);

    const handleClickOutside = (event: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('open-command-menu', handleOpenCommand);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [pathname]);

  // Pure Flat Minimalist Nav Links with Native Accessibility Descriptions
  const navLinks = [
    {
      label: t('nav.models', 'Models & Arena'),
      href: '/models',
      ariaLabel: 'Frontier AI Models & Battle Arena - Compare 12 Models',
    },
    {
      label: t('nav.requests', 'Requests & Results'),
      href: '/queues',
      ariaLabel: 'Submit Async AI Requests & View Live Results',
    },
    {
      label: t('nav.apps', 'Apps & Solutions'),
      href: '/docs/simple',
      ariaLabel: 'Zero-Code Apps & Solutions Setup',
    },
    {
      label: t('nav.docs', 'Docs & SDKs'),
      href: '/docs',
      ariaLabel: 'Developer Documentation & SDK Reference',
    },
    {
      label: t('nav.pricing', 'Pricing & Trust'),
      href: '/pricing',
      ariaLabel: 'Wholesale Pricing, Prompt Caching & Security Standards',
    },
  ];

  return (
    <>
      <GtmPromoBanner />

      <CommandMenu
        isOpen={commandMenuOpen}
        onClose={() => setCommandMenuOpen(false)}
      />

      <header
        role="banner"
        className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#07080d]/90 border-b border-white/10 px-3 sm:px-6 py-2.5 transition-all"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-6">
          {/* Left Brand & Direct Flat Navigation */}
          <div className="flex items-center gap-4 sm:gap-7">
            <Link
              href="/"
              className="flex items-center gap-2 group cursor-pointer shrink-0 rounded-xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080d] transition-all"
              aria-label="GALXAI Home - Universal AI Gateway & Router"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Zap className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <div className="flex items-baseline font-black tracking-tight text-base">
                <span className="text-white">GALX</span>
                <span className="text-cyan-400">AI</span>
              </div>
            </Link>

            {/* Flat Text Nav Links with High-Contrast Accessible Hover & Focus */}
            <nav
              role="navigation"
              aria-label="Primary Navigation"
              className="hidden lg:flex items-center gap-1"
            >
              {navLinks.map((link) => {
                const isActive = link.href === '/docs'
                  ? pathname === '/docs'
                  : pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="link"
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={link.ariaLabel}
                    className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-normal transition-all duration-150 select-none ${
                      isActive
                        ? 'text-white bg-white/10 font-bold shadow-sm ring-1 ring-white/20'
                        : 'text-zinc-300 hover:text-white hover:bg-white/10 active:scale-[0.98]'
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080d] focus-visible:bg-white/15 focus-visible:text-white`}
                  >
                    <span>{link.label}</span>
                    {isActive && (
                      <span className="sr-only">(current page)</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Cluster (Flat, Minimal, Fully Accessible) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Share Trigger */}
            <ShareButton
              variant="pill"
              label={t('nav.share', 'Share')}
              className="hidden sm:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080d]"
            />

            {/* ⌘K Search */}
            <button
              onClick={() => setCommandMenuOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 active:scale-[0.98] text-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080d]"
              title={t('nav.search', 'Search (⌘K)')}
              aria-label={t('a11y.search_aria', 'Search documentation and models')}
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <kbd className="hidden md:inline-block px-1.5 py-0.5 rounded bg-white/10 text-[9px] text-zinc-300 font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Accessible Wallet Balance Link */}
            <Link
              href="/billing"
              role="link"
              aria-label={`Developer Prepaid Wallet. Current balance: $${walletBalance.toFixed(2)}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                pathname === '/billing'
                  ? 'text-emerald-200 bg-emerald-500/20 border border-emerald-500/50 shadow-sm'
                  : hasVerifiedDeposit
                    ? 'text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 active:scale-[0.98]'
                    : 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 active:scale-[0.98]'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080d]`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hasVerifiedDeposit ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span>${walletBalance.toFixed(2)}</span>
            </Link>

            {/* Accessible API Keys Link */}
            <Link
              href="/keys"
              role="link"
              aria-label="Manage Developer API Keys and Access Tokens"
              className={`hidden sm:inline-block px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                pathname.startsWith('/keys')
                  ? 'text-indigo-200 bg-indigo-500/20 border border-indigo-500/50 font-bold shadow-sm'
                  : 'text-zinc-300 hover:text-white hover:bg-white/10 active:scale-[0.98]'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080d]`}
            >
              {t('nav.keys', 'API Keys')}
            </Link>

            {/* Flat Sign In / User Session Link */}
            {user ? (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="true"
                  aria-label={`User account menu for ${user.name}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080d]"
                >
                  <div
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
                      user.provider === 'grok'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {user.provider === 'grok' ? (
                      <Rocket className="w-2.5 h-2.5" />
                    ) : (
                      <Zap className="w-2.5 h-2.5 fill-amber-400" />
                    )}
                  </div>
                  <span className="max-w-[90px] truncate hidden sm:inline">{user.name}</span>
                  <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {userDropdownOpen && (
                  <div
                    role="menu"
                    aria-label="User Account Options"
                    className="absolute right-0 mt-1.5 w-52 glass-panel rounded-2xl border border-white/15 shadow-2xl p-1.5 space-y-1 z-50 animate-in fade-in duration-100 bg-[#07080d]/95 backdrop-blur-2xl"
                  >
                    <div className="px-3 py-2 border-b border-white/5 space-y-0.5">
                      <div className="text-xs font-bold text-white truncate">{user.name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono truncate">{user.email}</div>
                    </div>

                    <Link
                      href="/billing"
                      role="menuitem"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-emerald-300 hover:text-white hover:bg-emerald-500/10 transition-all font-mono font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                      <span>{t('nav.wallet', 'Wallet')}</span>
                      <span>${walletBalance.toFixed(2)}</span>
                    </Link>

                    <Link
                      href="/keys"
                      role="menuitem"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      <span>{t('nav.keys', 'API Keys')}</span>
                    </Link>

                    <button
                      role="menuitem"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/connect"
                role="link"
                aria-label="Sign in to your GALXAI developer account"
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080d]"
              >
                {t('nav.signin', 'Sign In')}
              </Link>
            )}

            {/* Mobile Drawer Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              className="lg:hidden p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080d]"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div
            role="region"
            aria-label="Mobile Navigation Menu"
            className="lg:hidden mt-2 pt-2 border-t border-white/10 space-y-1 max-w-7xl mx-auto pb-2 animate-in fade-in duration-150"
          >
            {navLinks.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="link"
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.ariaLabel}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'text-white bg-white/15 font-bold shadow-sm'
                      : 'text-zinc-300 hover:text-white hover:bg-white/10'
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
}
