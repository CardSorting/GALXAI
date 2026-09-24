'use client';

import type { PublicFeedItem } from '@/app/api/images/feed/route';

const SAVED_WORKS_STORAGE_KEY = 'galx_saved_works';
const FOLLOWED_STARS_STORAGE_KEY = 'galx_followed_stars';

export const SAVED_WORKS_EVENT = 'galx-saved-works-changed';
export const FOLLOWED_STARS_EVENT = 'galx-followed-stars-changed';

export interface SavedWorkItem {
  id: string;
  public_url: string;
  thumbnail_url?: string;
  prompt: string;
  aspect_ratio: string;
  author: {
    displayName: string;
    handle?: string | null;
    avatarUrl?: string | null;
  };
  saved_at: string;
  board?: string;
}

// ==========================================
// SAVED WORKS MANAGEMENT (Pinterest / Are.na)
// ==========================================

export function getSavedWorks(): SavedWorkItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_WORKS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function isWorkSaved(id: string): boolean {
  if (typeof window === 'undefined') return false;
  const list = getSavedWorks();
  return list.some((item) => item.id === id);
}

export function toggleSaveWork(item: PublicFeedItem, board: string = 'all'): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const list = getSavedWorks();
    const existingIndex = list.findIndex((w) => w.id === item.id);
    let nowSaved = false;

    if (existingIndex >= 0) {
      list.splice(existingIndex, 1);
      nowSaved = false;
    } else {
      const entry: SavedWorkItem = {
        id: item.id,
        public_url: item.public_url,
        thumbnail_url: item.thumbnail_url,
        prompt: item.prompt,
        aspect_ratio: item.aspect_ratio || '1:1',
        author: {
          displayName: item.author.displayName || 'GALX Star',
          handle: item.author.handle,
          avatarUrl: item.author.avatarUrl,
        },
        saved_at: new Date().toISOString(),
        board: board || 'all',
      };
      list.unshift(entry);
      nowSaved = true;
    }

    localStorage.setItem(SAVED_WORKS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(
      new CustomEvent(SAVED_WORKS_EVENT, {
        detail: { id: item.id, isSaved: nowSaved, board },
      })
    );
    return nowSaved;
  } catch {
    return false;
  }
}

export function removeSavedWork(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const list = getSavedWorks();
    const filtered = list.filter((w) => w.id !== id);
    if (filtered.length !== list.length) {
      localStorage.setItem(SAVED_WORKS_STORAGE_KEY, JSON.stringify(filtered));
      window.dispatchEvent(
        new CustomEvent(SAVED_WORKS_EVENT, {
          detail: { id, isSaved: false },
        })
      );
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function clearAllSavedWorks(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SAVED_WORKS_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent(SAVED_WORKS_EVENT, {
        detail: { id: '*', isSaved: false },
      })
    );
  } catch {
    // Graceful error handling
  }
}

export function exportSavedWorksJson(): string {
  const works = getSavedWorks();
  return JSON.stringify(
    {
      collection: 'GALX Star Publications',
      exportedAt: new Date().toISOString(),
      itemCount: works.length,
      items: works,
    },
    null,
    2
  );
}

// ==========================================
// FOLLOWED STARS MANAGEMENT (Spotify / Substack)
// ==========================================

export function getFollowedStars(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(FOLLOWED_STARS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function isStarFollowed(handle: string): boolean {
  if (typeof window === 'undefined') return false;
  const list = getFollowedStars();
  return list.includes(handle.toLowerCase());
}

export function toggleFollowStar(handle: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const list = getFollowedStars();
    const normalized = handle.toLowerCase();
    let updated: string[];
    let nowFollowing = false;

    if (list.includes(normalized)) {
      updated = list.filter((h) => h !== normalized);
      nowFollowing = false;
    } else {
      updated = [...list, normalized];
      nowFollowing = true;
    }

    localStorage.setItem(FOLLOWED_STARS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent(FOLLOWED_STARS_EVENT, {
        detail: { handle: normalized, isFollowing: nowFollowing, count: updated.length },
      })
    );

    // Sync durably with backend follow relationship (zero inference impact)
    try {
      fetch('/api/community/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: normalized, follow: nowFollowing }),
      }).catch(() => {
        // Silently tolerate offline / disconnected state
      });
    } catch {
      // Offline fallback
    }

    return nowFollowing;
  } catch {
    return false;
  }
}

