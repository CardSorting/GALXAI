'use client';
import { authEntryPath } from '@/lib/auth/redirects';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { safeAuthRedirect } from '@/lib/auth/redirects';
import styles from './auth-entry.module.css';

interface AuthRequiredGateProps { title?: string; description?: string; children: React.ReactNode; }
export function AuthRequiredGate({ title = 'Sign in to continue', description = 'Sign in to access your account.', children }: AuthRequiredGateProps) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [next, setNext] = useState(safeAuthRedirect(pathname));
  useEffect(() => { setNext(safeAuthRedirect(location.pathname + location.search)); }, [pathname]);
  if (isLoading) return <div className={styles.locked}><p role="status">Checking your session…</p></div>;
  if (user) return <>{children}</>;
  return <section className={styles.locked} aria-label="Sign in required"><div className={styles.panel}>
    <div className={styles.intro}><h1>{title}</h1><p>{description}</p></div>
    <Link className={`${styles.button} ${styles.primary}`} href={authEntryPath(next)}>Sign in</Link>
    <p className={styles.signup}>New to GALX? <Link className={styles.link} href={authEntryPath(next, 'signup')}>Create an account</Link></p>
  </div></section>;
}
