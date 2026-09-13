import { normalizedPath } from './preview-policy';
import { resolveSiteStarter } from '@/lib/sites/starters';

/** Product availability never grants anonymous access to account workspaces. */
export function isWorkspacePath(pathname: string): boolean {
  const path = normalizedPath(pathname);
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
  if (path === '/images' && search.get('view') === 'library') target.searchParams.set('view', 'library');
  return target.pathname + target.search;
}

export function workspaceSignInPath(pathname: string, search = new URLSearchParams()): string {
  return `/auth/signin?${new URLSearchParams({ next: workspaceReturnPath(pathname, search) })}`;
}
