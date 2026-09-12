import { SafeStorage } from './SafeStorage';
/** Lightweight history shared with search, without importing its developer catalogue. */
export function recordRecentVisit(title: string, href: string, category = 'Navigation') {
  try {
    const value = JSON.parse(SafeStorage.getItem('galx_recent_nav_v1') || '[]');
    const entries = Array.isArray(value) ? value.filter(item => item && typeof item.href === 'string').slice(0, 15) : [];
    const previous = entries.find(item => item.href === href);
    SafeStorage.setItem('galx_recent_nav_v1', JSON.stringify([
      { id: href, title, href, category, timestamp: Date.now(), visitCount: (Number(previous?.visitCount) || 0) + 1 },
      ...entries.filter(item => item.href !== href),
    ].slice(0, 15)));
  } catch { /* History is optional when browser storage is unavailable. */ }
}
