'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Copy,
  Check,
  Download,
  Search,
  X,
  RefreshCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Flame,
  Clock,
  Layers,
  Eye,
  Grid,
  LayoutGrid,
  EyeOff,
  ShieldAlert,
  RotateCcw,
  Share2,
} from 'lucide-react';
import type { PublicFeedItem } from '@/app/api/images/feed/route';
import { ParticipantIdentity } from '@/components/community/ParticipantIdentity';
import './masonry-stream.css';

interface PublicImageMasonryStreamProps {
  initialItems?: PublicFeedItem[];
  initialCursor?: string | null;
  initialHasMore?: boolean;
  className?: string;
  showToolbar?: boolean;
  onSelectPrompt?: (prompt: string, ratio?: string) => void;
  authorHandle?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  endMessage?: string;
  loadingLabel?: string;
  externalQuery?: string;
  initialImageId?: string;
  initialRatio?: string | null;
  initialStyle?: string;
  initialSort?: 'recent' | 'trending';
}

const FILTER_PILLS = [
  { label: 'All Ratios', value: null },
  { label: 'Square 1:1', value: '1:1' },
  { label: 'Wide 16:9', value: '16:9' },
  { label: 'Portrait 9:16', value: '9:16' },
  { label: 'Classic 3:2', value: '3:2' },
  { label: 'Standard 4:3', value: '4:3' },
] as const;

const STYLE_PRESETS = [
  { label: 'All Styles', value: 'all' },
  { label: 'Photorealistic', value: 'photorealistic' },
  { label: 'Anime & Manga', value: 'anime' },
  { label: 'Cinematic', value: 'cinematic' },
  { label: 'Cyberpunk', value: 'cyberpunk' },
  { label: '3D Render', value: '3d' },
  { label: 'Fantasy', value: 'fantasy' },
  { label: 'Minimalist', value: 'minimalist' },
] as const;

const SKELETON_ITEMS = [
  { id: 'sk-1', ratio: '1 / 1' },
  { id: 'sk-2', ratio: '9 / 16' },
  { id: 'sk-3', ratio: '16 / 9' },
  { id: 'sk-4', ratio: '3 / 2' },
  { id: 'sk-5', ratio: '1 / 1' },
  { id: 'sk-6', ratio: '4 / 3' },
  { id: 'sk-7', ratio: '9 / 16' },
  { id: 'sk-8', ratio: '1 / 1' },
  { id: 'sk-9', ratio: '16 / 9' },
  { id: 'sk-10', ratio: '3 / 2' },
  { id: 'sk-11', ratio: '1 / 1' },
  { id: 'sk-12', ratio: '9 / 16' },
] as const;

const PAGINATION_SKELETON_ITEMS = [
  { id: 'pag-sk-1', ratio: '1 / 1' },
  { id: 'pag-sk-2', ratio: '9 / 16' },
  { id: 'pag-sk-3', ratio: '16 / 9' },
  { id: 'pag-sk-4', ratio: '3 / 2' },
] as const;

function ratioToCss(ratio: string): string {
  switch (ratio) {
    case '16:9': return '16 / 9';
    case '9:16': return '9 / 16';
    case '3:2': return '3 / 2';
    case '2:3': return '2 / 3';
    case '4:3': return '4 / 3';
    case '3:4': return '3 / 4';
    case '1:1':
    default:
      return '1 / 1';
  }
}

