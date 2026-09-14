import type { ReactNode } from 'react';
import { requireWorkspaceSession, WorkspaceSessionUnavailableError } from '@/lib/auth/require-workspace-session';
import { RouteRecovery } from '@/components/common/RouteRecovery';

/** An expected verification outage renders recovery without admitting workspace content. */
export async function WorkspacePageGate({ pathname, search, children }: { pathname: string; search?: URLSearchParams; children: ReactNode }) {
  try {
    await requireWorkspaceSession(pathname, search);
  } catch (error) {
    if (!(error instanceof WorkspaceSessionUnavailableError)) throw error;
    return <RouteRecovery title="Your workspace is temporarily unavailable" description="We couldn’t check your session. Try again in a moment." />;
  }
  return children;
}
