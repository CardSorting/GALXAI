import { normalizedPath } from './preview-policy';
import { resolveSiteStarter } from '@/lib/sites/starters';
import { legacyImagePath } from '@/lib/images/navigation';
import { authEntryPath } from '@/lib/auth/redirects';

/** Product availability never grants anonymous access to account workspaces. */
export function isWorkspacePath(pathname: string): boolean {
  const path = normalizedPath(pathname);
  // The legacy Images landing path now redirects to public discovery; only the
  // explicit creation and owner-library routes are private workspaces.
  if (path === '/images') return false;
  if (/^\/images\/studio\/(?:desert|glass|paper)\.webp$/.test(path)) return false;
  return /^\/(?:images|sites|library)(?:\/|$)/.test(path);
}

export function workspaceReturnPath(pathname: string, search = new URLSearchParams()): string {
  const path = normalizedPath(pathname);
  const target = new URL(isWorkspacePath(path) ? path : '/images', 'https://galx.invalid');
  // Preserve only supported starter choices, never arbitrary credentials/query strings.
  if (path === '/sites') {
    const starter = resolveSiteStarter(search.get('starter'), search.get('refine'));
    if (starter) return starter.href;
  }
  const legacy = legacyImagePath(path, search);
  if (legacy) return legacy;
  return target.pathname + target.search;
}

export function workspaceSignInPath(pathname: string, search = new URLSearchParams()): string {
  return authEntryPath(workspaceReturnPath(pathname, search));
}
