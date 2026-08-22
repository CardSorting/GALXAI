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
  Wallet,
  Smile,
  Layers,
  Sparkles,
  Laptop,
  ArrowRight,
  ArrowLeftRight,
  BookOpen,
  DollarSign,
  Lock,
  Flame,
  Wrench,
  Bot
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
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const navRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/pool/stats')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {});

    const handleOpenCommand = () => setCommandMenuOpen(true);
    window.addEventListener('open-command-menu', handleOpenCommand);

    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
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

  // Mega Menu Configurations
  const navMenus = [
    {
      id: 'models',
      label: 'Models & Arena',
      href: '/models',
      badge: '12 Models',
      items: [
        {
          title: 'Frontier AI Catalog',
          desc: 'GPT-5.6 Sol, Grok 4.5, Terra, and Luna specs & token rates',
          href: '/models',
          icon: Flame,
          color: 'text-amber-400',
        },
        {
          title: 'Model Battle Arena',
          desc: 'Stream test 2 models side-by-side with live token speed',
          href: '/playground/battle',
          icon: Swords,
          color: 'text-indigo-400',
          badge: 'Interactive',
        },
        {
          title: 'Comparison & Specs Matrix',
          desc: 'Compare throughput, context limits, and cost savings',
          href: '/models/compare',
          icon: GitCompare,
          color: 'text-cyan-400',
        },
        {
          title: 'Plain English Model Guide',
          desc: 'Zero-jargon advice on picking the right model for your task',
          href: '/docs/models-guide',
          icon: Smile,
          color: 'text-emerald-400',
          badge: 'Beginner',
        },
      ],
      featured: {
        title: 'GPT-5.6 Sol (2M Context)',
        desc: 'World record 2,000,000 token context window with 75% prompt caching.',
        href: '/models/gpt-5.6-sol',
        badge: 'Top Pick',
      },
    },
    {
      id: 'apps',
      label: 'Apps & Solutions',
      href: '/docs/simple',
      badge: 'Zero-Code',
      items: [
        {
          title: 'Plain English Quickstart',
          desc: 'Zero-code guide for non-technical users and founders',
          href: '/docs/simple',
          icon: Smile,
          color: 'text-amber-400',
          badge: 'Easy',
        },
        {
          title: 'Cursor & Windsurf Setup',
          desc: '1-minute setup to get cheap tokens in your favorite IDE',
          href: '/docs/ide-setup',
          icon: Laptop,
          color: 'text-emerald-400',
        },
        {
          title: 'ChatGPT-Style Web Apps',
          desc: 'Use GALXAI with LibreChat, TypingMind, and OpenWebUI',
          href: '/docs/simple#apps',
          icon: Sparkles,
          color: 'text-cyan-400',
        },
        {
          title: 'No-Code Workflows',
          desc: 'Connect Make.com, Zapier, and Dify with 1 HTTP step',
          href: '/docs/cookbook',
          icon: Wrench,
          color: 'text-indigo-400',
        },
        {
          title: 'AI Agents & Swarms Hub',
          desc: 'High-concurrency infrastructure engineered for autonomous fleets',
          href: '/docs/agents',
          icon: Bot,
          color: 'text-purple-400',
          badge: 'Agents',
        },
      ],
      featured: {
        title: 'Interactive Web Playground',
        desc: 'Test prompts live in browser without writing a single line of code.',
        href: '/playground',
        badge: 'Try Now',
      },
    },
    {
      id: 'docs',
      label: 'Docs & SDKs',
      href: '/docs',
      items: [
        {
          title: 'Documentation Center',
          desc: 'Comprehensive guides, architecture specs, and tutorials',
          href: '/docs',
          icon: BookOpen,
          color: 'text-amber-400',
        },
        {
          title: '30-Second Quickstart',
          desc: 'Mint an API key and run your first completion in 30s',
          href: '/docs/quickstart',
          icon: Zap,
          color: 'text-cyan-400',
          badge: '30s',
        },
        {
          title: 'Universal API Reference',
          desc: 'Complete OpenAPI specs for chat, models, and embeddings',
          href: '/docs/api-reference',
          icon: Cpu,
          color: 'text-rose-400',
        },
        {
          title: '1-Click Migration Guide',
          desc: 'Switch from OpenAI, OpenRouter, LiteLLM, or Bedrock in 1 env',
          href: '/docs/migration',
          icon: ArrowLeftRight,
          color: 'text-emerald-400',
        },
      ],
      featured: {
        title: 'Production Cookbooks',
        desc: 'Battle-tested recipes for RAG, multi-agent swarms, and batch pipelines.',
        href: '/docs/cookbook',
        badge: 'Recipes',
      },
    },
    {
      id: 'pricing',
      label: 'Pricing & Trust',
      href: '/pricing',
      badge: 'Save 35%',
      items: [
        {
          title: 'Wholesale Pricing & Calculator',
          desc: 'Pay-as-you-go rates with 25%–40% wholesale discount',
          href: '/pricing',
          icon: DollarSign,
          color: 'text-emerald-400',
          badge: 'Save 35%',
        },
        {
          title: 'Live Router Status',
          desc: 'Real-time 99.99% uptime monitor and sub-15ms latency metrics',
          href: '/status',
          icon: Activity,
          color: 'text-emerald-400',
          badge: '99.99%',
        },
        {
          title: 'Security & Zero-Retention',
          desc: 'AES-256-GCM encryption, RAM transit, and strict privacy',
          href: '/docs/security-spec',
          icon: Lock,
          color: 'text-cyan-400',
        },
        {
          title: 'FAQ & Knowledge Base',
          desc: 'Clear answers on billing, pooling, limits, and setup',
          href: '/faq',
          icon: HelpCircle,
          color: 'text-amber-400',
        },
      ],
      featured: {
        title: '$5 Free Starter Credit',
        desc: 'Every new account gets $5 instant credit to start experimenting right away.',
        href: '/auth/connect',
        badge: 'Instant',
      },
    },
  ];

  return (
    <>
      <CommandMenu
        isOpen={commandMenuOpen}
        onClose={() => setCommandMenuOpen(false)}
      />

      <header className="sticky top-0 z-40 glass-panel border-b border-white/10 px-4 sm:px-6 py-2.5 transition-all bg-[#07080d]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between" ref={navRef}>
          {/* Left: Brand + Mega Menu Links */}
          <div className="flex items-center gap-5 lg:gap-8">
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

            {/* Desktop Mega-Menu Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navMenus.map((menu) => {
                const isOpen = activeDropdown === menu.id;
                const isCurrentActive =
                  pathname === menu.href ||
                  (menu.href !== '/' && pathname.startsWith(menu.href)) ||
                  menu.items.some((it) => pathname === it.href);

                return (
                  <div key={menu.id} className="relative">
                    <button
                      onClick={() => setActiveDropdown(isOpen ? null : menu.id)}
                      onMouseEnter={() => setActiveDropdown(menu.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isOpen || isCurrentActive
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{menu.label}</span>
                      {menu.badge && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          {menu.badge}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-3 h-3 text-zinc-400 transition-transform ${
                          isOpen ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    </button>

                    {/* Mega Dropdown Panel */}
                    {isOpen && (
                      <div
                        onMouseLeave={() => setActiveDropdown(null)}
                        className="absolute left-0 mt-2 w-[520px] glass-panel rounded-3xl border border-white/15 shadow-2xl p-4 z-50 bg-[#0a0d1a]/95 backdrop-blur-2xl grid grid-cols-5 gap-4 animate-in fade-in zoom-in-95 duration-150"
                      >
                        {/* Main Link Items (3 cols) */}
                        <div className="col-span-3 space-y-1">
                          {menu.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setActiveDropdown(null)}
                                className={`flex items-start gap-3 p-2.5 rounded-2xl transition-all group ${
                                  isActive
                                    ? 'bg-white/10 text-white'
                                    : 'hover:bg-white/5 text-zinc-300 hover:text-white'
                                }`}
                              >
                                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                                  <Icon className={`w-4 h-4 ${item.color}`} />
                                </div>
                                <div className="space-y-0.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                                      {item.title}
                                    </span>
                                    {item.badge && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold shrink-0">
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-zinc-400 line-clamp-1 leading-snug">
                                    {item.desc}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>

                        {/* Featured Callout Card (2 cols) */}
                        {menu.featured && (
                          <div className="col-span-2 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-black to-zinc-950 border border-indigo-500/30 p-3.5 flex flex-col justify-between">
                            <div className="space-y-2">
                              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                                {menu.featured.badge}
                              </span>
                              <h4 className="text-xs font-bold text-white leading-tight">
                                {menu.featured.title}
                              </h4>
                              <p className="text-[11px] text-zinc-400 leading-relaxed">
                                {menu.featured.desc}
                              </p>
                            </div>

                            <Link
                              href={menu.featured.href}
                              onClick={() => setActiveDropdown(null)}
                              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-cyan-200 transition-colors group/link"
                            >
                              <span>Explore</span>
                              <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Persona Switcher (Creator / Developer / Agent mode) */}
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
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-zinc-400 text-xs transition-all cursor-pointer"
              title="Quick Search (⌘K)"
            >
              <Search className="w-3.5 h-3.5" />
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-zinc-400 font-mono">
                ⌘K
              </kbd>
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
              <span className="hidden sm:inline">API Keys</span>
            </Link>

            {/* User Session / 1-Click Connect Button */}
            {user ? (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/50 border border-indigo-500/40 text-xs font-semibold text-white hover:border-indigo-400 transition-all cursor-pointer shadow-md"
                >
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center ${
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
                  <span className="max-w-[100px] truncate hidden sm:inline">{user.name}</span>
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
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile Menu Button */}
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
          <div className="lg:hidden mt-3 pt-3 border-t border-white/10 space-y-4 max-w-7xl mx-auto max-h-[80vh] overflow-y-auto pb-6">
            <div className="flex items-center justify-between px-2">
              <ShareButton variant="pill" label="Share Page" />
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setCommandMenuOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 flex items-center gap-1.5"
              >
                <Search className="w-3 h-3 text-zinc-400" />
                <span>Search (⌘K)</span>
              </button>
            </div>

            {navMenus.map((group) => (
              <div key={group.id} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center justify-between">
                  <span>{group.label}</span>
                  {group.badge && (
                    <span className="text-emerald-400 text-[9px]">{group.badge}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                          isActive
                            ? 'bg-indigo-600/30 text-indigo-200 font-bold border border-indigo-500/40'
                            : 'text-zinc-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                        <span className="flex-1 truncate">{item.title}</span>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 text-zinc-300 font-mono">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </header>
    </>
  );
}
