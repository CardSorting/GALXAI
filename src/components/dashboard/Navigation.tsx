'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { usePathname } from 'next/navigation';
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
  Compass,
  CreditCard,
  FileText,
  BookOpen,
  HelpCircle,
  KeyRound,
  Activity,
  User,
  Sliders,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const isProductRoute = (pathname: string) =>
  pathname === '/' ||
  /^\/images(?:\/|$)/.test(pathname) ||
  /^\/explore(?:\/|$)/.test(pathname) ||
  /^\/profile\/[a-z0-9][a-z0-9_-]{2,31}$/.test(pathname) ||
  pathname === '/developers' ||
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

  // Navigation State
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [osShortcut, setOsShortcut] = useState('⌘K');

  const navRef = useRef<HTMLElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const accountToggleRef = useRef<HTMLButtonElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  // OS detection for keyboard shortcut
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || '';
      const isMac = platform.toUpperCase().indexOf('MAC') >= 0;
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
        const wasAccountOpen = isAccountOpen;
        const wasMoreOpen = isMoreOpen;
        setIsAccountOpen(false);
        setIsMoreOpen(false);
        if (isMobileOpen) {
          setIsMobileOpen(false);
          requestAnimationFrame(() => mobileToggleRef.current?.focus());
        } else if (wasAccountOpen) {
          requestAnimationFrame(() => accountToggleRef.current?.focus());
        } else if (wasMoreOpen) {
          requestAnimationFrame(() => moreButtonRef.current?.focus());
        }
      }
    };

    window.addEventListener('open-command-menu', handleOpenCommand);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('open-command-menu', handleOpenCommand);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountOpen, isMobileOpen, isMoreOpen]);

  // Close menus on route change
  useEffect(() => {
    setIsAccountOpen(false);
    setIsMoreOpen(false);
    setIsMobileOpen(false);
  }, [pathname]);

  // Handle outside click to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsAccountOpen(false);
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // A drawer should own the viewport while open and return focus to its trigger when closed.
  useEffect(() => {
    if (!isMobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => drawerCloseRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileOpen]);

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
    requestAnimationFrame(() => mobileToggleRef.current?.focus());
  };

  const handleMobileDrawerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMobileMenu();
      return;
    }

    if (event.key !== 'Tab' || !drawerRef.current) return;
    const focusable = Array.from(
      drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleMoreMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')
    );
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsMoreOpen(false);
      requestAnimationFrame(() => moreButtonRef.current?.focus());
      return;
    }

    if (!items.length || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : event.key === 'ArrowDown'
          ? (currentIndex + 1 + items.length) % items.length
          : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  // Legacy error/not-found surfaces can still include Navigation themselves.
  if (!inLayout && isProductRoute(pathname)) return null;
  const returnTo = pathname === '/' ? '/images' : pathname;

  const isImageActive = pathname === '/images' || pathname.startsWith('/images/');
  const isExploreActive = pathname === '/explore' || pathname.startsWith('/explore/') || pathname.startsWith('/profile/');
  const isPricingActive = pathname === '/pricing' || pathname.startsWith('/pricing/');
  const isDocsActive = pathname === '/docs' || pathname.startsWith('/docs/');
  const isMoreActive = isDocsActive || pathname.startsWith('/knowledge-base') || pathname === '/faq' || pathname === '/developers' || pathname === '/status';

  return (
    <>
      <header ref={navRef} className={styles.header}>
        <div className={styles.glowLine} />
        <div className={styles.inner}>
          {/* Brand Logo */}
          <div className={styles.brandWrapper}>
            <Link href="/" aria-label="GALX home" className={styles.brand}>
              <GalxGalaxyLogo size={28} textClassName="text-xl font-bold tracking-tight text-white" />
            </Link>
          </div>

          {/* Primary navigation: direct destinations first, grouped resources second. */}
          <nav aria-label="Main navigation" className={styles.desktopNav}>
            <Link
              href="/images"
              className={styles.navLink}
              aria-current={isImageActive ? 'page' : undefined}
            >
              <span>Images</span>
              <NavigationFeedback label="Images" />
            </Link>

            <Link
              href="/explore"
              className={styles.navLink}
              aria-current={isExploreActive ? 'page' : undefined}
            >
              <span>Explore</span>
              <NavigationFeedback label="Explore" />
            </Link>

            <Link
              href="/pricing"
              className={styles.navLink}
              aria-current={isPricingActive ? 'page' : undefined}
            >
              <span>Pricing</span>
              <NavigationFeedback label="Pricing" />
            </Link>

            <Link
              href="/docs"
              className={styles.navLink}
              aria-current={isDocsActive ? 'page' : undefined}
            >
              <span>Docs</span>
              <NavigationFeedback label="Docs" />
            </Link>

            <div className={styles.moreWrapper}>
              <button
                type="button"
                ref={moreButtonRef}
                className={`${styles.navLink} ${styles.moreButton}`}
                onClick={() => {
                  setIsAccountOpen(false);
                  setIsMoreOpen((prev) => !prev);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setIsMoreOpen(true);
                    requestAnimationFrame(() => document.getElementById('navigation-more-first-link')?.focus());
                  }
                }}
                aria-expanded={isMoreOpen}
                aria-haspopup="menu"
                aria-controls="navigation-more-menu"
                data-active={isMoreActive || undefined}
              >
                <span>More</span>
                <ChevronDown size={13} aria-hidden="true" />
              </button>

              {isMoreOpen && (
                <div id="navigation-more-menu" className={styles.moreMenu} role="menu" aria-label="More navigation" onKeyDown={handleMoreMenuKeyDown}>
                  <div className={styles.moreMenuLabel}>Resources & access</div>
                  <div className={styles.moreMenuList}>
                    <Link
                      id="navigation-more-first-link"
                      href="/knowledge-base"
                      className={styles.moreMenuItem}
                      role="menuitem"
                      onClick={() => setIsMoreOpen(false)}
                    >
                      <BookOpen size={16} aria-hidden="true" />
                      <span><strong>Knowledge base</strong><small>Guides for getting more from GALX</small></span>
                    </Link>
                    <Link
                      href="/faq"
                      className={styles.moreMenuItem}
                      role="menuitem"
                      onClick={() => setIsMoreOpen(false)}
                    >
                      <HelpCircle size={16} aria-hidden="true" />
                      <span><strong>FAQ</strong><small>Answers about products and plans</small></span>
                    </Link>
                    <Link
                      href="/developers"
                      className={styles.moreMenuItem}
                      role="menuitem"
                      onClick={() => setIsMoreOpen(false)}
                    >
                      <KeyRound size={16} aria-hidden="true" />
                      <span><strong>Private access</strong><small>How explicitly authorized integrations work</small></span>
                    </Link>
                    <Link
                      href="/status"
                      className={styles.moreMenuItem}
                      role="menuitem"
                      onClick={() => setIsMoreOpen(false)}
                    >
                      <Activity size={16} aria-hidden="true" />
                      <span><strong>System status</strong><small>Current service availability</small></span>
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
            aria-label="Search navigation, creations, and docs"
            aria-haspopup="dialog"
          >
            <Search size={14} className="text-zinc-400" />
            <span>Search or jump to…</span>
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
                  ref={accountToggleRef}
                  type="button"
                  className={styles.userButton}
                  onClick={() => {
                    setIsMoreOpen(false);
                    setIsAccountOpen((prev) => !prev);
                  }}
                  aria-expanded={isAccountOpen}
                  aria-haspopup="menu"
                  aria-controls="account-menu"
                  aria-label={`Open account menu for ${user.email || 'your account'}`}
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
                  <div id="account-menu" className={styles.accountDropdown} role="menu" aria-label="Account menu">
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
              </div>
            )}

            {/* Mobile Hamburger Drawer Trigger */}
            <button
              ref={mobileToggleRef}
              type="button"
              className={styles.mobileToggle}
              onClick={() => setIsMobileOpen((prev) => !prev)}
              aria-label={isMobileOpen ? 'Close mobile navigation' : 'Open mobile navigation'}
              aria-expanded={isMobileOpen}
              aria-controls="mobile-navigation-drawer"
            >
              {isMobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      {/* Global Command Palette Integration */}
      <CommandMenu isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />

      {/* Responsive Mobile Drawer */}
      {isMobileOpen && (
        <div className={styles.mobileOverlay} onClick={closeMobileMenu}>
          <div
            id="mobile-navigation-drawer"
            ref={drawerRef}
            className={styles.mobileDrawer}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleMobileDrawerKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-navigation-title"
          >
            <div className={styles.drawerHeader}>
              <Link href="/" className="flex items-center gap-2" onClick={closeMobileMenu}>
                <GalxGalaxyLogo size={24} textClassName="text-lg font-bold text-white" />
              </Link>
              <h2 id="mobile-navigation-title" className="sr-only">GALX navigation</h2>
              <button
                ref={drawerCloseRef}
                type="button"
                className={styles.drawerClose}
                onClick={closeMobileMenu}
                aria-label="Close navigation"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* Quick Search Button */}
              <button
                type="button"
                className={styles.drawerSearch}
                onClick={() => {
                  closeMobileMenu();
                  setIsCommandOpen(true);
                }}
              >
                <div className="flex items-center gap-2">
                  <Search size={16} aria-hidden="true" />
                  <span>Search or jump to…</span>
                </div>
                <kbd className={styles.drawerKbd}>{osShortcut}</kbd>
              </button>

              <nav aria-label="Mobile navigation" className={styles.drawerNavigation}>
                <div>
                  <div className={styles.drawerSectionTitle}>Create</div>
                  <div className={styles.drawerList}>
                    <Link
                      href="/images"
                      className={styles.drawerLink}
                      aria-current={isImageActive ? 'page' : undefined}
                      onClick={closeMobileMenu}
                    >
                      <Sparkles size={18} aria-hidden="true" className="text-sky-400" />
                      <span><strong>Images</strong><small>Make and refine creations</small></span>
                    </Link>
                    <Link
                      href="/explore"
                      className={styles.drawerLink}
                      aria-current={isExploreActive ? 'page' : undefined}
                      onClick={closeMobileMenu}
                    >
                      <Compass size={18} aria-hidden="true" className="text-indigo-400" />
                      <span><strong>Explore</strong><small>See what the community is making</small></span>
                    </Link>
                  </div>
                </div>

                <div>
                  <div className={styles.drawerSectionTitle}>Learn</div>
                  <div className={styles.drawerList}>
                    <Link
                      href="/docs"
                      className={styles.drawerLink}
                      aria-current={isDocsActive ? 'page' : undefined}
                      onClick={closeMobileMenu}
                    >
                      <FileText size={18} aria-hidden="true" className="text-cyan-400" />
                      <span><strong>Docs</strong><small>Supported capabilities and guidance</small></span>
                    </Link>
                    <Link
                      href="/knowledge-base"
                      className={styles.drawerLink}
                      onClick={closeMobileMenu}
                    >
                      <BookOpen size={18} aria-hidden="true" className="text-violet-400" />
                      <span><strong>Knowledge base</strong><small>Practical help and examples</small></span>
                    </Link>
                    <Link
                      href="/faq"
                      className={styles.drawerLink}
                      onClick={closeMobileMenu}
                    >
                      <HelpCircle size={18} aria-hidden="true" className="text-amber-300" />
                      <span><strong>FAQ</strong><small>Answers to common questions</small></span>
                    </Link>
                  </div>
                </div>

                <div>
                  <div className={styles.drawerSectionTitle}>Plans & access</div>
                  <div className={styles.drawerList}>
                    <Link
                      href="/pricing"
                      className={styles.drawerLink}
                      aria-current={isPricingActive ? 'page' : undefined}
                      onClick={closeMobileMenu}
                    >
                      <CreditCard size={18} aria-hidden="true" className="text-emerald-400" />
                      <span><strong>Pricing</strong><small>Plans for GALX experiences</small></span>
                    </Link>
                    <Link
                      href="/developers"
                      className={styles.drawerLink}
                      onClick={closeMobileMenu}
                    >
                      <KeyRound size={18} aria-hidden="true" className="text-fuchsia-300" />
                      <span><strong>Private access</strong><small>Explicitly authorized integrations</small></span>
                    </Link>
                  </div>
                </div>

                <Link href="/status" className={styles.drawerStatusLink} onClick={closeMobileMenu}>
                  <Activity size={15} aria-hidden="true" />
                  <span>System status</span>
                </Link>
              </nav>
            </div>

            {/* Mobile Footer Actions */}
            <div className={styles.drawerFooter}>
              {user ? (
                <div className="flex flex-col gap-2">
                  <div className="px-2 text-xs text-zinc-400">Signed in as {user.email}</div>
                  <Link
                    href={BILLING_PATHS.overview}
                    className={styles.drawerAccountLink}
                    onClick={closeMobileMenu}
                  >
                    Account Dashboard
                  </Link>
                  <button
                    type="button"
                    className={styles.drawerSignOut}
                    onClick={() => {
                      closeMobileMenu();
                      void logout();
                    }}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href={authEntryPath(returnTo)}
                    className={styles.drawerAccountLink}
                    onClick={closeMobileMenu}
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
