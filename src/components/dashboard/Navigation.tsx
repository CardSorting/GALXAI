'use client';

import { useEffect, useState } from 'react';
import { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { IntentLink as Link } from '@/components/common/IntentLink';
import { useAuth } from '@/contexts/AuthContext';
import { GalxGalaxyLogo } from '@/components/brand/GalxGalaxyLogo';
import styles from './navigation.module.css';

const links = [
  { label: 'Sites', href: '/sites' },
  { label: 'Images', href: '/images' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Developer preview', href: '/developers' },
];
const isProductRoute = (pathname: string) => pathname === '/' || pathname === '/images' || /^\/sites(?:\/|$)/.test(pathname);

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
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const [hash, setHash] = useState('');
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, [pathname]);
  // Legacy error/not-found surfaces can still include Navigation themselves.
  if (!inLayout && isProductRoute(pathname)) return null;
  const returnTo = pathname === '/' ? '/sites' : pathname;

  return <header className={styles.header}>
    <div className={styles.inner}>
      <Link href="/" aria-label="GALX home" className={styles.brand}><GalxGalaxyLogo size={30} textClassName="text-xl" /></Link>
      <nav aria-label="Main navigation" className={styles.links}>
        {links.map(link => {
          const [path, fragment] = link.href.split('#');
          const active = fragment ? pathname === path && hash === `#${fragment}` : pathname === path || pathname.startsWith(`${path}/`);
          return <Link key={link.href} href={link.href} className={styles.link} aria-current={active ? (fragment ? 'location' : 'page') : undefined}
            onFocus={event => {
              const link = event.currentTarget;
              const nav = link.parentElement;
              if (nav && nav.scrollWidth > nav.clientWidth) link.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
            }}
            onNavigate={() => setHash(fragment ? `#${fragment}` : '')}>{link.label}<NavigationFeedback label={link.label} /></Link>;
        })}
      </nav>
      <div className={styles.account} aria-busy={isLoading && !user}>
        {user ? <><Link href="/billing" className={styles.accountLink}>Account</Link><button className={styles.accountLink} onClick={() => void logout()}>Sign out</button></>
          : isLoading ? <span className={styles.accountPlaceholder} role="status" aria-label="Loading account" />
          : <Link href={`/auth/signin?next=${encodeURIComponent(returnTo)}`} className={styles.signIn}>Sign in</Link>}
      </div>
    </div>
  </header>;
}
