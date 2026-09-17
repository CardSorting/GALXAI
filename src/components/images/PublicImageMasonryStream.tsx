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
  ExternalLink,
  Layers,
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
  const [selectedRatio, setSelectedRatio] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalItem, setActiveModalItem] = useState<PublicFeedItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const observerTarget = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch feed items
  const fetchFeed = useCallback(
    async (
      nextCursor: string | null = null,
      reset = false,
      ratio: string | null = selectedRatio,
      query: string = searchQuery
    ) => {
      if (loading) return;
      setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set('limit', '24');
        if (nextCursor) params.set('cursor', nextCursor);
        if (ratio) params.set('aspect_ratio', ratio);
        if (query.trim()) params.set('q', query.trim());

        const res = await fetch(`/api/images/feed?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch feed');
        const data = await res.json();

        if (data.success && Array.isArray(data.items)) {
          setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
          setCursor(data.nextCursor);
          setHasMore(Boolean(data.nextCursor));
        }
      } catch (err) {
        console.error('Error fetching image feed:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loading, selectedRatio, searchQuery]
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
      void fetchFeed(null, true, selectedRatio, externalQuery);
    }
  }, [externalQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle ratio filter change
  const handleRatioChange = (ratio: string | null) => {
    setSelectedRatio(ratio);
    setCursor(null);
    void fetchFeed(null, true, ratio, searchQuery);
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
      void fetchFeed(null, true, selectedRatio, value);
    }, 350);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCursor(null);
    void fetchFeed(null, true, selectedRatio, '');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setCursor(null);
    void fetchFeed(null, true, selectedRatio, searchQuery);
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
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Remix / create with this prompt
  const handleRemix = (e: React.MouseEvent, item: PublicFeedItem) => {
    e.stopPropagation();
    if (onSelectPrompt) {
      onSelectPrompt(item.prompt, item.aspect_ratio || undefined);
      return;
    }
    const params = new URLSearchParams();
    params.set('prompt', item.prompt);
    if (item.aspect_ratio) params.set('aspect_ratio', item.aspect_ratio);
    router.push(`/images?${params.toString()}`);
  };

  // Download image
  const handleDownload = async (e: React.MouseEvent, item: PublicFeedItem) => {
    e.stopPropagation();
    try {
      const a = document.createElement('a');
      a.href = item.public_url;
      a.download = `galx-${item.id}.png`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  // Modal keyboard Esc handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModalItem) {
        setActiveModalItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModalItem]);

  return (
    <div className={`masonry-stream-container ${className}`}>
      {/* --- Toolbar --- */}
      {showToolbar && (
        <div className="masonry-toolbar">
          <div className="masonry-toolbar-left">
            <div className="masonry-live-badge">
              <span className="masonry-live-pulse" />
              <span>Public Stream</span>
            </div>

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

      {/* --- Pinterest-Style Masonry Grid --- */}
      {items.length > 0 ? (
        <div className="masonry-grid" aria-label="Image creations stream">
          {items.map((item) => {
            const isLoaded = loadedImages[item.id];
            const isCopied = copiedId === item.id;
            const ratioCss = ratioToCss(item.aspect_ratio);

            return (
              <article
                key={item.id}
                className="masonry-card"
                onClick={() => setActiveModalItem(item)}
                tabIndex={0}
                role="button"
                aria-label={`View image: ${item.prompt}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveModalItem(item);
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

                  {/* Top Badges */}
                  <div className="masonry-card-badges">
                    <span className="masonry-badge masonry-badge-ratio">
                      {item.aspect_ratio || '1:1'}
                    </span>
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
                        <span>Create</span>
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
          <h3>No images match your filter</h3>
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
            ✦ You’ve reached the beginning of the stream. Bring a new idea into the world!
          </p>
        )}
      </div>

      {/* --- Lightbox Modal --- */}
      {activeModalItem && (
        <div
          className="masonry-modal-backdrop"
          onClick={() => setActiveModalItem(null)}
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
              onClick={() => setActiveModalItem(null)}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            {/* Media side */}
            <div className="masonry-modal-media">
              <img
                src={activeModalItem.public_url}
                alt={activeModalItem.prompt}
                className="masonry-modal-img"
              />
            </div>

            {/* Info side */}
            <div className="masonry-modal-info">
              <div className="masonry-modal-header">
                <span className="masonry-badge masonry-badge-ratio">
                  {activeModalItem.aspect_ratio || '1:1'}
                </span>
                <span className="masonry-badge">
                  {new Date(activeModalItem.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <h4 className="masonry-modal-section-title" id="modal-prompt-title">
                Creation Prompt
              </h4>
              <p className="masonry-modal-prompt">{activeModalItem.prompt}</p>

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
              </div>

              <div className="masonry-modal-actions">
                <button
                  type="button"
                  className="masonry-modal-primary-btn"
                  onClick={() => {
                    if (onSelectPrompt) {
                      onSelectPrompt(activeModalItem.prompt, activeModalItem.aspect_ratio || undefined);
                      setActiveModalItem(null);
                      return;
                    }
                    const params = new URLSearchParams();
                    params.set('prompt', activeModalItem.prompt);
                    if (activeModalItem.aspect_ratio) {
                      params.set('aspect_ratio', activeModalItem.aspect_ratio);
                    }
                    router.push(`/images?${params.toString()}`);
                  }}
                >
                  <Sparkles size={16} />
                  <span>Create with this Prompt</span>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