function formatCount(num?: number): string {
  if (!num) return '0';
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

export function PublicImageMasonryStream({
  initialItems = [],
  initialCursor = null,
  initialHasMore,
  className = '',
  showToolbar = true,
  onSelectPrompt,
  authorHandle,
  emptyTitle,
  emptyDescription,
  endMessage,
  loadingLabel,
  externalQuery,
  initialImageId,
  initialRatio,
  initialStyle,
  initialSort,
}: PublicImageMasonryStreamProps) {
  const router = useRouter();
  const [items, setItems] = useState<PublicFeedItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(
    initialHasMore ?? (initialItems.length === 0 || Boolean(initialCursor)),
  );

  const [sortMode, setSortMode] = useState<'recent' | 'trending'>(() => {
    if (initialSort) return initialSort;
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const s = sp.get('sort');
      if (s === 'recent' || s === 'trending') return s;
    }
    return 'trending';
  });

  const [selectedRatio, setSelectedRatio] = useState<string | null>(() => {
    if (initialRatio !== undefined) return initialRatio;
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const r = sp.get('ratio') || sp.get('aspect_ratio');
      if (r && ['1:1', '16:9', '9:16', '3:2', '4:3', '2:3', '3:4'].includes(r)) return r;
    }
    return null;
  });

  const [selectedStyle, setSelectedStyle] = useState<string>(() => {
    if (initialStyle) return initialStyle;
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const s = sp.get('tag') || sp.get('style');
      if (s) return s;
    }
    return 'all';
  });

  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  const [searchQuery, setSearchQuery] = useState<string>(() => {
    if (externalQuery) return externalQuery;
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get('q');
      if (q) return q;
    }
    return '';
  });

  const [activeModalIndex, setActiveModalIndex] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastUndoable, setToastUndoable] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});
  const [likedPopId, setLikedPopId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [hidingIds, setHidingIds] = useState<Set<string>>(new Set());
  const [lastHiddenItem, setLastHiddenItem] = useState<{ item: PublicFeedItem; index: number } | null>(null);
  const [imageSrcMap, setImageSrcMap] = useState<Record<string, string>>({});

  const targetImageIdRef = useRef<string | null>(
    initialImageId ||
      (typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('image') ||
          new URLSearchParams(window.location.search).get('image_id') ||
          new URLSearchParams(window.location.search).get('id')
        : null)
  );

  const observerTarget = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingImpressionsRef = useRef<Set<string>>(new Set());
  const touchStartCoordRef = useRef<{ x: number; y: number } | null>(null);
  const hiddenIdsRef = useRef<Set<string>>(new Set());
  const loadingRef = useRef(false);
  const initialFetchedRef = useRef(false);
  const modalCloseButtonRef = useRef<HTMLButtonElement>(null);

  const showToast = useCallback((msg: string, undoable: boolean = false) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    setToastUndoable(undoable);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      setToastUndoable(false);
    }, undoable ? 4500 : 2400);
  }, []);

  // Hydrate persistent likes, hidden items and density preference from localStorage
  useEffect(() => {
    try {
      const storedLikes = localStorage.getItem('galx_liked_images');
      if (storedLikes) {
        const parsed = JSON.parse(storedLikes);
        if (typeof parsed === 'object' && parsed !== null) {
          setLikedMap(parsed);
        }
      }
      const storedHidden = localStorage.getItem('galx_hidden_images');
      if (storedHidden) {
        const parsed = JSON.parse(storedHidden);
        if (Array.isArray(parsed)) {
          const set = new Set<string>(parsed);
          setHiddenIds(set);
          hiddenIdsRef.current = set;
          setItems((prev) => prev.filter((it) => !set.has(it.id)));
        }
      }
      const storedDensity = localStorage.getItem('galx_stream_density');
      if (storedDensity === 'compact' || storedDensity === 'comfortable') {
        setDensity(storedDensity);
      }
    } catch {
      // Ignore storage errors in private modes
    }
  }, []);

  // Save likedMap to localStorage
  const persistLikes = useCallback((updated: Record<string, boolean>) => {
    try {
      localStorage.setItem('galx_liked_images', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }, []);

  // Toggle density
  const handleToggleDensity = (d: 'comfortable' | 'compact') => {
    setDensity(d);
    try {
      localStorage.setItem('galx_stream_density', d);
    } catch {
      // Ignore
    }
  };

  // Synchronize URL parameters without refreshing or triggering infinite re-renders
  const syncUrlState = useCallback(
    (updates: {
      image?: string | null;
      q?: string | null;
      ratio?: string | null;
      style?: string | null;
      sort?: 'recent' | 'trending' | null;
    }) => {
      if (typeof window === 'undefined') return;
      try {
        const url = new URL(window.location.href);

        if (updates.image !== undefined) {
          if (updates.image) url.searchParams.set('image', updates.image);
          else url.searchParams.delete('image');
        }

        if (updates.q !== undefined) {
          if (updates.q && updates.q.trim()) url.searchParams.set('q', updates.q.trim());
          else url.searchParams.delete('q');
        }

        if (updates.ratio !== undefined) {
          if (updates.ratio) {
            url.searchParams.set('ratio', updates.ratio);
            url.searchParams.delete('aspect_ratio');
          } else {
            url.searchParams.delete('ratio');
            url.searchParams.delete('aspect_ratio');
          }
        }

        if (updates.style !== undefined) {
          if (updates.style && updates.style !== 'all') url.searchParams.set('tag', updates.style);
          else {
            url.searchParams.delete('tag');
            url.searchParams.delete('style');
          }
        }

        if (updates.sort !== undefined) {
          if (updates.sort && updates.sort !== 'trending') url.searchParams.set('sort', updates.sort);
          else url.searchParams.delete('sort');
        }

        window.history.replaceState({ modalImage: updates.image ?? null }, '', url.toString());
      } catch {
        // Ignore in non-standard environments
      }
    },
    []
  );

  // Fetch feed items with resilient error catching, keyset pagination, and target image prioritization
  const fetchFeed = useCallback(
    async (
      nextCursor: string | null = null,
      reset = false,
      ratio: string | null = selectedRatio,
      style: string = selectedStyle,
      query: string = searchQuery,
      sort: 'recent' | 'trending' = sortMode,
      targetImageId: string | null = targetImageIdRef.current
    ) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setFetchError(null);

      try {
        const params = new URLSearchParams();
        params.set('limit', '24');
        params.set('sort', sort);
        if (nextCursor) params.set('cursor', nextCursor);
        if (ratio) params.set('aspect_ratio', ratio);
        if (style && style !== 'all') params.set('tag', style);
        if (query.trim()) params.set('q', query.trim());
        if (authorHandle) params.set('author_handle', authorHandle);
        if (targetImageId) params.set('image', targetImageId);

        const res = await fetch(`/api/images/feed?${params.toString()}`);
        if (!res.ok) {
          setFetchError('The community stream is unavailable. Try again.');
          return;
        }

        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          const visible = data.items.filter((it: PublicFeedItem) => !hiddenIdsRef.current.has(it.id));
          setItems((prev) => (reset ? visible : [...prev, ...visible]));
          setCursor(data.nextCursor);
          setHasMore(Boolean(data.nextCursor));

          // If a target creation ID was requested, open it in the modal immediately
          if (targetImageId) {
            const idx = visible.findIndex((it: PublicFeedItem) => it.id === targetImageId);
            if (idx >= 0) {
              setActiveModalIndex(idx);
            }
            targetImageIdRef.current = null; // Fulfilled
          }

          // Populate initial likes count map
          setLikesCountMap((prev) => {
            const updated = { ...prev };
            for (const it of data.items) {
              if (updated[it.id] === undefined && typeof it.likes_count === 'number') {
                updated[it.id] = it.likes_count;
              }
            }
            return updated;
          });
        }
      } catch {
        setFetchError('The community stream is offline. Try again.');
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authorHandle, selectedRatio, selectedStyle, searchQuery, sortMode]
  );

  // Initial load if no initial items supplied - executed exactly once per component mount
  useEffect(() => {
    if (!initialFetchedRef.current && initialItems.length === 0 && initialHasMore !== false) {
      initialFetchedRef.current = true;
      void fetchFeed(
        null,
        true,
        selectedRatio,
        selectedStyle,
        searchQuery,
        sortMode,
        targetImageIdRef.current
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Synchronize external query changes if supplied
  useEffect(() => {
    if (externalQuery !== undefined && externalQuery !== searchQuery) {
      setSearchQuery(externalQuery);
      setCursor(null);
      syncUrlState({ q: externalQuery });
      void fetchFeed(null, true, selectedRatio, selectedStyle, externalQuery, sortMode, null);
    }
  }, [externalQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Batch impression flush every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingImpressionsRef.current.size === 0) return;
      const ids = Array.from(pendingImpressionsRef.current);
      pendingImpressionsRef.current.clear();

      void fetch('/api/images/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view_batch', imageIds: ids }),
      }).catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Track card view impression
  const registerCardImpression = useCallback((id: string) => {
    pendingImpressionsRef.current.add(id);
  }, []);

  // Handle sort change
  const handleSortChange = (sort: 'recent' | 'trending') => {
    if (sort === sortMode) return;
    setSortMode(sort);
    setCursor(null);
    syncUrlState({ sort });
    void fetchFeed(null, true, selectedRatio, selectedStyle, searchQuery, sort, null);
  };

  // Handle ratio filter change
  const handleRatioChange = (ratio: string | null) => {
    setSelectedRatio(ratio);
    setCursor(null);
    syncUrlState({ ratio });
    void fetchFeed(null, true, ratio, selectedStyle, searchQuery, sortMode, null);
  };

  // Handle style preset change
  const handleStyleChange = (style: string) => {
    setSelectedStyle(style);
    setCursor(null);
    syncUrlState({ style });
    void fetchFeed(null, true, selectedRatio, style, searchQuery, sortMode, null);
  };

  // Handle search with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setCursor(null);
      syncUrlState({ q: value });
      void fetchFeed(null, true, selectedRatio, selectedStyle, value, sortMode, null);
    }, 350);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCursor(null);
    syncUrlState({ q: '' });
    void fetchFeed(null, true, selectedRatio, selectedStyle, '', sortMode, null);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setCursor(null);
    void fetchFeed(null, true, selectedRatio, selectedStyle, searchQuery, sortMode, null);
  };

  // Infinite scroll intersection observer - guarded against loops
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current && cursor) {
          void fetchFeed(cursor, false);
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [cursor, hasMore, fetchFeed]);

  // Copy prompt helper
  const handleCopyPrompt = (e: React.MouseEvent, item: PublicFeedItem) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.prompt);
    setCopiedId(item.id);
    showToast('Prompt copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Like toggle with optimistic UI, local persistence, and server sync
  const handleToggleLike = (e: React.MouseEvent, item: PublicFeedItem) => {
    e.stopPropagation();
    const currentlyLiked = Boolean(likedMap[item.id]);
    const nextLiked = !currentlyLiked;

    const updatedMap = { ...likedMap, [item.id]: nextLiked };
    setLikedMap(updatedMap);
    persistLikes(updatedMap);

    setLikesCountMap((prev) => {
      const current = prev[item.id] ?? item.likes_count ?? 0;
      return { ...prev, [item.id]: Math.max(0, current + (nextLiked ? 1 : -1)) };
    });

    if (nextLiked) {
      setLikedPopId(item.id);
      setTimeout(() => setLikedPopId(null), 500);
      showToast('Liked creation');
    }

    void fetch('/api/images/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'like', imageId: item.id, increment: nextLiked }),
    }).catch(() => {});
  };

  // Remix / create with this prompt
  const handleRemix = (e: React.MouseEvent, item: PublicFeedItem) => {
    e.stopPropagation();

    void fetch('/api/images/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remix', imageId: item.id }),
    }).catch(() => {});

    if (onSelectPrompt) {
      onSelectPrompt(item.prompt, item.aspect_ratio || undefined);
      return;
    }
    const params = new URLSearchParams();
    params.set('prompt', item.prompt);
    if (item.aspect_ratio) params.set('aspect_ratio', item.aspect_ratio);
    params.set('tab', 'creations');
    router.push(`/images?${params.toString()}`);
  };

  // Download the selected public asset with a browser fallback.
  const handleDownload = async (e: React.MouseEvent, item: PublicFeedItem) => {
    e.stopPropagation();
    const downloadUrl = imageSrcMap[item.id] || item.public_url;
    try {
      showToast('Downloading high-res image…');
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error('Download request failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const isPng = downloadUrl.endsWith('.png') || blob.type === 'image/png';
      const isWebp = downloadUrl.endsWith('.webp') || blob.type === 'image/webp';
      const ext = isPng ? 'png' : isWebp ? 'webp' : 'jpg';
      a.download = `galx-${item.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      showToast('Download complete');
    } catch {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `galx-${item.id}.jpg`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Hide / moderate artwork: immediate removal and conversion to creator's private library
  const handleHideItem = async (e: React.MouseEvent, item: PublicFeedItem, reason: string = 'community_moderation') => {
    e.stopPropagation();

    // 1. Mark as hiding for smooth CSS exit animation
    setHidingIds((prev) => new Set(prev).add(item.id));

    // Save for undo
    const itemIndex = items.findIndex((i) => i.id === item.id);
    setLastHiddenItem({ item, index: itemIndex >= 0 ? itemIndex : 0 });

    // 2. Persist to local hidden set
    const updatedHidden = new Set(hiddenIds);
    updatedHidden.add(item.id);
    setHiddenIds(updatedHidden);
    hiddenIdsRef.current = updatedHidden;
    try {
      localStorage.setItem('galx_hidden_images', JSON.stringify([...updatedHidden]));
    } catch {}

    // 3. Remove from stream after smooth transition
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setHidingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      if (activeModalIndex !== null && items[activeModalIndex]?.id === item.id) {
        setActiveModalIndex(null);
      }
    }, 260);

    // 4. Show toast with undo
    showToast('Artwork hidden and returned to creator\'s private library.', true);

    // 5. Fire backend moderation request
    try {
      void fetch('/api/images/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: item.id, reason }),
      }).catch(() => {});
    } catch {}
  };

  // Undo hide action
  const handleUndoHide = () => {
    if (!lastHiddenItem) return;
    const { item, index } = lastHiddenItem;

    // Restore to items
    setItems((prev) => {
      const copy = [...prev];
      if (index >= 0 && index <= copy.length) {
        copy.splice(index, 0, item);
      } else {
        copy.unshift(item);
      }
      return copy;
    });

    // Remove from hiddenIds
    const updatedHidden = new Set(hiddenIds);
    updatedHidden.delete(item.id);
    setHiddenIds(updatedHidden);
    hiddenIdsRef.current = updatedHidden;
    try {
      localStorage.setItem('galx_hidden_images', JSON.stringify([...updatedHidden]));
    } catch {}

    setLastHiddenItem(null);
    setToastMessage(null);
    setToastUndoable(false);
    showToast('Artwork restored to Explore stream.');
  };

  const openModalByIndex = useCallback((index: number) => {
    setIsZoomed(false);
    setActiveModalIndex(index);
    const item = items[index];
    if (item) syncUrlState({ image: item.id });
  }, [items, syncUrlState]);

  const closeModal = useCallback(() => {
    setIsZoomed(false);
    setActiveModalIndex(null);
    syncUrlState({ image: null });
  }, [syncUrlState]);

  // Modal navigation helpers
  const activeModalItem = activeModalIndex !== null && items[activeModalIndex] ? items[activeModalIndex] : null;

  const handlePrevImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsZoomed(false);
    setActiveModalIndex((prev) => {
      if (prev === null || items.length === 0) return null;
      const nextIdx = prev > 0 ? prev - 1 : items.length - 1;
      const it = items[nextIdx];
      if (it) syncUrlState({ image: it.id });
      return nextIdx;
    });
  }, [items, syncUrlState]);

  const handleNextImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsZoomed(false);
    setActiveModalIndex((prev) => {
      if (prev === null || items.length === 0) return null;
      const nextIdx = prev < items.length - 1 ? prev + 1 : 0;
      const it = items[nextIdx];
      if (it) syncUrlState({ image: it.id });
      return nextIdx;
    });
  }, [items, syncUrlState]);

  // Share creation link helper: generates a universal Explore deep-link accessible to any visitor
  const handleShareLink = (e: React.MouseEvent, item: PublicFeedItem) => {
    e.stopPropagation();
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const shareUrl = `${origin}/explore?image=${encodeURIComponent(item.id)}`;
    navigator.clipboard.writeText(shareUrl);
    showToast('Direct creation link copied to clipboard');
  };

  // Prefer a live thumbnail, then the live public asset. Never substitute unrelated artwork.
  const handleImageError = useCallback((item: PublicFeedItem, currentSrc: string) => {
    if (
      item.thumbnail_url &&
      currentSrc === item.thumbnail_url &&
      item.public_url &&
      item.public_url !== item.thumbnail_url
    ) {
      setImageSrcMap((prev) => ({ ...prev, [item.id]: item.public_url as string }));
      return;
    }
    setItems((previous) => previous.filter((candidate) => candidate.id !== item.id));
  }, []);

  // Deep-link hydration on mount
  useEffect(() => {
    if (typeof window === 'undefined' || items.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('image');
    if (targetId && activeModalIndex === null) {
      const idx = items.findIndex((it) => it.id === targetId);
      if (idx >= 0) {
        setActiveModalIndex(idx);
      }
    }
  }, [items, activeModalIndex]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePop = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get('image');
      if (targetId) {
        const idx = items.findIndex((it) => it.id === targetId);
        if (idx >= 0) setActiveModalIndex(idx);
      } else {
        setActiveModalIndex(null);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [items]);

  // Modal keyboard handling (Esc to close, Left/Right arrows to navigate, C to copy, Z to zoom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeModalItem) return;

      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'z' || e.key === 'Z') {
        setIsZoomed((prev) => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        navigator.clipboard.writeText(activeModalItem.prompt);
        setCopiedId(activeModalItem.id);
        showToast('Prompt copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModalItem, handlePrevImage, handleNextImage, closeModal, showToast]);

  // Keep the page shell stationary while the lightbox owns the viewport and
  // return keyboard focus to the control that opened it.
  useEffect(() => {
    if (!activeModalItem || typeof document === 'undefined') return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    const focusFrame = window.requestAnimationFrame(() => modalCloseButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [activeModalItem]);

  // Touch swipe support for mobile lightbox navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartCoordRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartCoordRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartCoordRef.current.x;
    const deltaY = touch.clientY - touchStartCoordRef.current.y;
    touchStartCoordRef.current = null;

    if (Math.abs(deltaX) > 48 && Math.abs(deltaY) < 70) {
      if (deltaX > 0) {
        handlePrevImage();
      } else {
        handleNextImage();
      }
    }
  };

  return (
    <div className={`masonry-stream-container ${className} density-${density}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="masonry-toast" role="status" aria-live="polite">
          <Sparkles size={14} className="masonry-toast-icon" />
          <span>{toastMessage}</span>
          {toastUndoable && lastHiddenItem && (
            <button
              type="button"
              className="masonry-toast-undo-btn"
              onClick={handleUndoHide}
              title="Undo hide and restore creation"
            >
              <RotateCcw size={12} />
              <span>Undo</span>
            </button>
          )}
        </div>
      )}

      {/* --- Primary Toolbar --- */}
      {showToolbar && (
        <div className="masonry-toolbar">
          <div className="masonry-toolbar-left">
            {/* Sort Tabs (Trending vs Latest) */}
            <div className="masonry-sort-tabs" role="tablist" aria-label="Sort stream">
              <button
                type="button"
                className={`masonry-sort-btn ${sortMode === 'trending' ? 'active' : ''}`}
                onClick={() => handleSortChange('trending')}
                role="tab"
                aria-selected={sortMode === 'trending'}
              >
                <Flame size={14} />
                <span>Trending</span>
              </button>
              <button
                type="button"
                className={`masonry-sort-btn ${sortMode === 'recent' ? 'active' : ''}`}
                onClick={() => handleSortChange('recent')}
                role="tab"
                aria-selected={sortMode === 'recent'}
              >
                <Clock size={14} />
                <span>Latest</span>
              </button>
            </div>

            <div className="masonry-divider" />

            {/* Ratio Filter Pills */}
            <div className="masonry-filters" role="tablist" aria-label="Filter by aspect ratio">
              {FILTER_PILLS.map((pill) => (
                <button
                  key={pill.label}
                  type="button"
                  className={`masonry-filter-pill ${selectedRatio === pill.value ? 'active' : ''}`}
                  onClick={() => handleRatioChange(pill.value)}
                  aria-pressed={selectedRatio === pill.value}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          <div className="masonry-toolbar-right">
            {/* Density switch */}
            <div className="masonry-density-switch" role="group" aria-label="Grid density">
              <button
                type="button"
                className={`masonry-density-btn ${density === 'comfortable' ? 'active' : ''}`}
                onClick={() => handleToggleDensity('comfortable')}
                title="Comfortable layout"
                aria-label="Comfortable view"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                className={`masonry-density-btn ${density === 'compact' ? 'active' : ''}`}
                onClick={() => handleToggleDensity('compact')}
                title="Compact layout"
                aria-label="Compact view"
              >
                <Grid size={15} />
              </button>
            </div>

            <div className="masonry-search">
              <Search size={15} aria-hidden="true" />
              <input
                type="text"
                placeholder="Search stream prompts…"
                value={searchQuery}
                onChange={handleSearchChange}
                aria-label="Search prompt stream"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="masonry-search-clear"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              className={`masonry-refresh-btn ${refreshing ? 'spinning' : ''}`}
              onClick={handleRefresh}
              aria-label="Refresh stream"
              title="Refresh stream"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      )}

      {/* --- Style / Aesthetics Preset Chips Bar --- */}
      {showToolbar && (
        <div className="masonry-styles-bar" role="tablist" aria-label="Filter by art style">
          <span className="masonry-styles-label">Style:</span>
          <div className="masonry-styles-scroll">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`masonry-style-chip ${selectedStyle === preset.value ? 'active' : ''}`}
                onClick={() => handleStyleChange(preset.value)}
                aria-pressed={selectedStyle === preset.value}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Optional gentle offline/fetch alert */}
      {fetchError && (
        <div className="masonry-status-banner">
          <span>✦ {fetchError}</span>
          <button type="button" onClick={handleRefresh} className="masonry-status-retry">
            Retry
          </button>
        </div>
      )}

      {/* --- Pinterest-Style Masonry Grid --- */}
      {items.length > 0 ? (
        <div className={`masonry-grid ${density}`} aria-label="Image creations stream">
          {items.map((item, idx) => {
            const isLoaded = loadedImages[item.id];
            const isCopied = copiedId === item.id;
            const isLiked = Boolean(likedMap[item.id]);
            const likesCount = likesCountMap[item.id] ?? item.likes_count ?? 0;
            const ratioCss = ratioToCss(item.aspect_ratio);

            return (
              <article
                key={item.id}
                className={`masonry-card ${hidingIds.has(item.id) ? 'hiding' : ''}`}
                onClick={() => openModalByIndex(idx)}
                tabIndex={0}
                role="button"
                aria-label={`View image: ${item.prompt}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openModalByIndex(idx);
                  }
                }}
              >
                <div
                  className="masonry-media-wrap"
                  style={{ aspectRatio: ratioCss }}
                >
                  {/* LQIP Placeholder */}
                  {item.lqip && !isLoaded && (
                    <img
                      src={item.lqip}
                      alt=""
                      aria-hidden="true"
                      className="masonry-lqip"
                    />
                  )}

                  {/* High-res live asset with impression trigger */}
                  <img
                    src={imageSrcMap[item.id] || item.thumbnail_url || item.public_url}
                    alt={item.prompt}
                    loading="lazy"
                    className={`masonry-image ${isLoaded ? 'loaded' : ''}`}
                    onLoad={() => {
                      setLoadedImages((prev) => ({ ...prev, [item.id]: true }));
                      registerCardImpression(item.id);
                    }}
                    onError={(e) => {
                      handleImageError(item, e.currentTarget.src);
                    }}
                  />

                  {/* Top Floating Badges & Action Buttons */}
                  <div className="masonry-card-topbar">
                    <div className="masonry-card-author">
                      <ParticipantIdentity {...item.author} compact showHandle={false} />
                    </div>

                    <div className="masonry-card-actions-top">
                      <button
                        type="button"
                        className="masonry-hide-btn"
                        onClick={(e) => handleHideItem(e, item)}
                        title="Hide from Explore (Set to Private)"
                        aria-label="Hide from Explore and set to private"
                      >
                        <EyeOff size={13} />
                      </button>

                      <button
                        type="button"
                        className={`masonry-like-btn ${isLiked ? 'liked' : ''} ${likedPopId === item.id ? 'pop' : ''}`}
                        onClick={(e) => handleToggleLike(e, item)}
                        title={isLiked ? 'Unlike' : 'Like'}
                        aria-label="Like creation"
                      >
                        <Heart size={14} className={isLiked ? 'fill-current text-rose-500' : ''} />
                        {likesCount > 0 && <span>{formatCount(likesCount)}</span>}
                      </button>
                    </div>
                  </div>

                  {/* Hover Overlay */}
                  <div className="masonry-card-overlay">
                    <p className="masonry-prompt-snippet">{item.prompt}</p>

                    <div className="masonry-card-actions">
                      <button
                        type="button"
                        className="masonry-action-btn"
                        onClick={(e) => handleCopyPrompt(e, item)}
                        title="Copy prompt"
                        aria-label="Copy prompt"
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{isCopied ? 'Copied' : 'Prompt'}</span>
                      </button>

                      <button
                        type="button"
                        className="masonry-action-btn masonry-action-icon-only"
                        onClick={(e) => handleDownload(e, item)}
                        title="Download image"
                        aria-label="Download image"
                      >
                        <Download size={13} />
                      </button>

                      <button
                        type="button"
                        className="masonry-action-btn masonry-action-icon-only"
                        onClick={(e) => handleHideItem(e, item)}
                        title="Hide from Explore (Set to Private)"
                        aria-label="Hide from Explore and set to private"
                      >
                        <EyeOff size={13} />
                      </button>

                      <button
                        type="button"
                        className="masonry-action-btn remix"
                        onClick={(e) => handleRemix(e, item)}
                        title="Create with this prompt"
                      >
                        <Sparkles size={13} />
                        <span>Remix</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Append Skeleton Cards during Infinite Pagination */}
          {loading &&
            PAGINATION_SKELETON_ITEMS.map((sk) => (
              <div key={sk.id} className="masonry-card masonry-skeleton-card" aria-hidden="true">
                <div className="masonry-media-wrap" style={{ aspectRatio: sk.ratio }}>
                  <div className="masonry-skeleton-shimmer" />
                  <div className="masonry-skeleton-badge" />
                  <div className="masonry-skeleton-footer">
                    <div className="masonry-skeleton-line" style={{ width: '75%' }} />
                    <div className="masonry-skeleton-line" style={{ width: '45%' }} />
                  </div>
                </div>
              </div>
            ))}
        </div>
      ) : loading ? (
        /* Initial Loading Skeleton Grid (12 items) */
        <div className={`masonry-grid ${density}`} aria-label="Loading stream creations">
          {SKELETON_ITEMS.map((sk) => (
            <div key={sk.id} className="masonry-card masonry-skeleton-card" aria-hidden="true">
              <div className="masonry-media-wrap" style={{ aspectRatio: sk.ratio }}>
                <div className="masonry-skeleton-shimmer" />
                <div className="masonry-skeleton-badge" />
                <div className="masonry-skeleton-footer">
                  <div className="masonry-skeleton-line" style={{ width: '80%' }} />
                  <div className="masonry-skeleton-line" style={{ width: '50%' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="masonry-empty">
          <Layers className="masonry-empty-icon" />
          <h3>{emptyTitle || 'No creations match your filter'}</h3>
          <p>
            {searchQuery
              ? `No creations found for "${searchQuery}". Try a different search term or clear filters.`
              : emptyDescription || 'No public creations are available yet. Create an image in GALX Images and it can appear here.'}
          </p>
          <Link
            href="/images"
            className="masonry-action-btn remix"
            style={{ display: 'inline-flex', padding: '10px 20px' }}
          >
            <Sparkles size={15} />
            <span>Create with GALX Images</span>
          </Link>
        </div>
      )}

      {/* --- Infinite Scroll Sentinel & Loading indicator --- */}
      <div ref={observerTarget} className="masonry-sentinel">
        {loading && items.length === 0 ? null : loading ? (
          <div className="masonry-loading-indicator">
            <span className="masonry-loading-spinner" />
            <span>{loadingLabel || 'Streaming community creations…'}</span>
          </div>
        ) : !hasMore && items.length > 0 ? (
          <p className="masonry-end-message">
            {endMessage || '✦ You’ve explored the entire community stream. Bring your imagination into reality!'}
          </p>
        ) : null}
      </div>

      {/* --- World-Class Lightbox Modal with Zoom & Mobile Swipe --- */}
      {activeModalItem && typeof document !== 'undefined' && createPortal(
        <div
          className="masonry-modal-backdrop"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-prompt-title"
        >
          <div
            className="masonry-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Media side with floating Prev/Next navigators and Zoom */}
            <div className={`masonry-modal-media ${isZoomed ? 'zoomed' : ''}`}>
              <button
                type="button"
                className="masonry-modal-nav prev"
                onClick={handlePrevImage}
                aria-label="Previous image"
                title="Previous image (←)"
              >
                <ChevronLeft size={22} />
              </button>

              <div
                className="masonry-modal-img-container"
                onClick={() => setIsZoomed((prev) => !prev)}
                title={isZoomed ? 'Click to fit view' : 'Click to zoom 1:1'}
              >
                <img
                  src={imageSrcMap[activeModalItem.id] || activeModalItem.public_url}
                  alt={activeModalItem.prompt}
                  className={`masonry-modal-img ${isZoomed ? 'zoomed' : ''}`}
                  onError={(e) => {
                    handleImageError(activeModalItem, e.currentTarget.src);
                  }}
                />
              </div>

              <button
                type="button"
                className="masonry-modal-nav next"
                onClick={handleNextImage}
                aria-label="Next image"
                title="Next image (→)"
              >
                <ChevronRight size={22} />
              </button>

              <div className="masonry-modal-media-controls">
                <button
                  type="button"
                  className="masonry-modal-ctrl-btn"
                  onClick={() => setIsZoomed((prev) => !prev)}
                  title={isZoomed ? 'Fit view (Z)' : 'Zoom 1:1 (Z)'}
                  aria-label="Toggle zoom"
                >
                  {isZoomed ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  <span>{isZoomed ? 'Fit' : '1:1'}</span>
                </button>

                <div className="masonry-modal-counter">
                  {((activeModalIndex ?? 0) + 1)} / {items.length}
                </div>
              </div>

              <button
                ref={modalCloseButtonRef}
                type="button"
                className="masonry-modal-close"
                onClick={(event) => {
                  event.stopPropagation();
                  closeModal();
                }}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Info & Inspector side */}
            <div className="masonry-modal-info">
              <div className="masonry-modal-author">
                <ParticipantIdentity {...activeModalItem.author} showHandle />
              </div>
              <div className="masonry-modal-header">
                <div className="masonry-modal-badges">
                  <span className="masonry-badge masonry-badge-ratio">
                    {activeModalItem.aspect_ratio || '1:1'}
                  </span>
                  <span className="masonry-badge">
                    {new Date(activeModalItem.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  {activeModalItem.views_count ? (
                    <span className="masonry-badge views">
                      <Eye size={12} />
                      {formatCount(activeModalItem.views_count)}
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  className={`masonry-modal-like-btn ${likedMap[activeModalItem.id] ? 'liked' : ''} ${likedPopId === activeModalItem.id ? 'pop' : ''}`}
                  onClick={(e) => handleToggleLike(e, activeModalItem)}
                  title="Like creation"
                >
                  <Heart size={16} className={likedMap[activeModalItem.id] ? 'fill-current text-rose-500' : ''} />
                  <span>{formatCount(likesCountMap[activeModalItem.id] ?? activeModalItem.likes_count ?? 0)}</span>
                </button>
              </div>

              <h4 className="masonry-modal-section-title" id="modal-prompt-title">
                Prompt
              </h4>
              <p className="masonry-modal-prompt">{activeModalItem.prompt}</p>

              {/* Technical Metadata Grid */}
              <div className="masonry-modal-meta-grid">
                <div className="masonry-meta-item">
                  <div className="masonry-meta-label">Dimensions</div>
                  <div className="masonry-meta-value">
                    {activeModalItem.dimensions || '1024 × 1024'}
                  </div>
                </div>
                <div className="masonry-meta-item">
                  <div className="masonry-meta-label">Service</div>
                  <div className="masonry-meta-value">GALX Nova</div>
                </div>
                <div className="masonry-meta-item">
                  <div className="masonry-meta-label">Visibility</div>
                  <div className="masonry-meta-value">
                    Public Community
                  </div>
                </div>
              </div>

              {/* Actions Grid */}
              <div className="masonry-modal-actions">
                <button
                  type="button"
                  className="masonry-modal-primary-btn"
                  onClick={() => {
                    if (onSelectPrompt) {
                      onSelectPrompt(activeModalItem.prompt, activeModalItem.aspect_ratio || undefined);
                      closeModal();
                      return;
                    }
                    const params = new URLSearchParams();
                    params.set('prompt', activeModalItem.prompt);
                    if (activeModalItem.aspect_ratio) {
                      params.set('aspect_ratio', activeModalItem.aspect_ratio);
                    }
                    params.set('tab', 'creations');
                    router.push(`/images?${params.toString()}`);
                  }}
                >
                  <Sparkles size={16} />
                  <span>Remix in GALX Studio</span>
                </button>

                <button
                  type="button"
                  className="masonry-modal-secondary-btn"
                  onClick={(e) => handleShareLink(e, activeModalItem)}
                  title="Copy direct shareable creation link"
                >
                  <Share2 size={15} />
                  <span>Share Creation Link</span>
                </button>

                <button
                  type="button"
                  className="masonry-modal-secondary-btn"
                  onClick={(e) => handleCopyPrompt(e, activeModalItem)}
                >
                  {copiedId === activeModalItem.id ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedId === activeModalItem.id ? 'Copied to Clipboard!' : 'Copy Full Prompt'}</span>
                </button>

                <button
                  type="button"
                  className="masonry-modal-secondary-btn"
                  onClick={(e) => handleDownload(e, activeModalItem)}
                >
                  <Download size={15} />
                  <span>Download High-Resolution Image</span>
                </button>
              </div>

              {/* Community Safety & Moderation Card */}
              <div className="masonry-moderation-card">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                  <ShieldAlert size={14} />
                  <span>Community Safety & Moderation</span>
                </div>
                <p className="masonry-moderation-desc">
                  Notice inappropriate or sensitive content? Hiding this item immediately removes it from Explore and resets its status to private in the creator's personal library.
                </p>
                <button
                  type="button"
                  className="masonry-modal-hide-btn"
                  onClick={(e) => handleHideItem(e, activeModalItem)}
                  title="Hide from Explore and set to private"
                >
                  <EyeOff size={13} />
                  <span>Hide from Explore (Set to Private)</span>
                </button>
              </div>

              {/* Keyboard Shortcuts Hint */}
              <div className="masonry-modal-shortcuts">
                <span><kbd>Esc</kbd> Close</span>
                <span><kbd>←</kbd> <kbd>→</kbd> Navigate</span>
                <span><kbd>Z</kbd> Zoom 1:1</span>
                <span><kbd>C</kbd> Copy</span>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
