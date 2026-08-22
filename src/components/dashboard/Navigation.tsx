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
  MoreHorizontal,
  Wallet
} from 'lucide-react';
import { CommandMenu } from '@/components/common/CommandMenu';
import { useAuth } from '@/contexts/AuthContext';
import type { PoolStats } from '@/core/contracts/GalxContracts';

export function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [stats, setStats] = useState<PoolStats | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  const moreRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/pool/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {});

    const handleOpenCommand = () => setCommandMenuOpen(true);
    window.addEventListener('open-command-menu', handleOpenCommand);

    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
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

  // Primary 4 Top-Level Links
  const primaryLinks = [
    { href: '/models', label: 'Models' },
    { href: '/playground', label: 'Playground' },
    { href: '/docs', label: 'Docs' },
    { href: '/pricing', label: 'Pricing' },
  ];

  // Secondary "More" Links (Zero internal pooling/sharding jargon)
  const secondaryLinks = [
    { href: '/models/compare', label: 'Model Comparison', icon: GitCompare, desc: 'Side-by-side benchmark & specs matrix' },
    { href: '/playground/battle', label: 'Battle Arena', icon: Swords, desc: 'Dual concurrent streaming comparison' },
    { href: '/docs/api-reference', label: 'API Reference', icon: Code2, desc: 'Complete REST & SSE endpoint reference' },
    { href: '/status', label: 'System Status', icon: Activity, desc: 'Live router health & 99.99% uptime' },
    { href: '/faq', label: 'FAQ & Knowledge', icon: HelpCircle, desc: 'Common questions and integration guide' },
  ];

  return (
    <>
      <CommandMenu
        isOpen={commandMenuOpen}
        onClose={() => setCommandMenuOpen(false)}
      />

      <header className="sticky top-0 z-40 glass-panel border-b border-white/10 px-4 sm:px-6 py-2.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: Brand + Primary Links */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/25 flex items-center justify-center group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#0d101c] rounded-[10px] flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400 animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-wider text-white">
                  GALX<span className="text-cyan-400">AI</span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="All Systems Operational" />
              </div>
            </Link>

            {/* Compressed Desktop Nav (4 Links + "More" Dropdown) */}
            <nav className="hidden md:flex items-center gap-1">
              {primaryLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {/* "More" Dropdown Trigger */}
              <div className="relative" ref={moreRef}>
                <button
                  onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    moreDropdownOpen || ['/status', '/faq', '/playground/battle', '/models/compare', '/docs/api-reference'].some(p => pathname.startsWith(p))
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>More</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${moreDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {moreDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-64 glass-panel rounded-2xl border border-white/10 shadow-2xl p-2 space-y-1 z-50 animate-in fade-in duration-100">
                    {secondaryLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreDropdownOpen(false)}
                          className="flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-white/5 transition-all group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-cyan-300 shrink-0 mt-0.5">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                              {item.label}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono line-clamp-1">
                              {item.desc}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Compact Search Trigger */}
            <button
              onClick={() => setCommandMenuOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-zinc-400 text-xs transition-all cursor-pointer"
              title="Quick Search (⌘K)"
            >
              <Search className="w-3.5 h-3.5" />
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-zinc-400 font-mono">⌘K</kbd>
            </button>

            {/* Quick Wallet Balance Button */}
            <Link
              href="/billing"
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                pathname === '/billing'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">$114.59</span>
            </Link>

            {/* API Keys Link */}
            <Link
              href="/keys"
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                pathname.startsWith('/keys')
                  ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 font-bold'
                  : 'bg-zinc-900/80 hover:bg-zinc-800 border-white/10 text-zinc-300 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>API Keys</span>
            </Link>

            {/* User Session / 1-Click Connect Button */}
            {user ? (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/50 border border-indigo-500/40 text-xs font-semibold text-white hover:border-indigo-400 transition-all cursor-pointer shadow-md"
                >
                  <div className={`w-4 h-4 rounded-md flex items-center justify-center ${
                    user.provider === 'grok' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {user.provider === 'grok' ? <Rocket className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5 fill-amber-400" />}
                  </div>
                  <span className="max-w-[100px] truncate hidden sm:inline">{user.name}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 glass-panel rounded-2xl border border-white/10 shadow-2xl p-2 space-y-1 z-50 animate-in fade-in duration-100">
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
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-white/10 space-y-1.5 max-w-7xl mx-auto">
            {[...primaryLinks, ...secondaryLinks].map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
}
