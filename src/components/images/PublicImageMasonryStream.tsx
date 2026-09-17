'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Heart,
  Flame,
  Clock,
  Layers,
  Eye,
} from 'lucide-react';
import type { PublicFeedItem } from '@/app/api/images/feed/route';
import './masonry-stream.css';

interface PublicImageMasonryStreamProps {
  initialItems?: PublicFeedItem[];
  initialCursor?: string | null;
  className?: string;
  showToolbar?: boolean;
  onSelectPrompt?: (prompt: string, ratio?: string) => void;
  externalQuery?: string;
}

const FILTER_PILLS = [
  { label: 'All', value: null },
  { label: 'Square 1:1', value: '1:1' },
  { label: 'Wide 16:9', value: '16:9' },
  { label: 'Portrait 9:16', value: '9:16' },
  { label: 'Classic 3:2', value: '3:2' },
  { label: 'Standard 4:3', value: '4:3' },
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
  className = '',
  showToolbar = true,
  onSelectPrompt,
  externalQuery,
}: PublicImageMasonryStreamProps) {
  const router = useRouter();
  const [items, setItems] = useState<PublicFeedItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortMode, setSortMode] = useState<'recent' | 'trending'>('trending');
  const [selectedRatio, setSelectedRatio] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalIndex, setActiveModalIndex] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);

  const observerTarget = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2400);
  }, []);

  // Fetch feed items with resilient error catching
  const fetchFeed = useCallback(
    async (
      nextCursor: string | null = null,
      reset = false,
      ratio: string | null = selectedRatio,
      query: string = searchQuery,
      sort: 'recent' | 'trending' = sortMode
    ) => {
      if (loading) return;
      setLoading(true);
      setFetchError(null);

      try {
        const params = new URLSearchParams();
        params.set('limit', '24');
        params.set('sort', sort);
        if (nextCursor) params.set('cursor', nextCursor);
        if (ratio) params.set('aspect_ratio', ratio);
        if (query.trim()) params.set('q', query.trim());

        const res = await fetch(`/api/images/feed?${params.toString()}`);
        if (!res.ok) {
          // If server error occurs, do not throw unhandled exception
          setFetchError('Transient stream error; serving curated collection.');
          return;
        }

        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
          setCursor(data.nextCursor);
          setHasMore(Boolean(data.nextCursor));

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
        setFetchError('Stream connection offline; displaying showcase images.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loading, selectedRatio, searchQuery, sortMode]
  );

  // Initial load if no initial items supplied
  useEffect(() => {
    if (initialItems.length === 0) {
      void fetchFeed(null, true);
    }
  }, [fetchFeed, initialItems.length]);

  // Synchronize external query changes if supplied
  useEffect(() => {
    if (externalQuery !== undefined && externalQuery !== searchQuery) {
      setSearchQuery(externalQuery);
      setCursor(null);
      void fetchFeed(null, true, selectedRatio, externalQuery, sortMode);
    }
  }, [externalQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle sort change
  const handleSortChange = (sort: 'recent' | 'trending') => {
    if (sort === sortMode) return;
    setSortMode(sort);
    setCursor(null);
    void fetchFeed(null, true, selectedRatio, searchQuery, sort);
  };

  // Handle ratio filter change
  const handleRatioChange = (ratio: string | null) => {
    setSelectedRatio(ratio);
    setCursor(null);
    void fetchFeed(null, true, ratio, searchQuery, sortMode);
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
      void fetchFeed(null, true, selectedRatio, value, sortMode);
    }, 350);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCursor(null);
    void fetchFeed(null, true, selectedRatio, '', sortMode);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setCursor(null);
    void fetchFeed(null, true, selectedRatio, searchQuery, sortMode);
  };

  // Infinite scroll intersection observer
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          void fetchFeed(cursor, false);
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [cursor, hasMore, loading, fetchFeed]);

  // Copy prompt helper
  const handleCopyPrompt = (e: React.MouseEvent, item: PublicFeedItem) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.prompt);
    setCopiedId(item.id);
    showToast('Prompt copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Like toggle with optimistic UI and server sync
  const handleToggleLike = (e: React.MouseEvent, item: PublicFeedItem) => {
    e.stopPropagation();
    const currentlyLiked = Boolean(likedMap[item.id]);
    const nextLiked = !currentlyLiked;

    setLikedMap((prev) => ({ ...prev, [item.id]: nextLiked }));
    setLikesCountMap((prev) => {
      const current = prev[item.id] ?? item.likes_count ?? 0;
      return { ...prev, [item.id]: Math.max(0, current + (nextLiked ? 1 : -1)) };
    });

    if (nextLiked) {
      showToast('Liked creation');
    }

    // Fire-and-forget sync to API
    void fetch('/api/images/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'like', imageId: item.id, increment: nextLiked }),
    }).catch(() => {});
  };

  // Remix / create with this prompt
  const handleRemix = (e: React.MouseEvent, item: PublicFeedItem) => {
    e.stopPropagation();

    // Fire remix telemetry
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
    if (item.seed) params.set('seed', item.seed);
    router.push(`/images?${params.toString()}`);
  };

  // Download image
  const handleDownload = async (e: React.MouseEvent, item: PublicFeedItem) => {
    e.stopPropagation();
    try {
      const a = document.createElement('a');
      a.href = item.public_url;
      a.download = `galx-${item.id}.jpg`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Downloading high-res image');
    } catch {
      showToast('Failed to trigger download');
    }
  };

  // Modal navigation helpers
  const activeModalItem = activeModalIndex !== null && items[activeModalIndex] ? items[activeModalIndex] : null;

  const handlePrevImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveModalIndex((prev) => {
      if (prev === null || items.length === 0) return null;
      return prev > 0 ? prev - 1 : items.length - 1;
    });
  }, [items.length]);

  const handleNextImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveModalIndex((prev) => {
      if (prev === null || items.length === 0) return null;
      return prev < items.length - 1 ? prev + 1 : 0;
    });
  }, [items.length]);

  // Modal keyboard handling (Esc to close, Left/Right arrows to navigate, C to copy)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeModalItem) return;

      if (e.key === 'Escape') {
        setActiveModalIndex(null);
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
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
  }, [activeModalItem, handlePrevImage, handleNextImage, showToast]);

  return (
    <div className={`masonry-stream-container ${className}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="masonry-toast" role="status" aria-live="polite">
          <Sparkles size={14} className="masonry-toast-icon" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* --- Toolbar --- */}
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
        <div className="masonry-grid" aria-label="Image creations stream">
          {items.map((item, idx) => {
            const isLoaded = loadedImages[item.id];
            const isCopied = copiedId === item.id;
            const isLiked = Boolean(likedMap[item.id]);
            const likesCount = likesCountMap[item.id] ?? item.likes_count ?? 0;
            const ratioCss = ratioToCss(item.aspect_ratio);

            return (
              <article
                key={item.id}
                className="masonry-card"
                onClick={() => setActiveModalIndex(idx)}
                tabIndex={0}
                role="button"
                aria-label={`View image: ${item.prompt}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveModalIndex(idx);
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

                  {/* High-res Image */}
                  <img
                    src={item.public_url}
                    alt={item.prompt}
                    loading="lazy"
                    className={`masonry-image ${isLoaded ? 'loaded' : ''}`}
                    onLoad={() => setLoadedImages((prev) => ({ ...prev, [item.id]: true }))}
                  />

                  {/* Top Floating Badges & Like Button */}
                  <div className="masonry-card-topbar">
                    <span className="masonry-badge masonry-badge-ratio">
                      {item.aspect_ratio || '1:1'}
                    </span>

                    <button
                      type="button"
                      className={`masonry-like-btn ${isLiked ? 'liked' : ''}`}
                      onClick={(e) => handleToggleLike(e, item)}
                      title={isLiked ? 'Unlike' : 'Like'}
                      aria-label="Like creation"
                    >
                      <Heart size={14} className={isLiked ? 'fill-current text-rose-500' : ''} />
                      {likesCount > 0 && <span>{formatCount(likesCount)}</span>}
                    </button>
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
        </div>
      ) : !loading ? (
        <div className="masonry-empty">
          <Layers className="masonry-empty-icon" />
          <h3>No creations match your filter</h3>
          <p>
            {searchQuery
              ? `No creations found for "${searchQuery}". Try a different search term or clear filters.`
              : 'The image stream is currently warming up. Create the very first public image!'}
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
      ) : null}

      {/* --- Infinite Scroll Sentinel & Loading indicator --- */}
      <div ref={observerTarget} className="masonry-sentinel">
        {loading && (
          <div className="masonry-loading-indicator">
            <span className="masonry-loading-spinner" />
            <span>Streaming community creations…</span>
          </div>
        )}
        {!hasMore && items.length > 0 && (
          <p className="masonry-end-message">
            ✦ You’ve explored the entire community stream. Bring your imagination into reality!
          </p>
        )}
      </div>

      {/* --- World-Class Lightbox Modal --- */}
      {activeModalItem && (
        <div
          className="masonry-modal-backdrop"
          onClick={() => setActiveModalIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-prompt-title"
        >
          <div
            className="masonry-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="masonry-modal-close"
              onClick={() => setActiveModalIndex(null)}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            {/* Media side with floating Prev/Next navigators */}
            <div className="masonry-modal-media">
              <button
                type="button"
                className="masonry-modal-nav prev"
                onClick={handlePrevImage}
                aria-label="Previous image"
                title="Previous image (←)"
              >
                <ChevronLeft size={22} />
              </button>

              <img
                src={activeModalItem.public_url}
                alt={activeModalItem.prompt}
                className="masonry-modal-img"
              />

              <button
                type="button"
                className="masonry-modal-nav next"
                onClick={handleNextImage}
                aria-label="Next image"
                title="Next image (→)"
              >
                <ChevronRight size={22} />
              </button>

              <div className="masonry-modal-counter">
                {((activeModalIndex ?? 0) + 1)} / {items.length}
              </div>
            </div>

            {/* Info & Inspector side */}
            <div className="masonry-modal-info">
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
                  className={`masonry-modal-like-btn ${likedMap[activeModalItem.id] ? 'liked' : ''}`}
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
                  <div className="masonry-meta-label">Model Engine</div>
                  <div className="masonry-meta-value">
                    {activeModalItem.model === 'openai-gpt-image-latest' ? 'GPT-Image-2' : activeModalItem.model}
                  </div>
                </div>
                {activeModalItem.seed && (
                  <div className="masonry-meta-item">
                    <div className="masonry-meta-label">Seed</div>
                    <div className="masonry-meta-value">
                      #{activeModalItem.seed}
                    </div>
                  </div>
                )}
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
                      setActiveModalIndex(null);
                      return;
                    }
                    const params = new URLSearchParams();
                    params.set('prompt', activeModalItem.prompt);
                    if (activeModalItem.aspect_ratio) {
                      params.set('aspect_ratio', activeModalItem.aspect_ratio);
                    }
                    if (activeModalItem.seed) {
                      params.set('seed', activeModalItem.seed);
                    }
                    router.push(`/images?${params.toString()}`);
                  }}
                >
                  <Sparkles size={16} />
                  <span>Remix in GALX Studio</span>
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

              {/* Keyboard Shortcuts Hint */}
              <div className="masonry-modal-shortcuts">
                <span><kbd>Esc</kbd> Close</span>
                <span><kbd>←</kbd> <kbd>→</kbd> Navigate</span>
                <span><kbd>C</kbd> Copy prompt</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
