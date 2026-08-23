'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, CheckCircle2 } from 'lucide-react';
import { SafeStorage } from '@/lib/resilience/SafeStorage';
import { BroccoliOutboxEngine } from '@/lib/resilience/BroccoliOutboxEngine';
import { BroccoliSnapshotEngine } from '@/lib/resilience/BroccoliSnapshotEngine';

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
  const [pendingOutboxCount, setPendingOutboxCount] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Self-healing double-buffered snapshot restore (<5ms)
    BroccoliSnapshotEngine.restoreSnapshot();

    const unsubscribeOutbox = BroccoliOutboxEngine.subscribe((mutations) => {
      setPendingOutboxCount(mutations.length);
    });

    // Track initial network state
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnectedToast(true);
      const timer = setTimeout(() => setShowReconnectedToast(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

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
        const hasReloadedKey = 'galx_chunk_reload_attempt';
        const lastAttempt = SafeStorage.getSessionItem(hasReloadedKey);
        const now = Date.now();

        if (!lastAttempt || now - parseInt(lastAttempt, 10) > 10000) {
          SafeStorage.setSessionItem(hasReloadedKey, String(now));
          window.location.reload();
        }
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
        window.location.reload();
        return;
      }

      console.error('🛡️ [GALXAI Client Resilience] Global Window Error intercepted:', event.error || msg);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      unsubscribeOutbox();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  return (
    <>
      {/* Non-intrusive Offline Notification Banner */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-50 bg-amber-500/95 text-black px-4 py-2 text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-lg backdrop-blur-md animate-in slide-in-from-top duration-200"
        >
          <WifiOff className="w-4 h-4 text-black animate-pulse" />
          <span>Offline Mode Active — Cached data served. Automatic reconnect in progress...</span>
        </div>
      )}

      {/* Non-intrusive Reconnection Toast */}
      {showReconnectedToast && !isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 text-black px-4 py-2 rounded-2xl text-xs font-mono font-bold flex items-center gap-2 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-black" />
          <span>Connected — All Systems Synced</span>
        </div>
      )}

      {/* Outbox Background Replay Indicator */}
      {pendingOutboxCount > 0 && !isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-6 z-50 bg-black/90 border border-cyan-500/40 text-cyan-300 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-in fade-in duration-200"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>Replaying {pendingOutboxCount} offline action{pendingOutboxCount > 1 ? 's' : ''}...</span>
        </div>
      )}

      {children}
    </>
  );
}
