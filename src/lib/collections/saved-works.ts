'use client';

import type { PublicFeedItem } from '@/app/api/images/feed/route';
import { normalizePublicParticipantHandle, sanitizePublicImageUrl } from '@/lib/community/participant-handle';

const SAVED_WORKS_STORAGE_KEY = 'galx_saved_works';
const FOLLOWED_STARS_STORAGE_KEY = 'galx_followed_stars';

export const SAVED_WORKS_EVENT = 'galx-saved-works-changed';
export const FOLLOWED_STARS_EVENT = 'galx-followed-stars-changed';

export interface SavedWorkItem {
  id: string;
  public_url: string;
  thumbnail_url?: string;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function savedAssetUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const origin = typeof window === 'undefined' ? 'https://galx.ai' : window.location.origin;
    const url = new URL(value, origin);
    if (url.origin !== origin || url.username || url.password || url.search || url.hash ||
      !/^\/v1\/images\/assets\/[A-Za-z0-9_.-]+(?:\/thumbnail)?$/.test(url.pathname)) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

function normalizeSavedWork(value: unknown): SavedWorkItem | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !/^[A-Za-z0-9_.-]{1,200}$/.test(value.id)) return null;
  const publicUrl = savedAssetUrl(value.public_url);
  if (!publicUrl) return null;
  const author = isRecord(value.author) ? value.author : {};
  const displayName = typeof author.displayName === 'string' && author.displayName.trim()
    ? author.displayName.trim().slice(0, 120)
    : 'GALX Star';
  const savedAt = typeof value.saved_at === 'string' && Number.isFinite(Date.parse(value.saved_at))
    ? new Date(value.saved_at).toISOString()
    : new Date(0).toISOString();
  const ratios = new Set(['1:1', '16:9', '9:16', '3:2', '4:3', '2:3', '3:4']);
  const thumbnailUrl = savedAssetUrl(value.thumbnail_url);
  const handle = normalizePublicParticipantHandle(author.handle);
  const avatarUrl = sanitizePublicImageUrl(author.avatarUrl);
  return {
    id: value.id,
    public_url: publicUrl,
    ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
    aspect_ratio: typeof value.aspect_ratio === 'string' && ratios.has(value.aspect_ratio) ? value.aspect_ratio : '1:1',
    author: {
      displayName: handle === 'vanta' ? 'VANTA' : displayName,
      handle,
      avatarUrl,
    },
    saved_at: savedAt,
    ...(typeof value.board === 'string' && value.board.trim()
      ? { board: value.board.trim().slice(0, 80) }
      : {}),
  };
}

export function getSavedWorks(): SavedWorkItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_WORKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(SAVED_WORKS_STORAGE_KEY);
      return [];
    }
    const works = parsed.map(normalizeSavedWork).filter((work): work is SavedWorkItem => work !== null);
    // Migrate the browser-only curation cache to the public work allowlist.
    // This does not alter private generation receipts or execution history.
    const normalized = JSON.stringify(works);
    if (normalized !== raw) localStorage.setItem(SAVED_WORKS_STORAGE_KEY, normalized);
    return works;
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
        aspect_ratio: item.aspect_ratio || '1:1',
        author: {
          displayName: item.author.displayName || 'GALX Star',
          handle: normalizePublicParticipantHandle(item.author.handle),
          avatarUrl: sanitizePublicImageUrl(item.author.avatarUrl),
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
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.map(normalizePublicParticipantHandle).filter((handle): handle is string => Boolean(handle))));
  } catch {
    return [];
  }
}

export function isStarFollowed(handle: string): boolean {
  if (typeof window === 'undefined') return false;
  const list = getFollowedStars();
  return list.includes(normalizePublicParticipantHandle(handle) || '');
}

export function toggleFollowStar(handle: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const list = getFollowedStars();
    const normalized = normalizePublicParticipantHandle(handle);
    if (!normalized) return false;
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
