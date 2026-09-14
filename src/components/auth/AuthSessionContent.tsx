'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isPublicReadingPath } from '@/lib/public-content/routes';
import { RouteRecovery } from '@/components/common/RouteRecovery';
import type { ReactNode } from 'react';

/** Preserve the public shell while withholding account content during recovery. */
export function AuthSessionContent({ children }: { children: ReactNode }) {
  const { status, retrySession, signOut } = useAuth();
  const pathname = usePathname();
  if (status === 'signing_out' || status === 'signout_failed') {
    return <RouteRecovery title={status === 'signing_out' ? 'Signing out…' : 'Finish signing out'}
      description="Your workspace is hidden while we end this browser’s session."
      busy={status === 'signing_out'} onRetry={signOut} retryLabel="Retry sign-out" pendingLabel="Signing out…"
      failureMessage="Sign-out could not be completed. Try again." />;
  }
  if (status === 'unavailable' && pathname !== '/' && !isPublicReadingPath(pathname)) {
    return <RouteRecovery title="We couldn’t check your session" description="Check your connection and try again."
      onRetry={retrySession} pendingLabel="Checking session…" failureMessage="Your session is still unavailable. Try again in a moment." />;
  }
  return children;
}
