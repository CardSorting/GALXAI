import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyWorkspaceSession } from './workspace-session';
import { workspaceSignInPath } from '@/lib/security/workspace-policy';

export class WorkspaceSessionUnavailableError extends Error {
  constructor() { super('Workspace session verification unavailable'); this.name = 'WorkspaceSessionUnavailableError'; }
}

/** Recheck at each server page entry, even if middleware is skipped. */
export async function requireWorkspaceSession(pathname: string, search?: URLSearchParams): Promise<void> {
  const state = await verifyWorkspaceSession(await cookies());
  if (state === 'unavailable') throw new WorkspaceSessionUnavailableError();
  if (state !== 'authenticated') redirect(workspaceSignInPath(pathname, search));
}
