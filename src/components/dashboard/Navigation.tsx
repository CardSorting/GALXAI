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
  User,
  Key,
  Sliders,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const isProductRoute = (pathname: string) =>
  pathname === '/' ||
  /^\/images(?:\/|$)/.test(pathname) ||
  /^\/explore(?:\/|$)/.test(pathname) ||
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [osShortcut, setOsShortcut] = useState('⌘K');

  const navRef = useRef<HTMLElement>(null);

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
    setIsAccountOpen(false);
    setIsMobileOpen(false);
  }, [pathname]);

  // Handle outside click to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Legacy error/not-found surfaces can still include Navigation themselves.
  if (!inLayout && isProductRoute(pathname)) return null;
  const returnTo = pathname === '/' ? '/images' : pathname;

  const isImageActive = pathname === '/images' || pathname.startsWith('/images/');
  const isExploreActive = pathname === '/explore' || pathname.startsWith('/explore/');
  const isPricingActive = pathname === '/pricing' || pathname.startsWith('/pricing/');
  const isDeveloperActive = pathname === '/developers' || pathname.startsWith('/developers/');

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

          {/* Desktop Navigation Links */}
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
              href="/developers"
              className={styles.navLink}
              aria-current={isDeveloperActive ? 'page' : undefined}
            >
              <span>Developer</span>
              <NavigationFeedback label="Developer" />
            </Link>
          </nav>

          {/* Quick Search Trigger Pill (⌘K) */}
          <button
            type="button"
            className={styles.searchTrigger}
            onClick={() => setIsCommandOpen(true)}
            aria-label="Search navigation, creations, and docs"
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
                <Link href="/developers" className={styles.ctaDeveloper}>
                  <Sparkles size={13} />
                  <span>Developer</span>
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

              {/* Minimalist Navigation */}
              <div>
                <div className={styles.drawerSectionTitle}>Navigation</div>
                <div className={styles.drawerList}>
                  <Link
                    href="/images"
                    className={styles.drawerLink}
                    aria-current={isImageActive ? 'page' : undefined}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Sparkles size={18} className="text-sky-400" />
                    <span>Images</span>
                  </Link>
                  <Link
                    href="/explore"
                    className={styles.drawerLink}
                    aria-current={isExploreActive ? 'page' : undefined}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Compass size={18} className="text-indigo-400" />
                    <span>Explore</span>
                  </Link>
                  <Link
                    href="/pricing"
                    className={styles.drawerLink}
                    aria-current={isPricingActive ? 'page' : undefined}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <CreditCard size={18} className="text-emerald-400" />
                    <span>Pricing</span>
                  </Link>
                  <Link
                    href="/developers"
                    className={styles.drawerLink}
                    aria-current={isDeveloperActive ? 'page' : undefined}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Sparkles size={18} className="text-purple-400" />
                    <span>Developer</span>
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
                    href="/developers"
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white font-semibold text-sm shadow-lg"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Sparkles size={15} />
                    <span>Explore Developer</span>
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
