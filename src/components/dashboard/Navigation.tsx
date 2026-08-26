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
  Rocket,
  Users2,
  Building2,
  ShieldCheck,
  Cpu,
  Activity,
  Code2,
  Terminal,
  BookOpen,
  Sparkles,
  Coins,
  Sliders,
  DollarSign,
  Gift,
  Key,
  Shield,
  Layers,
  HelpCircle,
  PieChart,
  Lock,
  ArrowRight,
  Plus,
  UserPlus,
  Settings
} from 'lucide-react';
import { CommandMenu } from '@/components/common/CommandMenu';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDepositVerification } from '@/lib/hooks/useDepositVerification';
import { GtmPromoBanner } from '@/components/dashboard/GtmPromoBanner';
import { BroccoliOmniSearch } from '@/lib/resilience/BroccoliOmniSearch';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

interface NavDropdownItem {
  name: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  exact?: boolean;
}

interface NavCategory {
  id: string;
  label: string;
  href?: string;
  items?: NavDropdownItem[];
  footerLink?: {
    label: string;
    href: string;
  };
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'capabilities',
    label: 'Capabilities',
    items: [
      {
        name: 'Frontier AI Models & Arena',
        href: '/models',
        description: 'Explore OpenAI Codex and GPT-5.6 flagship models with wholesale pricing',
        icon: Cpu,
        badge: '6 SOTA',
        badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
      },
      {
        name: 'Async Queues & Batch Workers',
        href: '/queues',
        description: 'Fire-and-forget background AI execution with live stream telemetry',
        icon: Activity,
        badge: 'Sub-15ms',
        badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      },
      {
        name: 'Developer Shard Vaults',
        href: '/vault',
        description: 'Zero-trust multi-provider key encryption and health monitoring',
        icon: ShieldCheck,
      },
      {
        name: 'Interactive API Playground',
        href: '/playground',
        description: 'Test prompts, compare token costs, and export cURL / Python code',
        icon: Terminal,
        badge: 'No-Code',
        badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      },
      {
        name: 'Spend Audit & Savings Jackpot',
        href: '/pricing#spend-audit',
        description: 'Upload your current AI bill and calculate instant wholesale rebates',
        icon: PieChart,
        badge: 'Save 25-40%',
        badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      },
    ],
    footerLink: {
      label: 'Explore Complete Architectural Whitepaper →',
      href: '/architecture',
    },
  },
  {
    id: 'solutions',
    label: 'Solutions & Teams',
    items: [
      {
        name: 'Small Business & Squads (5 Seats)',
        href: '/solutions/small-business',
        description: '5–25 seats, shared wallets, individual spend caps, and $100 pooled credits',
        icon: Users2,
        badge: '5 Seats Included',
        badgeColor: 'bg-amber-400 text-black font-bold',
      },
      {
        name: 'Enterprise Fleet & Infrastructure',
        href: '/solutions/enterprise',
        description: 'Unlimited pooled seats, SAML 2.0 SSO, SCIM sync, and Net-30 invoice terms',
        icon: Building2,
        badge: '40% OFF',
        badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
      },
      {
        name: 'Seats & Member Governance',
        href: '/teams/seats',
        description: 'Manage seat roster, invite colleagues, and adjust capacity sliders',
        icon: Users2,
        badge: 'Roster',
        badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      },
      {
        name: 'Cost Centers & Squad Budgets',
        href: '/teams/cost-centers',
        description: 'Assign AI compute budgets across engineering squads with GL accounting',
        icon: Layers,
      },
      {
        name: 'RBAC Roles & Governance',
        href: '/teams/roles',
        description: 'Zero-trust role permissions for Owner, Admin, Developer, FinOps, Viewer',
        icon: ShieldCheck,
      },
      {
        name: 'Security, BAA & SOC 2 Compliance',
        href: '/compliance',
        description: 'Zero Data Retention (ZDR), HIPAA BAA agreements, and GDPR DPA',
        icon: Lock,
        badge: 'HIPAA/SOC2',
        badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      },
    ],
    footerLink: {
      label: 'Compare Solutions by Industry & Use Case →',
      href: '/solutions',
    },
  },
  {
    id: 'pricing',
    label: 'Pricing & Seats',
    items: [
      {
        name: 'Team & Enterprise Seat Plans',
        href: '/pricing/seats',
        description: 'Workspace plans with pooled compute credits and seat governance',
        icon: Users2,
        badge: 'Popular',
        badgeColor: 'bg-amber-400 text-black font-bold',
      },
      {
        name: 'Wholesale Token Rates Sheet',
        href: '/pricing#catalog-pricing',
        description: 'Direct wholesale rates with 0% markup and 75% prompt caching',
        icon: Coins,
        badge: '25%–40% Off',
        badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      },
      {
        name: 'Dual Seat & Compute Calculator',
        href: '/pricing/calculator',
        description: 'Simulate your exact team seat count and monthly token savings',
        icon: Sliders,
      },
      {
        name: 'Founding Builder Deposit Match',
        href: '/grants',
        description: 'Receive up to 50% instant match credits on your initial top-up',
        icon: Gift,
        badge: '+50% Match',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      },
    ],
    footerLink: {
      label: 'Read Plain-English Cost Breakdown →',
      href: '/pricing',
    },
  },
  {
    id: 'docs',
    label: 'Docs & Guides',
    items: [
      {
        name: 'Plain-English Beginner Guide',
        href: '/docs/simple',
        description: 'No-code walkthrough explaining AI compute without confusing tech jargon',
        icon: Sparkles,
        badge: 'Beginner',
        badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
      },
      {
        name: '2-Minute API Quickstart',
        href: '/docs/quickstart',
        description: 'Drop-in replacement code snippets for cURL, Python, and TypeScript',
        icon: Zap,
      },
      {
        name: 'Developer SDK Reference',
        href: '/docs',
        description: 'Official universal client libraries for Node.js, Python, and Edge runtimes',
        icon: BookOpen,
      },
      {
        name: 'Production AI Cookbooks',
        href: '/cookbook',
        description: 'Recipes for autonomous coding agents, RAG pipelines, and image generation',
        icon: Code2,
        badge: 'Recipes',
        badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
      },
    ],
    footerLink: {
      label: 'Search Complete Documentation (⌘K) →',
      href: '/docs',
    },
  },
];

function BaseNavigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { walletBalance } = useDepositVerification();

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedCat, setMobileExpandedCat] = useState<string | null>('capabilities');
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);

  const navContainerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or route change
  useEffect(() => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
    setWorkspaceDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleOpenCommand = () => setCommandMenuOpen(true);
    window.addEventListener('open-command-menu', handleOpenCommand);

    const handleClickOutside = (event: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
        setWorkspaceDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveDropdown(null);
        setWorkspaceDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-command-menu', handleOpenCommand);
      document.removeEventListener('mousedown', handleClickOutside);
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
        ref={navContainerRef}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Brand Logo & Interactive Mega-Menus */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 group cursor-pointer shrink-0 rounded-xl p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080d] transition-all"
              aria-label="GALXAI Home - Universal AI Compute Clearinghouse"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Zap className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <div className="flex items-baseline font-black tracking-tight text-base">
                <span className="text-white font-sans">GALX</span>
                <span className="text-cyan-400 font-sans">AI</span>
              </div>
            </Link>

            {/* Desktop Mega-Menu Navigation Links */}
            <nav
              role="navigation"
              aria-label="Primary Navigation"
              className="hidden md:flex items-center gap-1"
            >
              {NAV_CATEGORIES.map((cat) => {
                const isOpen = activeDropdown === cat.id;

                return (
                  <div key={cat.id} className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveDropdown(isOpen ? null : cat.id)}
                      onMouseEnter={() => setActiveDropdown(cat.id)}
                      aria-expanded={isOpen}
                      aria-haspopup="true"
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-normal transition-all duration-150 flex items-center gap-1 cursor-pointer select-none ${
                        isOpen
                          ? 'text-white bg-white/10 shadow-sm ring-1 ring-white/15'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400`}
                    >
                      <span>{cat.label}</span>
                      <ChevronDown
                        className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    </button>

                    {/* Mega-Menu Dropdown Panel */}
                    {isOpen && cat.items && (
                      <div
                        onMouseLeave={() => setActiveDropdown(null)}
                        className="absolute top-full left-0 mt-2 w-[420px] rounded-3xl p-3 bg-[#0d101c]/98 border border-white/15 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2"
                      >
                        <div className="space-y-1">
                          {cat.items.map((item) => {
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setActiveDropdown(null)}
                                className="group flex items-start gap-3 p-2.5 rounded-2xl hover:bg-white/5 transition-all text-left"
                              >
                                <div className="w-8 h-8 rounded-xl bg-white/5 group-hover:bg-amber-400/15 border border-white/10 group-hover:border-amber-400/30 flex items-center justify-center text-white group-hover:text-amber-300 shrink-0 transition-colors">
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5 flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors font-sans truncate">
                                      {item.name}
                                    </span>
                                    {item.badge && (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold border shrink-0 ${item.badgeColor || 'bg-white/10 text-zinc-300 border-white/15'}`}>
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-zinc-400 leading-snug font-sans line-clamp-2">
                                    {item.description}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>

                        {cat.footerLink && (
                          <div className="pt-2 border-t border-white/5 px-2.5 pb-1">
                            <Link
                              href={cat.footerLink.href}
                              onClick={() => setActiveDropdown(null)}
                              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold transition-colors"
                            >
                              <span>{cat.footerLink.label}</span>
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

          {/* Right: Search, Workspace Switcher, and High-Converting CTAs */}
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

            {/* Logged-In User & Interactive Workspace / Seat Switcher */}
            {user ? (
              <div className="relative" ref={workspaceRef}>
                <button
                  onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                  aria-expanded={workspaceDropdownOpen}
                  aria-haspopup="true"
                  aria-label={`Workspace menu for ${user.name}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-200 hover:text-white hover:bg-white/5 border border-white/10 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <div className="w-4 h-4 rounded-md bg-amber-400/20 text-amber-400 flex items-center justify-center font-mono font-bold text-[10px]">
                    🏢
                  </div>
                  <div className="flex flex-col items-start leading-none text-left hidden sm:flex">
                    <span className="text-[11px] font-bold text-white max-w-[100px] truncate">Acme AI Corp</span>
                    <span className="text-[10px] text-amber-300 font-mono">Small Business (6/10 Seats)</span>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${workspaceDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Workspace Switcher & Account Dropdown Menu */}
                {workspaceDropdownOpen && (
                  <div
                    role="menu"
                    aria-label="Workspace and User Options"
                    className="absolute right-0 mt-1.5 w-64 rounded-3xl border border-white/15 shadow-2xl p-2.5 space-y-2 z-50 animate-in fade-in duration-100 bg-[#0d101c]/98 backdrop-blur-2xl"
                  >
                    {/* Active Workspace Header */}
                    <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-2 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold font-sans">Acme AI Corp</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                          Small Business
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-zinc-400">
                          <span>Seat Utilization:</span>
                          <span className="text-amber-300 font-bold">6 of 10 Seats Used</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full w-[60%]" />
                        </div>
                      </div>
                    </div>

                    {/* Quick Shortcuts */}
                    <div className="space-y-0.5 font-mono text-xs">
                      <Link
                        href="/teams/seats"
                        onClick={() => setWorkspaceDropdownOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-amber-300 hover:text-white hover:bg-amber-500/10 transition-all font-bold"
                      >
                        <span className="flex items-center gap-2">
                          <Users2 className="w-3.5 h-3.5" />
                          <span>Seats &amp; Roster</span>
                        </span>
                        <span className="text-[10px] text-amber-400">→</span>
                      </Link>

                      <Link
                        href="/teams/invites"
                        onClick={() => setWorkspaceDropdownOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Pending Invites</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold">2</span>
                      </Link>

                      <Link
                        href="/teams/spend-limits"
                        onClick={() => setWorkspaceDropdownOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Spend Caps &amp; Safety</span>
                        </span>
                      </Link>

                      <Link
                        href="/teams/cost-centers"
                        onClick={() => setWorkspaceDropdownOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Cost Centers</span>
                        </span>
                      </Link>

                      <Link
                        href="/billing"
                        onClick={() => setWorkspaceDropdownOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-500/10 transition-all font-bold"
                      >
                        <span className="flex items-center gap-2">
                          <Coins className="w-3.5 h-3.5" />
                          <span>Wallet Balance</span>
                        </span>
                        <span>${walletBalance.toFixed(2)}</span>
                      </Link>

                      <Link
                        href="/teams/settings"
                        onClick={() => setWorkspaceDropdownOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <Settings className="w-3.5 h-3.5" />
                          <span>Org Settings</span>
                        </span>
                      </Link>
                    </div>

                    {/* Switch Workspace */}
                    <div className="pt-2 border-t border-white/5 space-y-1 font-mono text-xs">
                      <div className="text-[10px] text-zinc-400 px-3 uppercase font-bold">Switch Workspace</div>
                      <button
                        onClick={() => setWorkspaceDropdownOpen(false)}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 text-left transition-all"
                      >
                        <span>● Acme AI Corp</span>
                        <span className="text-[10px] text-zinc-400 font-sans">Active</span>
                      </button>
                      <button
                        onClick={() => setWorkspaceDropdownOpen(false)}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 text-left transition-all"
                      >
                        <span>○ Personal Sandbox</span>
                        <span className="text-[10px] text-zinc-400 font-sans">Solo Dev</span>
                      </button>
                      <Link
                        href="/teams/seats?action=new-org"
                        onClick={() => setWorkspaceDropdownOpen(false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-cyan-400 hover:text-cyan-300 text-[11px] font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create New Organization</span>
                      </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="pt-1 border-t border-white/5">
                      <button
                        onClick={() => {
                          setWorkspaceDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer text-left font-mono"
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
                href="/auth/connect"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {t('nav.signin', 'Sign In')}
              </Link>
            )}

            {/* Primary High-Converting Action */}
            <Link
              href="/solutions/small-business"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 text-black font-black text-xs font-sans tracking-tight shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Users2 className="w-3.5 h-3.5 text-black" />
              <span>Team Seats ($100 Credit)</span>
            </Link>

            {/* Mobile Drawer Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              className="md:hidden p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer with Categories */}
        {mobileMenuOpen && (
          <div
            role="region"
            aria-label="Mobile Navigation Menu"
            className="md:hidden mt-3 pt-3 border-t border-white/10 space-y-3 max-w-7xl mx-auto pb-4 animate-in fade-in duration-150"
          >
            {NAV_CATEGORIES.map((cat) => {
              const isExpanded = mobileExpandedCat === cat.id;

              return (
                <div key={cat.id} className="rounded-2xl bg-black/40 border border-white/5 overflow-hidden">
                  <button
                    onClick={() => setMobileExpandedCat(isExpanded ? null : cat.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-white text-left cursor-pointer"
                  >
                    <span>{cat.label}</span>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded && cat.items && (
                    <div className="px-3 pb-3 space-y-1 border-t border-white/5 pt-2">
                      {cat.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs font-medium"
                          >
                            <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="truncate">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="pt-2 space-y-2">
              <Link
                href="/solutions/small-business"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-2xl text-xs font-bold text-center bg-gradient-to-r from-amber-400 to-orange-500 text-black font-sans shadow-md"
              >
                Provision Team Seats ($100 Credit Included) →
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
          <Link href="/billing/seats" className="text-amber-300 hover:text-white transition-colors">Seats &amp; Teams</Link>
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
