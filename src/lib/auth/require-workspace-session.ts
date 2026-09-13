import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyWorkspaceSession } from './workspace-session';
import { workspaceSignInPath } from '@/lib/security/workspace-policy';

/** Recheck at each server page entry, even if middleware is skipped. */
export async function requireWorkspaceSession(pathname: string, search?: URLSearchParams): Promise<void> {
  const state = await verifyWorkspaceSession(await cookies());
  if (state === 'unavailable') throw new Error('Your session could not be checked. Try again shortly.');
  if (state !== 'authenticated') redirect(workspaceSignInPath(pathname, search));
}
