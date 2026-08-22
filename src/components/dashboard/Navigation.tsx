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
import { PersonaSwitcher } from '@/components/dashboard/PersonaSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

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

  // Pure Flat Minimalist Nav Links (No Chips / Badges)
  const navLinks = [
    {
      label: t('nav.models', 'Models & Arena'),
      href: '/models',
    },
    {
      label: t('nav.apps', 'Apps & Solutions'),
      href: '/docs/simple',
    },
    {
      label: t('nav.docs', 'Docs & SDKs'),
      href: '/docs',
    },
    {
      label: t('nav.pricing', 'Pricing & Trust'),
      href: '/pricing',
    },
  ];

  return (
    <>
      <CommandMenu
        isOpen={commandMenuOpen}
        onClose={() => setCommandMenuOpen(false)}
      />

      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#07080d]/90 border-b border-white/10 px-3 sm:px-6 py-2.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-6">
          {/* Left Brand & Direct Flat Navigation */}
          <div className="flex items-center gap-4 sm:gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 group cursor-pointer shrink-0"
              aria-label="GALXAI Home"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Zap className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <div className="flex items-baseline font-black tracking-tight text-base">
                <span className="text-white">GALX</span>
                <span className="text-cyan-400">AI</span>
              </div>
            </Link>

            {/* Flat Text Nav Links (No Chips) */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = link.href === '/docs'
                  ? pathname === '/docs'
                  : pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'text-white bg-white/10 font-bold'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Cluster (Flat, Minimal, No Bulky CTAs) */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Persona Switcher (Creator / Developer / Agent) */}
            <PersonaSwitcher />

            {/* Share Trigger */}
            <ShareButton
              variant="pill"
              label={t('nav.share', 'Share')}
              className="hidden sm:flex"
            />

            {/* ⌘K Search */}
            <button
              onClick={() => setCommandMenuOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 text-xs transition-colors cursor-pointer"
              title={t('nav.search', 'Search (⌘K)')}
              aria-label={t('a11y.search_aria', 'Search')}
            >
              <Search className="w-3 h-3 text-zinc-400" />
              <kbd className="hidden md:inline-block px-1 py-0.2 rounded bg-white/10 text-[9px] text-zinc-400 font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Flat Wallet Balance Link */}
            <Link
              href="/billing"
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
                pathname === '/billing'
                  ? 'text-emerald-300 bg-emerald-500/10 font-bold'
                  : 'text-zinc-400 hover:text-emerald-300 hover:bg-white/5'
              }`}
              title={t('nav.wallet', 'Developer Wallet')}
            >
              $114.59
            </Link>

            {/* Flat API Keys Link */}
            <Link
              href="/keys"
              className={`hidden sm:inline-block px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                pathname.startsWith('/keys')
                  ? 'text-indigo-300 bg-indigo-500/10 font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t('nav.keys', 'API Keys')}
            </Link>

            {/* Flat Sign In / User Session Link */}
            {user ? (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
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
                  <span className="max-w-[80px] truncate hidden sm:inline">{user.name}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-zinc-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-48 glass-panel rounded-xl border border-white/10 shadow-2xl p-1.5 space-y-1 z-50 animate-in fade-in duration-100 bg-[#0a0d1a]">
                    <div className="px-2.5 py-1.5 border-b border-white/5 space-y-0.5">
                      <div className="text-xs font-bold text-white truncate">{user.name}</div>
                      <div className="text-[9px] text-zinc-400 font-mono truncate">{user.email}</div>
                    </div>

                    <Link
                      href="/billing"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-emerald-300 hover:text-white hover:bg-emerald-500/10 transition-all font-mono font-bold"
                    >
                      <span>{t('nav.wallet', 'Wallet')}</span>
                      <span>$114.59</span>
                    </Link>

                    <Link
                      href="/keys"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <span>{t('nav.keys', 'API Keys')}</span>
                    </Link>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer text-left"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/connect"
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                {t('nav.signin', 'Sign In')}
              </Link>
            )}

            {/* Mobile Drawer Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-2 pt-2 border-t border-white/10 space-y-1 max-w-7xl mx-auto pb-2 animate-in fade-in duration-150">
            {navLinks.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'text-white bg-white/10 font-bold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
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
