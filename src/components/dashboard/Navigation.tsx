'use client';
import { BILLING_PATHS } from '@/lib/billing/navigation';

import { authEntryPath } from '@/lib/auth/redirects';
import { useTransition } from 'react';
import { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { IntentLink as Link } from '@/components/common/IntentLink';
import { useAuth } from '@/contexts/AuthContext';
import { GalxGalaxyLogo } from '@/components/brand/GalxGalaxyLogo';
import { PUBLIC_NAVIGATION, isPublicReadingPath } from '@/lib/public-content/routes';
import styles from './navigation.module.css';
import { FreeGenerationQuota } from './FreeGenerationQuota';

const links = PUBLIC_NAVIGATION;
const isProductRoute = (pathname: string) => pathname === '/' || /^\/images(?:\/|$)/.test(pathname) || /^\/sites(?:\/|$)/.test(pathname) || isPublicReadingPath(pathname);

function NavigationFeedback({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return <><span className={styles.pending} data-pending={pending} aria-hidden="true" /><span className="sr-only" role="status">{pending ? `Opening ${label}…` : ''}</span></>;
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
  // Legacy error/not-found surfaces can still include Navigation themselves.
  if (!inLayout && isProductRoute(pathname)) return null;
  const returnTo = pathname === '/' ? '/sites' : pathname;

  return <header className={styles.header}>
    <div className={styles.inner}>
      <Link href="/" aria-label="GALX home" className={styles.brand}><GalxGalaxyLogo size={30} textClassName="text-xl" /></Link>
      <nav aria-label="Main navigation" className={styles.links}>
        {links.map(link => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return <Link key={link.href} href={link.href} className={styles.link} aria-current={active ? 'page' : undefined}
            onFocus={event => {
              const link = event.currentTarget;
              const nav = link.parentElement;
              if (nav && nav.scrollWidth > nav.clientWidth) link.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
            }}>{link.label}<NavigationFeedback label={link.label} /></Link>;
        })}
      </nav>
      <FreeGenerationQuota />
      <div className={styles.account} aria-busy={isLoading && !user}>
        {user ? <><Link href={BILLING_PATHS.overview} className={styles.accountLink}>Account</Link><button className={styles.accountLink} onClick={() => void logout()}>Sign out</button></>
          : status === 'unavailable' ? <button className={styles.accountLink} disabled={checking}
            onClick={() => startChecking(async () => { await retrySession(); })}>{checking ? 'Checking account…' : 'Retry account'}</button>
          : status === 'signout_failed' ? <span className={styles.accountStatus}>Sign-out incomplete</span>
          : isLoading ? <span className={styles.accountPlaceholder} role="status" aria-label="Loading account" />
          : <Link href={authEntryPath(returnTo)} className={styles.signIn}>Sign in</Link>}
      </div>
    </div>
  </header>;
}
