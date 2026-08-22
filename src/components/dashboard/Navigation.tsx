'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap,
  Key,
  Shield,
  Radio,
  Terminal,
  Code2,
  Cpu,
  Menu,
  X,
  Search,
  CreditCard,
  CheckCircle2,
  Activity,
  LogOut,
  ChevronDown,
  Rocket,
  Swords,
  GitCompare,
  HelpCircle,
  Wallet,
  Smile,
  Flame,
  DollarSign,
  BookOpen
} from 'lucide-react';
import { CommandMenu } from '@/components/common/CommandMenu';
import { ShareButton } from '@/components/common/ShareButton';
import { PersonaSwitcher } from '@/components/dashboard/PersonaSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import type { PoolStats } from '@/core/contracts/GalxContracts';

export function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [stats, setStats] = useState<PoolStats | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/pool/stats')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {});

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

  // Compressed, Flattened Minimalist Navigation Items
  const navItems = [
    {
      label: 'Models & Arena',
      href: '/models',
      badge: '12 Models',
      exact: false,
    },
    {
      label: 'Apps & Solutions',
      href: '/docs/simple',
      badge: 'Zero-Code',
      exact: false,
    },
    {
      label: 'Docs & SDKs',
      href: '/docs',
      badge: null,
      exact: true,
    },
    {
      label: 'Pricing & Trust',
      href: '/pricing',
      badge: 'Save 35%',
      exact: false,
    },
  ];

  return (
    <>
      <CommandMenu
        isOpen={commandMenuOpen}
        onClose={() => setCommandMenuOpen(false)}
      />

      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#07080d]/85 border-b border-white/10 px-3 sm:px-6 py-2.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
          {/* Left Brand & Flattened Nav Cluster */}
          <div className="flex items-center gap-4 lg:gap-7">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 group cursor-pointer shrink-0"
              aria-label="GALXAI Home"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <div className="flex items-baseline font-black tracking-tight text-base sm:text-lg">
                <span className="text-white">GALX</span>
                <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                  AI
                </span>
                <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse hidden sm:inline-block" />
              </div>
            </Link>

            {/* Compressed Direct Nav Links (No Dropdowns) */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white/10 text-white shadow-sm font-bold'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold border ${
                        item.badge === 'Save 35%'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : item.badge === 'Zero-Code'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Persona Switcher (Creator View / Developer / Agent) */}
            <PersonaSwitcher />

            {/* Quick Share Trigger */}
            <ShareButton
              variant="pill"
              label="Share"
              className="hidden sm:flex"
            />

            {/* Quick Search Trigger (⌘K) */}
            <button
              onClick={() => setCommandMenuOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-zinc-400 hover:text-white text-xs transition-all cursor-pointer"
              title="Quick Search (⌘K)"
              aria-label="Quick Search"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <kbd className="hidden md:inline-block px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-zinc-400 font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Wallet Balance Link */}
            <Link
              href="/billing"
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                pathname === '/billing'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
              }`}
              title="Prepaid Developer Wallet"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>$114.59</span>
            </Link>

            {/* API Keys Link */}
            <Link
              href="/keys"
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                pathname.startsWith('/keys')
                  ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 font-bold'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 border-white/10 text-zinc-300 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>API Keys</span>
            </Link>

            {/* User Session / 1-Click Connect Button */}
            {user ? (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/50 border border-indigo-500/40 text-xs font-semibold text-white hover:border-indigo-400 transition-all cursor-pointer shadow-md"
                >
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
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
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 glass-panel rounded-2xl border border-white/10 shadow-2xl p-2 space-y-1 z-50 animate-in fade-in duration-100 bg-[#0a0d1a]">
                    <div className="px-3 py-2 border-b border-white/5 space-y-0.5">
                      <div className="text-xs font-bold text-white truncate">{user.name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono truncate">{user.email}</div>
                    </div>

                    <Link
                      href="/billing"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-emerald-300 hover:text-white hover:bg-emerald-500/10 transition-all font-mono font-bold"
                    >
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Wallet ($114.59)</span>
                    </Link>

                    <Link
                      href="/keys"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <Key className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Developer API Keys</span>
                    </Link>

                    <Link
                      href="/playground"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Playground</span>
                    </Link>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer text-left"
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
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Zap className="w-3.5 h-3.5 fill-black shrink-0" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile Drawer Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-white/10 space-y-3 max-w-7xl mx-auto pb-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`p-3 rounded-2xl border transition-all text-xs font-semibold flex flex-col justify-between space-y-1 ${
                      isActive
                        ? 'bg-indigo-600/30 border-indigo-400 text-white font-bold'
                        : 'bg-white/5 border-white/5 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] text-cyan-400 font-mono">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Link
                href="/keys"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-center font-semibold text-zinc-300"
              >
                API Keys
              </Link>
              <Link
                href="/billing"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-center font-mono font-bold text-emerald-300"
              >
                Wallet ($114.59)
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
