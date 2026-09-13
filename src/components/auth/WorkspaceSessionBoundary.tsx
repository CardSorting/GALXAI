'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { WORKSPACE_SESSION_REJECTED } from '@/lib/auth/workspace-client';
import { workspaceSignInPath } from '@/lib/security/workspace-policy';
import styles from './auth-entry.module.css';

/** Unmount account content on sign-out/401; this complements the server entry guards. */
export function WorkspaceSessionBoundary({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname(), search = useSearchParams();
  const [rejected, setRejected] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const owner = user?.id;
  useEffect(() => {
    if (!isLoading && (!user || rejected === owner)) heading.current?.focus();
  }, [isLoading, user, rejected, owner]);
  useEffect(() => {
    const reject = (event: Event) => {
      if ((event as CustomEvent).detail?.owner === owner && owner) setRejected(owner);
    };
    window.addEventListener(WORKSPACE_SESSION_REJECTED, reject);
    return () => window.removeEventListener(WORKSPACE_SESSION_REJECTED, reject);
  }, [owner]);
  if (user && rejected !== owner) return children;
  if (isLoading && !rejected) return <div className={styles.locked}><p role="status">Opening your workspace…</p></div>;
  const next = workspaceSignInPath(pathname, new URLSearchParams(search.toString()));
  return <section className={styles.locked} aria-labelledby="workspace-signin-heading"><div className={styles.panel}>
    <div className={styles.intro}><h1 ref={heading} tabIndex={-1} id="workspace-signin-heading">Sign in to continue</h1><p>Your session has ended. Sign in again to return to this workspace.</p></div>
    <a className={`${styles.button} ${styles.primary}`} href={`${next}&error=session_expired`}>Sign in again</a>
  </div></section>;
}
