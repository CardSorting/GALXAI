'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLinkStatus } from 'next/link';
import { IntentLink as Link } from '@/components/common/IntentLink';
import { useAuth } from '@/contexts/AuthContext';
import { GalxGalaxyLogo } from '@/components/brand/GalxGalaxyLogo';
import { BILLING_PATHS } from '@/lib/billing/navigation';
import { authEntryPath } from '@/lib/auth/redirects';
import { isPublicReadingPath } from '@/lib/public-content/routes';
import { FreeGenerationQuota } from './FreeGenerationQuota';
import { CommandMenu } from '@/components/common/CommandMenu';
import styles from './navigation.module.css';
import {
  ChevronDown,
  Search,
  Sparkles,
  Layout,
  Cpu,
  Terminal,
  Code2,
  Key,
  Sliders,
  DollarSign,
  CreditCard,
  Zap,
  ShieldCheck,
  FileText,
  BookOpen,
  HelpCircle,
  Shield,
  Activity,
  Building2,
  User,
  LogOut,
  Compass,
  ArrowRight,
  Menu,
  X
} from 'lucide-react';

const isProductRoute = (pathname: string) =>
  pathname === '/' ||
  /^\/images(?:\/|$)/.test(pathname) ||
  /^\/sites(?:\/|$)/.test(pathname) ||
  isPublicReadingPath(pathname);

