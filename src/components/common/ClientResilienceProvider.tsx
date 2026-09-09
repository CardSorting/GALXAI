'use client';

import React, { useEffect, useState } from 'react';
import { BroccoliOutboxEngine } from '@/lib/resilience/BroccoliOutboxEngine';
import { BroccoliSnapshotEngine } from '@/lib/resilience/BroccoliSnapshotEngine';
import { claimChunkReload } from '@/lib/resilience/chunk-recovery';
import { RecoveryNotice } from './RecoveryNotice';

/**
 * ClientResilienceProvider
 * Global client-side unhandled exception, promise rejection, and network resilience interceptor.
 * - Prevents third-party scripts, aborted fetches, or SSE stream drops from causing hard white-screen crashes.
 * - Auto-reloads stale chunks when Next.js redeploys (ChunkLoadError recovery).
 * - Suppresses harmless browser extension DOM collision errors.
 * - Displays a non-intrusive, accessible offline indicator when network connection drops.
 */
export function ClientResilienceProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);
  const [summary, setSummary] = useState({ pending: 0, active: 0, needsAttention: 0, paused: false });
  const [needsRefresh, setNeedsRefresh] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Self-healing double-buffered snapshot restore (<5ms)
    BroccoliSnapshotEngine.restoreSnapshot();

    const unsubscribeOutbox = BroccoliOutboxEngine.subscribe(() => {
      setSummary(BroccoliOutboxEngine.getRecoverySummary());
    });

    // Track initial network state
    setIsOffline(!navigator.onLine);

    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnectedToast(true);
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => setShowReconnectedToast(false), 5000);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const recoverChunk = () => {
      try {
        if (claimChunkReload(window.sessionStorage)) { window.location.reload(); return; }
      } catch { /* Blocked storage must not cause an automatic reload loop. */ }
      setNeedsRefresh(true);
    };

    // Unhandled Promise Rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = typeof reason === 'string' ? reason : reason?.message || '';

      // Check if it's an expected network abort, cancelled fetch, or chunk failure
      if (
        reason?.name === 'AbortError' ||
        msg.includes('aborted') ||
        msg.includes('Load failed') ||
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError')
      ) {
        event.preventDefault();
        console.warn('🛡️ [GALXAI Client Resilience] Transient network / fetch abort handled gracefully:', msg || reason);
        return;
      }

      // Check for ChunkLoadError (e.g. user clicked a link during/after a new Vercel deployment)
      if (
        msg.includes('ChunkLoadError') ||
        msg.includes('Loading chunk') ||
        msg.includes('Failed to load script')
      ) {
        event.preventDefault();
        console.warn('🔄 [GALXAI Client Resilience] Deployment chunk mismatch detected — refreshing page cleanly...');
        recoverChunk();
        return;
      }

      console.error('🛡️ [GALXAI Client Resilience] Unhandled Promise Rejection intercepted:', reason);
    };

    // Global Window Errors
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event.message || '';

      // Filter harmless ResizeObserver loop limit exceeded or script loading errors
      if (
        msg.includes('ResizeObserver loop') ||
        msg.includes('Script error.') ||
        msg.includes('ResizeObserver loop completed with undelivered notifications')
      ) {
        event.preventDefault();
        return;
      }

      // Suppress browser translation / extension DOM manipulation crashes
      if (
        msg.includes("Failed to execute 'removeChild' on 'Node'") ||
        msg.includes("Failed to execute 'insertBefore' on 'Node'") ||
        msg.includes("Cannot read properties of null (reading 'removeChild')")
      ) {
        event.preventDefault();
        console.warn('🛡️ [GALXAI Client Resilience] Suppressed harmless browser extension DOM collision:', msg);
        return;
      }

      // Check for ChunkLoadError
      if (msg.includes('ChunkLoadError') || msg.includes('Loading chunk')) {
        event.preventDefault();
        console.warn('🔄 [GALXAI Client Resilience] ChunkLoadError intercepted — reloading fresh bundle...');
        recoverChunk();
        return;
      }

      console.error('🛡️ [GALXAI Client Resilience] Global Window Error intercepted:', event.error || msg);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      unsubscribeOutbox();
      clearTimeout(reconnectTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  return (
    <>
      <RecoveryNotice offline={isOffline} reconnected={showReconnectedToast} needsRefresh={needsRefresh}
        summary={summary} onReload={() => window.location.reload()} />

      {children}
    </>
  );
}
