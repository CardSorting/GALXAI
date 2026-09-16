'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IntentLink } from './IntentLink';
import styles from './workspace-route.module.css';

/** Authored public copy only; no raw exceptions, traces or automatic replay. */
export function RouteRecovery({ title = 'This page could not be opened', description = 'Try again in a moment, or return home.', reset, onRetry,
  busy = false, retryLabel = 'Try again', pendingLabel = 'Opening page…', failureMessage = 'This page is still unavailable. Try again in a moment.',
  secondaryHref = '/', secondaryLabel = 'Return home',
}: {
  title?: string; description?: string; reset?: () => void; onRetry?: () => Promise<void>; busy?: boolean;
  retryLabel?: string; pendingLabel?: string; failureMessage?: string;
  secondaryHref?: string; secondaryLabel?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [offline, setOffline] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const lock = useRef(false);
  const working = busy || pending;
  useEffect(() => {
    // A full recovery view is a context change. Never steal focus from active navigation.
    if (document.activeElement === document.body || document.activeElement?.id === 'main-content') heading.current?.focus({ preventScroll: true });
    const update = () => setOffline(!navigator.onLine);
    update(); window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  useEffect(() => { if (!pending) lock.current = false; }, [pending]);
  const retry = () => {
    if (lock.current || busy || !navigator.onLine) return;
    lock.current = true; setAttempted(true);
    startTransition(async () => {
      if (onRetry) { try { await onRetry(); } catch { /* Only authored failure copy is rendered. */ } }
      else { router.refresh(); reset?.(); }
    });
  };
  const message = offline ? 'Your device is offline. Reconnect to try again.' : working ? pendingLabel : attempted ? failureMessage : '';
  return <main className={styles.recovery} aria-labelledby="route-recovery-heading">
    <div className={styles.message}>
      <h1 ref={heading} tabIndex={-1} id="route-recovery-heading">{title}</h1>
      <p>{description}</p>
      <div className={styles.actions}>
        <button aria-disabled={working || offline} onClick={retry}>{working ? pendingLabel : retryLabel}</button>
        <IntentLink href={secondaryHref}>{secondaryLabel}</IntentLink>
        {secondaryHref !== '/' && <IntentLink href="/">Return home</IntentLink>}
      </div>
      <p className={styles.status} role="status" aria-live="polite" aria-atomic="true">{message}</p>
    </div>
  </main>;
}
