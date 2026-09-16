'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './auth-entry.module.css';

/** Keep recovery beside the task; losing connectivity does not mean signing out. */
export function SessionConnectionNotice() {
  const { retrySession } = useAuth();
  const [pending, setPending] = useState(false), [offline, setOffline] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update(); window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const retry = async () => {
    if (lock.current || offline) return;
    lock.current = true; setPending(true);
    try { await retrySession(); } finally { lock.current = false; setPending(false); }
  };
  return <div className={styles.connection}>
    <p role="status">{offline ? 'You’re offline. We’ll check your account when you reconnect.' : pending ? 'Reconnecting to your account…' : 'We couldn’t reconnect to your account. You can try again.'}</p>
    <button type="button" aria-disabled={pending || offline} onClick={() => void retry()}>{pending ? 'Reconnecting…' : 'Try again'}</button>
  </div>;
}
