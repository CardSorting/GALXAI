'use client';

import React, { useEffect } from 'react';

/**
 * ClientResilienceProvider
 * Global client-side unhandled exception & promise rejection interceptor.
 * Prevents third-party scripts, aborted fetches, or SSE stream drops from causing hard white-screen crashes.
 */
export function ClientResilienceProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Check if it's an expected network abort or cancelled fetch
      if (
        event.reason?.name === 'AbortError' ||
        event.reason?.message?.includes('aborted') ||
        event.reason?.message?.includes('Load failed') ||
        event.reason?.message?.includes('Failed to fetch')
      ) {
        // Suppress expected transient network drops from triggering global fatal cascades
        event.preventDefault();
        console.warn('🛡️ [GALXAI Client Resilience] Transient network / fetch abort handled gracefully:', event.reason?.message || event.reason);
        return;
      }

      console.error('🛡️ [GALXAI Client Resilience] Unhandled Promise Rejection intercepted:', event.reason);
    };

    const handleGlobalError = (event: ErrorEvent) => {
      // Filter harmless ResizeObserver loop limit exceeded or script loading errors
      if (
        event.message?.includes('ResizeObserver loop') ||
        event.message?.includes('Script error.')
      ) {
        event.preventDefault();
        return;
      }

      console.error('🛡️ [GALXAI Client Resilience] Global Window Error intercepted:', event.error || event.message);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  return <>{children}</>;
}