function NavigationFeedback({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return (
    <>
      <span className={styles.pending} data-pending={pending} aria-hidden="true" />
      <span className="sr-only" role="status">
        {pending ? `Opening ${label}…` : ''}
      </span>
    </>
  );
}

/** Keep the product header mounted while the page or its loading boundary changes. */
export function ProductNavigation() {
  const pathname = usePathname();
  return isProductRoute(pathname) ? <Navigation inLayout /> : null;
}

export function Navigation({ inLayout = false }: { inLayout?: boolean } = {}) {
  const { user, isLoading, logout, status, retrySession } = useAuth();
  const [checking, startChecking] = useTransition();
  const pathname = usePathname();
  const router = useRouter();

  // Navigation Dropdown & Menu State
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [osShortcut, setOsShortcut] = useState('⌘K');

  const navRef = useRef<HTMLElement>(null);
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // OS detection for keyboard shortcut
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      setOsShortcut(isMac ? '⌘K' : 'Ctrl+K');
    }
  }, []);

  // Global Command Menu Listeners
  useEffect(() => {
    const handleOpenCommand = () => setIsCommandOpen(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setActiveDropdown(null);
        setIsAccountOpen(false);
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('open-command-menu', handleOpenCommand);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('open-command-menu', handleOpenCommand);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setActiveDropdown(null);
    setIsAccountOpen(false);
    setIsMobileOpen(false);
  }, [pathname]);

  // Handle outside click to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
        setIsAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDropdownEnter = (menuKey: string) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setActiveDropdown(menuKey);
  };

  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  // Legacy error/not-found surfaces can still include Navigation themselves.
  if (!inLayout && isProductRoute(pathname)) return null;
  const returnTo = pathname === '/' ? '/sites' : pathname;

  return (
    <>
      <header ref={navRef} className={styles.header}>
        <div className={styles.glowLine} />
        <div className={styles.inner}>
          {/* Brand Logo & Tag */}
          <div className={styles.brandWrapper}>
            <Link href="/" aria-label="GALX home" className={styles.brand}>
              <GalxGalaxyLogo size={28} textClassName="text-xl font-bold tracking-tight text-white" />
            </Link>
            <span className={styles.versionBadge}>
              <Sparkles size={11} className="text-indigo-400" />
              <span>v1.2</span>
            </span>
          </div>

          {/* Desktop Navigation Links & Mega Dropdowns */}
          <nav aria-label="Main navigation" className={styles.desktopNav}>
            {/* 1. Platform Mega Menu */}
            <div
              className={styles.navItem}
              onMouseEnter={() => handleDropdownEnter('platform')}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                type="button"
                className={styles.navButton}
                aria-expanded={activeDropdown === 'platform'}
                aria-haspopup="true"
                onClick={() => setActiveDropdown(activeDropdown === 'platform' ? null : 'platform')}
              >
                <span>Platform</span>
                <ChevronDown size={14} className={styles.navChevron} />
              </button>

              {activeDropdown === 'platform' && (
                <div className={styles.flyoutMenu} role="menu">
                  <div className={styles.flyoutGrid}>
                    <Link href="/sites" className={styles.flyoutItem} role="menuitem">
                      <div className={`${styles.iconBox} ${styles.iconIndigo}`}>
                        <Layout size={18} />
                      </div>
                      <div className={styles.flyoutContent}>
                        <div className={styles.flyoutTitle}>
                          Sites Engine
                          <span className={styles.badgeMini}>Unlimited</span>
                        </div>
                        <span className={styles.flyoutDesc}>
                          Real-time AI website builder with deterministic unlimited revisions.
                        </span>
                      </div>
                    </Link>

                    <Link href="/images" className={styles.flyoutItem} role="menuitem">
                      <div className={`${styles.iconBox} ${styles.iconSky}`}>
                        <Sparkles size={18} />
                      </div>
                      <div className={styles.flyoutContent}>
                        <div className={styles.flyoutTitle}>Images Studio</div>
                        <span className={styles.flyoutDesc}>
                          Instant generative diffusion canvas & high-res prompt-to-pixel engine.
                        </span>
                      </div>
                    </Link>

                    <Link href="/models" className={styles.flyoutItem} role="menuitem">
                      <div className={`${styles.iconBox} ${styles.iconEmerald}`}>
                        <Cpu size={18} />
                      </div>
                      <div className={styles.flyoutContent}>
                        <div className={styles.flyoutTitle}>Frontier Model Arena</div>
                        <span className={styles.flyoutDesc}>
                          GPT-6 Astra, GPT-5.6 Sol, Terra, Luna & GPT-5.5 arena.
                        </span>
                      </div>
                    </Link>

                    <Link href="/playground" className={styles.flyoutItem} role="menuitem">
                      <div className={`${styles.iconBox} ${styles.iconAmber}`}>
                        <Terminal size={18} />
                      </div>
                      <div className={styles.flyoutContent}>
                        <div className={styles.flyoutTitle}>Interactive Playground</div>
                        <span className={styles.flyoutDesc}>
                          Live streaming inference sandbox with parameter controls.
                        </span>
                      </div>
                    </Link>
                  </div>

                  <div className={styles.flyoutFooter}>
                    <Link href="/library" className={styles.flyoutBanner} role="menuitem">
                      <div className="flex items-center gap-2">
                        <Compass size={14} className="text-indigo-400" />
                        <span>Visual Archetype & Design Library</span>
                      </div>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Developers Mega Menu */}
            <div
              className={styles.navItem}
              onMouseEnter={() => handleDropdownEnter('developers')}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                type="button"
                className={styles.navButton}
                aria-expanded={activeDropdown === 'developers'}
                aria-haspopup="true"
                onClick={() => setActiveDropdown(activeDropdown === 'developers' ? null : 'developers')}
              >
                <span>Developers</span>
                <ChevronDown size={14} className={styles.navChevron} />
              </button>

              {activeDropdown === 'developers' && (
                <div className={styles.flyoutMenu} role="menu">
                  <div className={styles.flyoutGrid}>
                    <Link href="/developers" className={styles.flyoutItem} role="menuitem">
                      <div className={`${styles.iconBox} ${styles.iconIndigo}`}>
                        <Code2 size={18} />
                      </div>
                      <div className={styles.flyoutContent}>
                        <div className={styles.flyoutTitle}>
                          Developer Hub
                          <span className={styles.badgeMini}>$10 Tier</span>
                        </div>
                        <span className={styles.flyoutDesc}>
                          Instant unlock, zero waitlist, pay-as-you-go OpenAI SDK drop-in.
                        </span>
                      </div>
                    </Link>

                    <Link href="/developers/pricing" className={styles.flyoutItem} role="menuitem">
                      <div className={`${styles.iconBox} ${styles.iconSky}`}>
                        <DollarSign size={18} />
                      </div>
                      <div className={styles.flyoutContent}>
                        <div className={styles.flyoutTitle}>Compute Rates & Catalog</div>
                        <span className={styles.flyoutDesc}>
                          Wholesale token rates, prompt cache discounts & live cost estimator.
                        </span>
                      </div>
                    </Link>

                    <Link href="/keys" className={styles.flyoutItem} role="menuitem">
                      <div className={`${styles.iconBox} ${styles.iconEmerald}`}>
                        <Key size={18} />
                      </div>
                      <div className={styles.flyoutContent}>
                        <div className={styles.flyoutTitle}>API Key Management</div>
                        <span className={styles.flyoutDesc}>
                          Create, rotate, and manage granular project secret keys.
                        </span>
                      </div>
                    </Link>

                    <Link href="/tools" className={styles.flyoutItem} role="menuitem">
                      <div className={`${styles.iconBox} ${styles.iconPurple}`}>
                        <Sliders size={18} />
                      </div>
                      <div className={styles.flyoutContent}>
                        <div className={styles.flyoutTitle}>Developer Tools</div>
                        <span className={styles.flyoutDesc}>
                          15+ utilities: Token counter, prompt compressor, schema generator.
                        </span>
                      </div>
                    </Link>
                  </div>

                  <div className={styles.flyoutFooter}>
                    <Link href="/developers/pricing" className={styles.flyoutBanner} role="menuitem">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-amber-400" />
                        <span>$10 Developer Tier: $20 Usable Compute Credit + Instant API Keys</span>
                      </div>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Pricing Menu */}
            <div
              className={styles.navItem}
              onMouseEnter={() => handleDropdownEnter('pricing')}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                type="button"
                className={styles.navButton}
                aria-expanded={activeDropdown === 'pricing'}
                aria-haspopup="true"
                onClick={() => setActiveDropdown(activeDropdown === 'pricing' ? null : 'pricing')}
              >
                <span>Pricing</span>
                <ChevronDown size={14} className={styles.navChevron} />
              </button>

              {activeDropdown === 'pricing' && (
                <div className={`${styles.flyoutMenu} ${styles.flyoutMenuNarrow}`} role="menu">
                  <div className={styles.flyoutGridSingle}>
                    <Link href="/pricing" className={styles.flyoutItem} role="menuitem">
                      <div className={`${styles.iconBox} ${styles.iconIndigo}`}>
                        <CreditCard size={18} />
                      </div>
                      <div className={styles.flyoutContent}>
                        <div className={styles.flyoutTitle}>Pricing Overview</div>
                        <span className={styles.flyoutDesc}>
                          Compare Free, Pro ($200/mo unlimited revisions), and Developer compute.
                        </span>
                      </div>
                    </Link>

                    <Link href="/developers/pricing" className={styles.flyoutItem} role="menuitem">
                      <div className={`${styles.iconBox} ${styles.iconSky}`}>
                        <Zap size={18} />
                      </div>
                      <div className={styles.flyoutContent}>
                        <div className={styles.flyoutTitle}>
                          Developer Compute Tiers
                          <span className={styles.badgeMini}>New</span>
                        </div>
                        <span className={styles.flyoutDesc}>
                          $10 Developer Tier to $500 Hyperscale pay-as-you-go packages.
                        </span>
                      </div>
                    </Link>

                    <Link href="/pricing/galx-pro" className={styles.flyoutItem} role="menuitem">
                      <div className={`${styles.iconBox} ${styles.iconAmber}`}>
                        <ShieldCheck size={18} />
                      </div>
                      <div className={styles.flyoutContent}>
                        <div className={styles.flyoutTitle}>GALX Pro ($200/mo)</div>
                        <span className={styles.flyoutDesc}>
                          Truly unlimited revisions, priority queues & enterprise generation.
                        </span>
                      </div>
                    </Link>

                    <Link href="/pricing/fair-use" className={styles.flyoutItem} role="menuitem">
                      <div className={`${styles.iconBox} ${styles.iconPurple}`}>
                        <FileText size={18} />
                      </div>
                      <div className={styles.flyoutContent}>
                        <div className={styles.flyoutTitle}>Fair Use & SLAs</div>
                        <span className={styles.flyoutDesc}>
                          100% transparent billing, refund policy & revision guidelines.
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Resources Menu */}
            <div
              className={styles.navItem}
              onMouseEnter={() => handleDropdownEnter('resources')}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                type="button"
                className={styles.navButton}
                aria-expanded={activeDropdown === 'resources'}
                aria-haspopup="true"
                onClick={() => setActiveDropdown(activeDropdown === 'resources' ? null : 'resources')}
              >
                <span>Resources</span>
                <ChevronDown size={14} className={styles.navChevron} />
              </button>

              {activeDropdown === 'resources' && (
                <div className={`${styles.flyoutMenu} ${styles.flyoutMenuNarrow}`} role="menu">
                  <div className={styles.flyoutGridSingle}>
                    <Link href="/knowledge-base" className={styles.flyoutItem} role="menuitem">
                      <div className={`${styles.iconBox} ${styles.iconIndigo}`}>
                        <BookOpen size={18} />
                      </div>
                      <div className={styles.flyoutContent}>
                        <div className={styles.flyoutTitle}>Knowledge Base</div>
                        <span className={styles.flyoutDesc}>
                          Comprehensive architecture, revision workflows & quickstarts.
                        </span>
                      </div>
                    </Link>

                    <Link href="/faq" className={styles.flyoutItem} role="menuitem">
                      <div className={`${styles.iconBox} ${styles.iconSky}`}>
                        <HelpCircle size={18} />
                      </div>
                      <div className={styles.flyoutContent}>
                        <div className={styles.flyoutTitle}>Frequently Asked Questions</div>
                        <span className={styles.flyoutDesc}>
                          Answers about unlimited revisions, token billing & developer access.
                        </span>
                      </div>
                    </Link>

                    <Link href="/security" className={styles.flyoutItem} role="menuitem">
                      <div className={`${styles.iconBox} ${styles.iconEmerald}`}>
                        <Shield size={18} />
                      </div>
                      <div className={styles.flyoutContent}>
                        <div className={styles.flyoutTitle}>Security & Compliance</div>
                        <span className={styles.flyoutDesc}>
                          PCI DSS, EU AI Act, FedRAMP readiness & zero-retention guarantee.
                        </span>
                      </div>
                    </Link>

                    <Link href="/status" className={styles.flyoutItem} role="menuitem">
                      <div className={`${styles.iconBox} ${styles.iconAmber}`}>
                        <Activity size={18} />
                      </div>
                      <div className={styles.flyoutContent}>
                        <div className={styles.flyoutTitle}>System Status</div>
                        <span className={styles.flyoutDesc}>
                          Real-time 99.99% uptime, API SLOs & live incident monitoring.
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Quick Search Trigger Pill (⌘K) */}
          <button
            type="button"
            className={styles.searchTrigger}
            onClick={() => setIsCommandOpen(true)}
            aria-label="Search navigation, models, and docs"
          >
            <Search size={14} className="text-zinc-400" />
            <span>Search or jump to...</span>
            <kbd className={styles.searchKbd}>{osShortcut}</kbd>
          </button>

          {/* Right Action Cluster (Quota, Account & Mobile Toggle) */}
          <div className={styles.actionsRight}>
            {/* Mobile Search Icon Button */}
            <button
              type="button"
              className={styles.searchIconMobile}
              onClick={() => setIsCommandOpen(true)}
              aria-label="Open search palette"
            >
              <Search size={18} />
            </button>

            {/* Quota / Credit Status Indicator */}
            <FreeGenerationQuota />

            {/* Authenticated Account Menu vs Unauthenticated CTA */}
            {user ? (
              <div className={styles.accountWrapper}>
                <button
                  type="button"
                  className={styles.userButton}
                  onClick={() => setIsAccountOpen((prev) => !prev)}
                  aria-expanded={isAccountOpen}
                  aria-haspopup="true"
                >
                  <div className={styles.avatarCircle}>
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline text-xs font-medium max-w-[100px] truncate text-zinc-200">
                    {user.email ? user.email.split('@')[0] : 'Account'}
                  </span>
                  <ChevronDown size={13} className="text-zinc-400" />
                </button>

                {isAccountOpen && (
                  <div className={styles.accountDropdown} role="menu">
                    <div className={styles.accountUserHeader}>
                      <div className="text-xs font-semibold text-white">Signed in as</div>
                      <div className={styles.accountEmail}>{user.email || 'Builder'}</div>
                    </div>

                    <Link
                      href={BILLING_PATHS.overview}
                      className={styles.accountLinkItem}
                      role="menuitem"
                      onClick={() => setIsAccountOpen(false)}
                    >
                      <User size={14} className="text-indigo-400" />
                      <span>Account & Usage</span>
                    </Link>

                    <Link
                      href="/keys"
                      className={styles.accountLinkItem}
                      role="menuitem"
                      onClick={() => setIsAccountOpen(false)}
                    >
                      <Key size={14} className="text-emerald-400" />
                      <span>API Secret Keys</span>
                    </Link>

                    <Link
                      href={BILLING_PATHS.invoices}
                      className={styles.accountLinkItem}
                      role="menuitem"
                      onClick={() => setIsAccountOpen(false)}
                    >
                      <CreditCard size={14} className="text-sky-400" />
                      <span>Billing & Invoices</span>
                    </Link>

                    <Link
                      href="/settings"
                      className={styles.accountLinkItem}
                      role="menuitem"
                      onClick={() => setIsAccountOpen(false)}
                    >
                      <Sliders size={14} className="text-zinc-400" />
                      <span>Settings & Preferences</span>
                    </Link>

                    <div className={styles.accountDivider} />

                    <button
                      type="button"
                      className={`${styles.accountLinkItem} ${styles.accountSignOut}`}
                      role="menuitem"
                      onClick={() => {
                        setIsAccountOpen(false);
                        void logout();
                      }}
                    >
                      <LogOut size={14} />
                      <span>Sign out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : status === 'unavailable' ? (
              <button
                type="button"
                className={styles.signIn}
                disabled={checking}
                onClick={() =>
                  startChecking(async () => {
                    await retrySession();
                  })
                }
              >
                {checking ? 'Checking…' : 'Retry'}
              </button>
            ) : isLoading ? (
              <div className={styles.accountPlaceholder} role="status" aria-label="Loading account" />
            ) : (
              <div className="flex items-center gap-2">
                <Link href={authEntryPath(returnTo)} className={styles.signIn}>
                  Sign in
                </Link>
                <Link href="/developers/pricing" className={styles.ctaDeveloper}>
                  <Sparkles size={13} />
                  <span>Developer Tier</span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Drawer Trigger */}
            <button
              type="button"
              className={styles.mobileToggle}
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open mobile navigation"
              aria-expanded={isMobileOpen}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Global Command Palette Integration */}
      <CommandMenu isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />

      {/* Responsive Mobile Drawer */}
      {isMobileOpen && (
        <div className={styles.mobileOverlay} onClick={() => setIsMobileOpen(false)}>
          <div
            className={styles.mobileDrawer}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            <div className={styles.drawerHeader}>
              <Link href="/" className="flex items-center gap-2" onClick={() => setIsMobileOpen(false)}>
                <GalxGalaxyLogo size={24} textClassName="text-lg font-bold text-white" />
              </Link>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* Quick Search Button */}
              <button
                type="button"
                className="flex items-center justify-between w-full p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-sm"
                onClick={() => {
                  setIsMobileOpen(false);
                  setIsCommandOpen(true);
                }}
              >
                <div className="flex items-center gap-2">
                  <Search size={16} className="text-zinc-400" />
                  <span>Search anything...</span>
                </div>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono text-zinc-400">⌘K</kbd>
              </button>

              {/* Platform Category */}
              <div>
                <div className={styles.drawerSectionTitle}>Platform</div>
                <div className={styles.drawerList}>
                  <Link href="/sites" className={styles.drawerLink} onClick={() => setIsMobileOpen(false)}>
                    <Layout size={16} className="text-indigo-400" />
                    <span>Sites (Unlimited Revisions)</span>
                  </Link>
                  <Link href="/images" className={styles.drawerLink} onClick={() => setIsMobileOpen(false)}>
                    <Sparkles size={16} className="text-sky-400" />
                    <span>Images Canvas</span>
                  </Link>
                  <Link href="/models" className={styles.drawerLink} onClick={() => setIsMobileOpen(false)}>
                    <Cpu size={16} className="text-emerald-400" />
                    <span>Frontier Models Arena</span>
                  </Link>
                  <Link href="/playground" className={styles.drawerLink} onClick={() => setIsMobileOpen(false)}>
                    <Terminal size={16} className="text-amber-400" />
                    <span>Interactive Playground</span>
                  </Link>
                </div>
              </div>

              {/* Developers Category */}
              <div>
                <div className={styles.drawerSectionTitle}>Developers</div>
                <div className={styles.drawerList}>
                  <Link href="/developers" className={styles.drawerLink} onClick={() => setIsMobileOpen(false)}>
                    <Code2 size={16} className="text-indigo-400" />
                    <span>Developer Hub ($10 Unlock)</span>
                  </Link>
                  <Link href="/developers/pricing" className={styles.drawerLink} onClick={() => setIsMobileOpen(false)}>
                    <DollarSign size={16} className="text-sky-400" />
                    <span>Wholesale Pricing & Catalog</span>
                  </Link>
                  <Link href="/keys" className={styles.drawerLink} onClick={() => setIsMobileOpen(false)}>
                    <Key size={16} className="text-emerald-400" />
                    <span>API Secret Keys</span>
                  </Link>
                  <Link href="/tools" className={styles.drawerLink} onClick={() => setIsMobileOpen(false)}>
                    <Sliders size={16} className="text-purple-400" />
                    <span>Developer Utilities</span>
                  </Link>
                </div>
              </div>

              {/* Pricing & Resources */}
              <div>
                <div className={styles.drawerSectionTitle}>Pricing & Resources</div>
                <div className={styles.drawerList}>
                  <Link href="/pricing" className={styles.drawerLink} onClick={() => setIsMobileOpen(false)}>
                    <CreditCard size={16} className="text-indigo-400" />
                    <span>Pricing Plans Overview</span>
                  </Link>
                  <Link href="/knowledge-base" className={styles.drawerLink} onClick={() => setIsMobileOpen(false)}>
                    <BookOpen size={16} className="text-sky-400" />
                    <span>Knowledge Base</span>
                  </Link>
                  <Link href="/faq" className={styles.drawerLink} onClick={() => setIsMobileOpen(false)}>
                    <HelpCircle size={16} className="text-amber-400" />
                    <span>Frequently Asked Questions</span>
                  </Link>
                  <Link href="/status" className={styles.drawerLink} onClick={() => setIsMobileOpen(false)}>
                    <Activity size={16} className="text-emerald-400" />
                    <span>System Status & SLOs</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Mobile Footer Actions */}
            <div className={styles.drawerFooter}>
              {user ? (
                <div className="flex flex-col gap-2">
                  <div className="px-2 text-xs text-zinc-400">Signed in as {user.email}</div>
                  <Link
                    href={BILLING_PATHS.overview}
                    className="flex items-center justify-center p-2.5 rounded-xl bg-white/10 text-white font-medium text-sm"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    Account Dashboard
                  </Link>
                  <button
                    type="button"
                    className="flex items-center justify-center p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-medium"
                    onClick={() => {
                      setIsMobileOpen(false);
                      void logout();
                    }}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/developers/pricing"
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white font-semibold text-sm shadow-lg"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Sparkles size={15} />
                    <span>Get Developer Tier ($10)</span>
                  </Link>
                  <Link
                    href={authEntryPath(returnTo)}
                    className="flex items-center justify-center p-2.5 rounded-xl border border-white/15 text-zinc-200 font-medium text-sm hover:bg-white/5"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
