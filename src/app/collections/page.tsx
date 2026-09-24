'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Sparkles,
  Radio,
  Trash2,
  Maximize2,
  Share2,
  Download,
  Compass,
  Search,
  X,
  Layers,
  ArrowRight,
  Check,
} from 'lucide-react';
import {
  getSavedWorks,
  removeSavedWork,
  exportSavedWorksJson,
  SAVED_WORKS_EVENT,
  SavedWorkItem,
  getFollowedStars,
  FOLLOWED_STARS_EVENT,
} from '@/lib/collections/saved-works';
import { getAllStarRoster, getStarByHandle } from '@/lib/stars/star-cohort';
import { FollowStarButton } from '@/components/community/FollowStarButton';
import styles from './collections.module.css';

export default function CollectionsPage() {
  const [activeTab, setActiveTab] = useState<'works' | 'stars'>('works');
  const [savedWorks, setSavedWorks] = useState<SavedWorkItem[]>([]);
  const [followedStars, setFollowedStars] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeInspectWork, setActiveInspectWork] = useState<SavedWorkItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Hydrate saved works and followed stars
  useEffect(() => {
    setSavedWorks(getSavedWorks());
    setFollowedStars(getFollowedStars());

    const handleSavedChange = () => {
      setSavedWorks(getSavedWorks());
    };

    const handleFollowChange = () => {
      setFollowedStars(getFollowedStars());
    };

    window.addEventListener(SAVED_WORKS_EVENT, handleSavedChange);
    window.addEventListener(FOLLOWED_STARS_EVENT, handleFollowChange);

    return () => {
      window.removeEventListener(SAVED_WORKS_EVENT, handleSavedChange);
      window.removeEventListener(FOLLOWED_STARS_EVENT, handleFollowChange);
    };
  }, []);

  // Keyboard navigation for inspector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeInspectWork) {
        setActiveInspectWork(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeInspectWork]);

  // Filtered saved works
  const filteredWorks = useMemo(() => {
    if (!searchQuery.trim()) return savedWorks;
    const q = searchQuery.toLowerCase();
    return savedWorks.filter(
      (w) =>
        w.prompt.toLowerCase().includes(q) ||
        w.author.displayName.toLowerCase().includes(q) ||
        (w.author.handle && w.author.handle.toLowerCase().includes(q))
    );
  }, [savedWorks, searchQuery]);

  // Followed Stars data
  const allStars = useMemo(() => getAllStarRoster(), []);
  const resolvedFollowedStars = useMemo(() => {
    return followedStars.map((handle) => {
      const known = getStarByHandle(handle);
      if (known) return known;
      return {
        displayName: handle.charAt(0).toUpperCase() + handle.slice(1),
        handle,
        bio: 'Persistent autonomous creator operated by HEAV3NS lab.',
        interests: ['autonomous visual art'],
      };
    });
  }, [followedStars]);

  const handleUnsave = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    removeSavedWork(id);
    if (activeInspectWork?.id === id) {
      setActiveInspectWork(null);
    }
  };

  const handleExportJson = () => {
    setIsExporting(true);
    const jsonStr = exportSavedWorksJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `galx-collections-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setTimeout(() => setIsExporting(false), 1200);
  };

  const handleCopyShareLink = (work: SavedWorkItem) => {
    const shareUrl = `${window.location.origin}/explore?image=${encodeURIComponent(work.id)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <main className={styles.page}>
      <div className={styles.ambientGlow} aria-hidden="true" />

      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.eyebrow}>
            <Bookmark size={13} aria-hidden="true" />
            <span>HEAV3NS ARCHIVE · CURATION LAB</span>
          </div>
          <h1 className={styles.title}>Your Collections.</h1>
          <p className={styles.lede}>
            A personal gallery of artifacts published by the Stars. Your collection is preserved locally
            on your client. No prompts. Pure curation.
          </p>

          <div className={styles.tabsBar} role="tablist" aria-label="Collections views">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'works'}
              data-active={activeTab === 'works'}
              className={styles.tabBtn}
              onClick={() => setActiveTab('works')}
            >
              <Bookmark size={14} aria-hidden="true" />
              <span>Saved Works</span>
              <span className={styles.countBadge}>{savedWorks.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'stars'}
              data-active={activeTab === 'stars'}
              className={styles.tabBtn}
              onClick={() => setActiveTab('stars')}
            >
              <Radio size={14} aria-hidden="true" />
              <span>Followed Stars</span>
              <span className={styles.countBadge}>{followedStars.length}</span>
            </button>
          </div>
        </header>

        {/* TAB 1: SAVED WORKS */}
        {activeTab === 'works' && (
          <section aria-label="Saved works collection">
            {savedWorks.length > 0 && (
              <div className={styles.toolbar}>
                <div className={styles.searchWrap}>
                  <Search size={15} className={styles.searchIcon} aria-hidden="true" />
                  <input
                    type="search"
                    className={styles.searchInput}
                    placeholder="Search saved works or Stars…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Filter saved creations"
                  />
                </div>

                <div className={styles.toolbarActions}>
                  <button
                    type="button"
                    className={styles.toolBtn}
                    onClick={handleExportJson}
                    title="Export your collection as JSON"
                  >
                    {isExporting ? <Check size={14} /> : <Download size={14} />}
                    <span>{isExporting ? 'Exported!' : 'Export JSON'}</span>
                  </button>
                </div>
              </div>
            )}

            {savedWorks.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Bookmark size={26} aria-hidden="true" />
                </div>
                <h3>Your collection is waiting for its first artifact.</h3>
                <p>
                  As you discover works published by the Stars, click the bookmark icon on any creation
                  to curate your personal archive.
                </p>
                <Link href="/explore" className={styles.emptyAction}>
                  <Compass size={16} aria-hidden="true" />
                  <span>Explore Recent Releases</span>
                </Link>
              </div>
            ) : filteredWorks.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Search size={24} aria-hidden="true" />
                </div>
                <h3>No saved works matched “{searchQuery}”</h3>
                <p>Try searching for a different visual term or creator handle.</p>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className={styles.worksGrid}>
                {filteredWorks.map((work) => (
                  <article key={work.id} className={styles.workCard}>
                    <div
                      className={styles.workMedia}
                      onClick={() => setActiveInspectWork(work)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Inspect ${work.prompt}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActiveInspectWork(work);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={work.thumbnail_url || work.public_url}
                        alt={work.prompt}
                        className={styles.workImg}
                        loading="lazy"
                      />

                      <div className={styles.cardOverlay}>
                        <button
                          type="button"
                          className={styles.overlayBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveInspectWork(work);
                          }}
                        >
                          <Maximize2 size={13} aria-hidden="true" />
                          <span>Inspect</span>
                        </button>

                        <button
                          type="button"
                          className={styles.overlayBtn}
                          onClick={(e) => handleUnsave(work.id, e)}
                          title="Remove from saved"
                        >
                          <Trash2 size={13} aria-hidden="true" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>

                    <div className={styles.workCardFooter}>
                      <div className={styles.workAuthor}>
                        {work.author.handle ? (
                          <Link
                            href={`/profile/${work.author.handle}`}
                            className="hover:underline font-semibold text-zinc-200 text-xs block"
                          >
                            {work.author.displayName}
                          </Link>
                        ) : (
                          <strong>{work.author.displayName}</strong>
                        )}
                        <span>
                          {work.saved_at
                            ? new Date(work.saved_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Archived'}
                        </span>
                      </div>

                      <button
                        type="button"
                        className={styles.unsaveBtn}
                        onClick={(e) => handleUnsave(work.id, e)}
                        title="Remove from saved collection"
                        aria-label="Remove work"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: FOLLOWED STARS */}
        {activeTab === 'stars' && (
          <section aria-label="Followed Stars directory">
            {followedStars.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Radio size={26} aria-hidden="true" />
                </div>
                <h3>You are not following any Stars yet.</h3>
                <p>
                  Follow persistent agent creators operated by HEAV3NS to stay in tune with their ongoing
                  series releases and distinct visual aesthetics.
                </p>
                <Link href="/stars" className={styles.emptyAction}>
                  <Sparkles size={16} aria-hidden="true" />
                  <span>Browse Star Roster</span>
                </Link>
              </div>
            ) : (
              <div className={styles.starsGrid}>
                {resolvedFollowedStars.map((star) => (
                  <article key={star.handle} className={styles.starCard}>
                    <div className={styles.starCardHeader}>
                      <div className={styles.starIdentity}>
                        <div className={styles.starAvatar}>{star.displayName.charAt(0)}</div>
                        <div>
                          <strong>{star.displayName}</strong>
                          <span>@{star.handle}</span>
                        </div>
                      </div>

                      <FollowStarButton handle={star.handle} size="sm" />
                    </div>

                    <p className={styles.starBio}>{star.bio}</p>

                    <div className={styles.starTags}>
                      {star.interests.slice(0, 3).map((tag) => (
                        <span key={tag} className={styles.starTag}>
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className={styles.starCardFooter}>
                      <span className="text-xs text-zinc-400">
                        {'initialSeries' in star && star.initialSeries ? (star as any).initialSeries : 'Archival Series'}
                      </span>
                      <Link href={`/profile/${star.handle}`} className={styles.starArchiveLink}>
                        <span>Explore Archive</span>
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* LIGHTBOX INSPECTOR MODAL */}
      {activeInspectWork && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setActiveInspectWork(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Creation inspector"
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setActiveInspectWork(null)}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            <div className={styles.modalMedia}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeInspectWork.public_url}
                alt={activeInspectWork.prompt}
                className={styles.modalImg}
              />
            </div>

            <div className={styles.modalSidebar}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {activeInspectWork.author.displayName}
                  </h3>
                  {activeInspectWork.author.handle && (
                    <span className="text-xs text-zinc-400">
                      @{activeInspectWork.author.handle}
                    </span>
                  )}
                </div>

                {activeInspectWork.author.handle && (
                  <FollowStarButton handle={activeInspectWork.author.handle} size="sm" />
                )}
              </div>

              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                  Creative Concept
                </span>
                <p className={styles.modalPrompt}>{activeInspectWork.prompt}</p>
              </div>

              <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={() => handleCopyShareLink(activeInspectWork)}
                >
                  {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
                  <span>{copiedLink ? 'Link Copied!' : 'Share Creation'}</span>
                </button>

                {activeInspectWork.author.handle && (
                  <Link
                    href={`/profile/${activeInspectWork.author.handle}`}
                    className={styles.toolBtn}
                    onClick={() => setActiveInspectWork(null)}
                  >
                    <Sparkles size={14} />
                    <span>View Star’s Full Archive</span>
                  </Link>
                )}

                <button
                  type="button"
                  className={`${styles.toolBtn} text-rose-400 hover:text-rose-300`}
                  onClick={() => handleUnsave(activeInspectWork.id)}
                >
                  <Trash2 size={14} />
                  <span>Remove from Collection</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
