'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isPublicReadingPath } from '@/lib/public-content/routes';
import { isPublicProgrammePath } from '@/lib/exhibitions/paths';
import { RouteRecovery } from '@/components/common/RouteRecovery';
import type { ReactNode } from 'react';
import { authRecoveryPath } from '@/lib/auth/redirects';
import { SessionConnectionNotice } from './SessionConnectionNotice';
import { workspaceReturnPath } from '@/lib/security/workspace-policy';

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
  const accountEntry = pathname === '/login' || pathname === '/signup' || /^\/connect(?:\/|$)/.test(pathname);
  if (status === 'unavailable' && !accountEntry && pathname !== '/' && !isPublicReadingPath(pathname) && !isPublicProgrammePath(pathname)) {
    return <RouteRecovery title="Let’s get you reconnected" description="We couldn’t reconnect to your account. Try again, or sign in to continue."
      secondaryHref={authRecoveryPath(workspaceReturnPath(pathname, new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)))} secondaryLabel="Sign in again"
      onRetry={retrySession} pendingLabel="Checking session…" failureMessage="Your session is still unavailable. Try again in a moment." />;
  }
  return <>{status === 'reconnecting' && !accountEntry && <SessionConnectionNotice />}{children}</>;
}
