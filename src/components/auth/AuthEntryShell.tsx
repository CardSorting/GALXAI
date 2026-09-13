import Link from 'next/link';
import type { ReactNode } from 'react';
import { GalxGalaxyLogo } from '@/components/brand/GalxGalaxyLogo';
import styles from './auth-entry.module.css';

export function AuthEntryShell({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>
    <header className={styles.header}>
      <Link href="/" aria-label="GALX home" className={styles.home}><GalxGalaxyLogo size={28} animate={false} /></Link>
      <Link href="/" className={styles.link}>Back to home</Link>
    </header>
    <main className={styles.main}><div className={styles.panel}>{children}</div></main>
    <footer className={styles.footer}><Link href="/terms" className={styles.link}>Terms</Link><Link href="/privacy" className={styles.link}>Privacy</Link></footer>
  </div>;
}
