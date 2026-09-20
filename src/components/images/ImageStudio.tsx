'use client';

import Link from 'next/link';
import { GenerationGateNotice, useGenerationGate } from '@/components/dashboard/GenerationGateNotice';
import { usePathname } from 'next/navigation';
import { IMAGE_PATHS, imageView, type ImageView } from '@/lib/images/navigation';
import { authEntryPath } from '@/lib/auth/redirects';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Check,
  ChevronDown,
  Compass,
  Copy,
  ImageIcon,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspaceSessionBoundary } from '@/components/auth/WorkspaceSessionBoundary';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import {
  DEFAULT_SETTINGS,
  IMAGE_MODEL,
  INSPIRATION_PROMPTS,
  MAX_PROMPT,
  RATIOS,
  readSettings,
  type StudioImage,
  type StudioSettings,
} from './studio-contract';
import { useImageStudio } from './use-image-studio';
import { StudioArtwork as Artwork } from './StudioArtwork';
import { PublicImageMasonryStream } from './PublicImageMasonryStream';
import './studio.css';

export function ImageStudio() {
  const { user, isLoading } = useAuth();
  return (
    <WorkspaceSessionBoundary>
      <StudioWorkspace
        key={user?.id || 'guest'}
        owner={user?.id || null}
        token={user?.token}
        authLoading={isLoading}
      />
    </WorkspaceSessionBoundary>
  );
}

function StudioWorkspace({
  owner,
  token,
  authLoading,
}: {
  owner: string | null;
  token?: string;
  authLoading: boolean;
}) {
  const pathname = usePathname();
  const selectedView = imageView(pathname);
  const [activeTab, setActiveTab] = useState<'stream' | 'creations' | 'favorites'>('stream');
  const [active, setActive] = useState<StudioImage | null>(null);
  const [activeCollection, setActiveCollection] = useState<StudioImage[]>([]);
  const [activeSource, setActiveSource] = useState<'create' | 'library'>('create');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const studio = useImageStudio(
    owner,
    token,
    activeTab === 'creations' || selectedView === 'library',
    selectedId,
    activeTab === 'favorites' || selectedView === 'favorites'
  );

  const [detailError, setDetailError] = useState('');
  const [detailRevision, setDetailRevision] = useState(0);
  const [reusing, setReusing] = useState<string | null>(null);
  const reuseController = useRef<AbortController | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const downloadingLock = useRef(false);
  const lastCopied = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { settings, setSettings, getDetails } = studio;
  const gate = useGenerationGate('images', false, settings.count);
  const busy = studio.submitting || studio.polling;
  const activeImage = active;
  const activeIndex = activeCollection.findIndex((image) => image.id === active?.id);
  const dialogOpen = Boolean(active);
  const readinessNotice = studio.error
    ? {
        tone: 'error',
        title: studio.uncertain ? 'We couldn’t confirm that generation' : 'Generation needs your attention',
        body: studio.error,
        action: studio.uncertain ? 'Check My Creations' : 'Check again',
      }
      : studio.availability === 'unavailable'
        ? {
            tone: 'warning',
            title: 'Image creation is busy right now',
            body: 'Your prompt is saved. We’ll check again automatically, or you can retry now.',
            action: 'Check again',
          }
        : null;

  // Sync route to active tab
  useEffect(() => {
    if (selectedView === 'favorites') {
      setActiveTab('favorites');
    } else if (selectedView === 'library') {
      setActiveTab('creations');
    }
  }, [selectedView]);

  // If new creations arrive, switch view or celebrate
  useEffect(() => {
    if (studio.creations.length > 0 && !busy) {
      // User created an image, ensure creations tab is visible
      setActiveTab('creations');
    }
  }, [studio.creations.length, busy]);

  // Load image details in inspector modal
  useEffect(() => {
    if (!active) {
      setActiveCollection([]);
      setDetailError('');
      return;
    }
    if (active.detailsLoaded !== false) return;
    const controller = new AbortController();
    setDetailError('');
    void getDetails(active, controller.signal)
      .then((image) => {
        if (!controller.signal.aborted) setActive(image);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setDetailError('Details couldn’t be loaded. Your image is still here.');
      });
    return () => controller.abort();
  }, [active, getDetails, detailRevision]);

  useEffect(() => () => reuseController.current?.abort(), []);

  // Parse prompt from URL if user arrived from homepage remix or explore stream
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const urlPrompt = sp.get('prompt');
      const urlRatio = sp.get('aspect_ratio') || sp.get('ratio');
      const urlTab = sp.get('tab');

      if (urlPrompt || urlRatio) {
        setSettings((prev) => ({
          ...prev,
          ...(urlPrompt ? { prompt: urlPrompt } : {}),
          ...(urlRatio && ['1:1', '16:9', '9:16', '3:2', '4:3'].includes(urlRatio)
            ? { ratio: urlRatio as any }
            : {}),
        }));
        setActiveTab('creations');
        requestAnimationFrame(() => {
          promptRef.current?.focus();
        });
      } else if (urlTab === 'stream') {
        setActiveTab('stream');
      } else if (urlTab === 'favorites') {
        setActiveTab('favorites');
      } else if (urlTab === 'creations') {
        setActiveTab('creations');
      }
    }
  }, [setSettings]);

  // Dialog open/close lifecycle
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialogOpen || !dialog) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    const canvas = canvasRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      (returnFocus.current?.isConnected ? returnFocus.current : canvas)?.focus({
        preventScroll: true,
      });
    };
  }, [dialogOpen]);

  useEffect(() => () => {
    if (lastCopied.current) clearTimeout(lastCopied.current);
  }, []);

  function changeView(next: ImageView) {
    const path = IMAGE_PATHS[next];
    if (window.location.pathname !== path) window.history.pushState(null, '', path);
    if (next === 'favorites') setActiveTab('favorites');
    else if (next === 'library') setActiveTab('creations');
    else setActiveTab('stream');
  }

  function focusPrompt() {
    requestAnimationFrame(() => {
      promptRef.current?.focus();
      promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  function applyPrompt(prompt: string, ratio: string = '1:1', quality: string = 'standard') {
    setSettings((prev) =>
      readSettings({
        ...prev,
        prompt,
        ratio: (['1:1', '16:9', '9:16', '3:2', '4:3'].includes(ratio) ? ratio : '1:1') as any,
        quality: (quality === 'hd' ? 'hd' : 'standard') as any,
      })
    );
    setActive(null);
    setCopied(false);
    studio.setNotice('Prompt applied to studio dock.');
    focusPrompt();
  }

  async function reusePrompt(image: StudioImage) {
    reuseController.current?.abort();
    const controller = new AbortController();
    reuseController.current = controller;
    setReusing(image.id);
    try {
      const detail = await studio.getDetails(image, controller.signal);
      if (!controller.signal.aborted) {
        applyPrompt(detail.prompt, detail.ratio, detail.quality);
      }
    } catch {
      if (!controller.signal.aborted) {
        studio.setNotice('The prompt couldn’t be loaded. Try again.');
      }
    } finally {
      if (!controller.signal.aborted) setReusing(null);
    }
  }

  function openImage(image: StudioImage, source: 'create' | 'library') {
    setActiveCollection(source === 'create' ? studio.creations : studio.images);
    setActiveSource(source);
    setActive(image);
    setCopied(false);
  }

  function browseImage(direction: number) {
    const image = activeCollection[activeIndex + direction];
    if (!image) return;
    setActive(image);
    setCopied(false);
    if (activeSource === 'create') setSelectedId(image.id);
  }

  async function download(image: StudioImage) {
    if (downloadingLock.current) return;
    downloadingLock.current = true;
    setDownloading(true);
    try {
      let blob: Blob;
      if (image.url.startsWith('data:')) {
        const [prefix, bytes] = image.url.split(',');
        const type = prefix.slice(5).split(';')[0];
        blob = new Blob([Uint8Array.from(atob(bytes), (value) => value.charCodeAt(0))], { type });
      } else {
        const response = await fetch(image.url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new Error('Download failed');
        blob = await response.blob();
      }
      const extension = (
        { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as Record<string, string>
      )[blob.type] || 'png';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `galx-image-${image.id}.${extension}`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      studio.setNotice('Image downloaded.');
    } catch {
      studio.setNotice('Download couldn’t finish. Check your connection and try again.');
    } finally {
      downloadingLock.current = false;
      setDownloading(false);
    }
  }

  async function copyPrompt(prompt: string) {
    const success = await safeCopyToClipboard(prompt);
    setCopied(success);
    studio.setNotice(success ? 'Prompt copied.' : 'Copy failed. Select the text manually.');
    if (lastCopied.current) clearTimeout(lastCopied.current);
    lastCopied.current = setTimeout(() => setCopied(false), 2200);
  }

  return (
    <main className="studio" aria-label="GALX Image Studio">
      {/* --- Sleek Floating Header --- */}
      <header className="studio-top-bar">
        <div className="studio-top-left">
          <Link href="/" className="studio-brand-link" title="Return to GALX Home">
            <Sparkles className="studio-brand-sparkle" aria-hidden="true" />
            <span className="studio-brand-title">GALX Images</span>
            <span className="studio-brand-attribution">Powered by GALX Nova.</span>
          </Link>
        </div>

        {/* View Switcher Pills */}
        <nav className="studio-top-tabs" aria-label="Studio views">
          <button
            type="button"
            className={`studio-tab-pill ${activeTab === 'stream' ? 'active' : ''}`}
            onClick={() => setActiveTab('stream')}
            aria-pressed={activeTab === 'stream'}
          >
            <Compass size={15} aria-hidden="true" />
            <span>Community Stream</span>
          </button>

          <button
            type="button"
            className={`studio-tab-pill ${activeTab === 'creations' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('creations');
              changeView('library');
            }}
            aria-pressed={activeTab === 'creations'}
          >
            <Sparkles size={15} aria-hidden="true" />
            <span>My Creations {studio.creations.length > 0 && `(${studio.creations.length})`}</span>
          </button>

          <button
            type="button"
            className={`studio-tab-pill ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('favorites');
              changeView('favorites');
            }}
            aria-pressed={activeTab === 'favorites'}
          >
            <Star size={15} aria-hidden="true" />
            <span>Favorites</span>
          </button>
        </nav>

        <div className="studio-top-right">
          <Link className="studio-docs-link" href="/docs">
            Guidance
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </header>

      {/* --- Notifications / Alert notices --- */}
      {studio.notice && (
        <div className="studio-toast-banner" role="status" aria-live="polite">
          <span>{studio.notice}</span>
          <button
            type="button"
            className="studio-toast-dismiss"
            onClick={() => studio.setNotice('')}
            aria-label="Dismiss notice"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {readinessNotice && (
        <div
          className={`studio-readiness studio-readiness-${readinessNotice.tone}`}
          role={readinessNotice.tone === 'error' || readinessNotice.tone === 'warning' ? 'alert' : 'status'}
          aria-live="polite"
        >
          <div className="studio-readiness-icon" aria-hidden="true">
            <CircleAlert size={16} />
          </div>
          <div className="studio-readiness-copy">
            <strong>{readinessNotice.title}</strong>
            <span>{readinessNotice.body}</span>
          </div>
          {readinessNotice.action && (
            <button
              type="button"
              className="studio-readiness-action"
              onClick={() => {
                if (studio.uncertain) {
                  setActiveTab('creations');
                  changeView('library');
                } else {
                  void studio.checkAvailability(true);
                }
              }}
            >
              {readinessNotice.action}
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* --- Main Visual Content Area --- */}
      <section className="studio-content-area" ref={canvasRef} tabIndex={-1}>
        {/* VIEW 1: Community Stream (Pinterest-style Masonry Grid) */}
        {activeTab === 'stream' && (
          <div className="studio-stream-view">
            <PublicImageMasonryStream
              onSelectPrompt={(prompt, ratio) => {
                applyPrompt(prompt, ratio || '1:1');
                setActiveTab('creations');
                changeView('library');
              }}
            />
          </div>
        )}

        {/* VIEW 2: My Creations */}
        {activeTab === 'creations' && (
          <div className="studio-creations-view">
            {/* Active generation ongoing */}
            {busy && (
              <div className="studio-active-gen-card">
                <div className="studio-active-gen-header">
                  <div className="studio-active-gen-badge">
                    <LoaderCircle className="studio-spin" size={16} />
                    <span>{studio.submitting ? 'Submitting request…' : studio.progress || 'Synthesizing…'}</span>
                  </div>
                  <span className="studio-active-gen-time">
                    {Math.floor(studio.elapsed / 60)}:{String(studio.elapsed % 60).padStart(2, '0')} elapsed
                  </span>
                </div>
                <p className="studio-active-gen-prompt">{studio.pending?.settings.prompt || settings.prompt}</p>
                <div className="studio-active-gen-meta">
                  <span>Aspect: {settings.ratio}</span>
                  <span>Count: {settings.count}</span>
                  <span>Service: {IMAGE_MODEL.name}</span>
                </div>
              </div>
            )}

            {/* Creations Masonry Grid */}
            {studio.creations.length > 0 || studio.images.length > 0 ? (
              <div className="masonry-grid" aria-label="Your created images">
                {[...studio.creations, ...studio.images.filter((img) => !studio.creations.some((c) => c.id === img.id))].map((image) => (
                  <article
                    key={image.id}
                    className="masonry-card"
                    onClick={() => openImage(image, 'create')}
                    tabIndex={0}
                    role="button"
                    aria-label={`View image: ${image.prompt}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openImage(image, 'create');
                      }
                    }}
                  >
                    <div className="masonry-media-wrap" style={{ aspectRatio: image.ratio === '16:9' ? '16/9' : image.ratio === '9:16' ? '9/16' : image.ratio === '3:2' ? '3/2' : image.ratio === '4:3' ? '4/3' : '1/1' }}>
                      <Artwork image={image} />
                      <div className="masonry-card-badges">
                        <span className="masonry-badge masonry-badge-ratio">{image.ratio}</span>
                      </div>
                      <div className="masonry-card-overlay">
                        <p className="masonry-prompt-snippet">{image.prompt}</p>
                        <div className="masonry-card-actions">
                          <button
                            type="button"
                            className="masonry-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              void copyPrompt(image.prompt);
                            }}
                            title="Copy prompt"
                          >
                            <Copy size={13} />
                            <span>Prompt</span>
                          </button>
                          <button
                            type="button"
                            className="masonry-action-btn masonry-action-icon-only"
                            onClick={(e) => {
                              e.stopPropagation();
                              void download(image);
                            }}
                            title="Download image"
                          >
                            <ArrowDownToLine size={13} />
                          </button>
                          <button
                            type="button"
                            className="masonry-action-btn remix"
                            onClick={(e) => {
                              e.stopPropagation();
                              applyPrompt(image.prompt, image.ratio, image.quality);
                            }}
                            title="Reuse prompt"
                          >
                            <Sparkles size={13} />
                            <span>Reuse</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : !busy ? (
              <div className="studio-empty-state">
                <div className="studio-empty-icon">
                  <Sparkles size={32} />
                </div>
                <h3>Your canvas is waiting</h3>
                <p>Describe your idea in the dock below and press Enter to generate your first masterpiece.</p>
                <div className="studio-empty-starter-chips">
                  {INSPIRATION_PROMPTS.slice(0, 3).map((prompt, i) => (
                    <button
                      key={i}
                      type="button"
                      className="studio-starter-chip"
                      onClick={() => applyPrompt(prompt, '1:1')}
                    >
                      <Sparkles size={13} />
                      <span>{prompt.slice(0, 68)}…</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* VIEW 3: Favorites */}
        {activeTab === 'favorites' && (
          <div className="studio-favorites-view">
            {owner ? (
              studio.images.length > 0 ? (
                <div className="masonry-grid" aria-label="Favorite images">
                  {studio.images.map((image) => (
                    <article
                      key={image.id}
                      className="masonry-card"
                      onClick={() => openImage(image, 'library')}
                      tabIndex={0}
                      role="button"
                      aria-label={`View image: ${image.prompt}`}
                    >
                      <div className="masonry-media-wrap" style={{ aspectRatio: image.ratio === '16:9' ? '16/9' : image.ratio === '9:16' ? '9/16' : '1/1' }}>
                        <Artwork image={image} />
                        <div className="masonry-card-badges">
                          <span className="masonry-badge masonry-badge-ratio">{image.ratio}</span>
                          <span className="masonry-badge"><Star size={11} fill="currentColor" /></span>
                        </div>
                        <div className="masonry-card-overlay">
                          <p className="masonry-prompt-snippet">{image.prompt}</p>
                          <div className="masonry-card-actions">
                            <button
                              type="button"
                              className="masonry-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                void copyPrompt(image.prompt);
                              }}
                            >
                              <Copy size={13} />
                              <span>Prompt</span>
                            </button>
                            <button
                              type="button"
                              className="masonry-action-btn remix"
                              onClick={(e) => {
                                e.stopPropagation();
                                applyPrompt(image.prompt, image.ratio, image.quality);
                              }}
                            >
                              <Sparkles size={13} />
                              <span>Reuse</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="studio-empty-state">
                  <div className="studio-empty-icon">
                    <Star size={32} />
                  </div>
                  <h3>No favorites saved yet</h3>
                  <p>Star any image in the stream or your creations to keep it in your favorites collection.</p>
                  <button type="button" className="studio-primary" style={{ width: 'auto', marginTop: 12 }} onClick={() => setActiveTab('stream')}>
                    Explore Community Stream
                  </button>
                </div>
              )
            ) : (
              <div className="studio-empty-state">
                <div className="studio-empty-icon">
                  <Star size={32} />
                </div>
                <h3>Sign in to keep favorites</h3>
                <p>Save and sync your favorite creations across all your devices.</p>
                <Link href={authEntryPath(pathname)} className="studio-primary" style={{ width: 'auto', marginTop: 12 }}>
                  Sign in
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      {/* --- Floating Bottom Composer Dock (Matching Mockup) --- */}
      <div className="studio-dock-container">
        {/* Amber-Golden Warm Glowing Top Rim Aura */}
        <div className="studio-dock-aura" aria-hidden="true" />

        {/* Floating Progress Pill when Generating */}
        {(studio.pending || studio.submitting) && (
          <div className="studio-dock-progress-pill" role="status" aria-live="polite">
            <div className="studio-dock-progress-left">
              <span className="studio-dock-pulse" />
              <span className="studio-dock-progress-text">
                {studio.submitting
                  ? 'Submitting prompt…'
                  : studio.polling
                  ? `${studio.progress || 'Synthesizing…'} (${Math.floor(studio.elapsed / 60)}:${String(studio.elapsed % 60).padStart(2, '0')})`
                  : 'Paused'}
              </span>
              <span className="studio-dock-progress-ratio">{settings.ratio}</span>
            </div>
            <div className="studio-dock-progress-actions">
              {studio.pending && (
                studio.polling ? (
                  <button
                    type="button"
                    onClick={() => studio.setPolling(false)}
                    className="studio-dock-mini-btn"
                    title="Pause updates"
                    aria-label="Pause updates"
                  >
                    <Pause size={12} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => studio.resumeUpdates()}
                    className="studio-dock-mini-btn"
                    title="Resume updates"
                    aria-label="Resume updates"
                  >
                    <Play size={12} />
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Options Popover Panel (Toggled by Circular '+' Button) */}
        {optionsOpen && (
          <div className="studio-dock-options-popover" role="dialog" aria-label="Creation settings">
            <div className="studio-popover-header">
              <div className="studio-popover-title">
                <Sparkles size={16} />
                <h4>Creation Settings</h4>
              </div>
              <button
                type="button"
                className="studio-popover-close"
                onClick={() => setOptionsOpen(false)}
                aria-label="Close settings"
              >
                <X size={15} />
              </button>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="studio-popover-section">
              <label className="studio-popover-label">Aspect Ratio</label>
              <div className="studio-dock-ratios" role="radiogroup" aria-label="Aspect ratio">
                {RATIOS.map((ratio) => (
                  <button
                    key={ratio.value}
                    type="button"
                    className={`studio-dock-ratio-btn ${settings.ratio === ratio.value ? 'active' : ''}`}
                    aria-pressed={settings.ratio === ratio.value}
                    onClick={() => setSettings((prev) => ({ ...prev, ratio: ratio.value }))}
                    title={`${ratio.label} (${ratio.value})`}
                  >
                    <span
                      className="studio-dock-ratio-box"
                      style={{ width: Math.round(ratio.width * 0.65), height: Math.round(ratio.height * 0.65) }}
                    />
                    <span className="studio-dock-ratio-val">{ratio.value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Count Selector */}
            <div className="studio-popover-section">
              <label className="studio-popover-label">Number of Images</label>
              <div className="studio-dock-counts">
                {[1, 2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`studio-dock-count-btn ${settings.count === count ? 'active' : ''}`}
                    aria-pressed={settings.count === count}
                    onClick={() => setSettings((prev) => ({ ...prev, count }))}
                  >
                    {count} {count === 1 ? 'image' : 'images'}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Inspiration & Actions */}
            <div className="studio-popover-row">
              <button
                type="button"
                className="studio-popover-action-btn"
                onClick={() => {
                  const next = INSPIRATION_PROMPTS[Math.floor(Math.random() * INSPIRATION_PROMPTS.length)];
                  setSettings((prev) => ({ ...prev, prompt: next }));
                  studio.setNotice('Inspiration prompt loaded.');
                  promptRef.current?.focus();
                }}
              >
                <Sparkles size={14} />
                <span>Try an example</span>
              </button>

              {settings.prompt && (
                <button
                  type="button"
                  className="studio-popover-action-btn text-muted"
                  onClick={() => {
                    setSettings((prev) => ({ ...prev, prompt: '' }));
                    promptRef.current?.focus();
                  }}
                >
                  Clear prompt
                </button>
              )}
            </div>

            {owner && <GenerationGateNotice kind="images" quantity={settings.count} />}
          </div>
        )}

        {/* Main Dock Input Bar */}
        <form
          ref={formRef}
          className="studio-dock-bar"
          onSubmit={(e) => {
            e.preventDefault();
            if (gate.blocked || busy || !settings.prompt.trim()) return;
            setOptionsOpen(false);
            setActiveTab('creations');
            void studio.generate();
          }}
        >
          {/* Circular '+' Button */}
          <button
            type="button"
            className={`studio-dock-plus-btn ${optionsOpen ? 'open' : ''}`}
            onClick={() => setOptionsOpen((v) => !v)}
            aria-label={optionsOpen ? 'Close settings' : 'Image generation settings'}
            aria-expanded={optionsOpen}
            title="Settings (Aspect Ratio, Count, Styles)"
          >
            <Plus size={20} />
          </button>

          {/* Prompt Textarea */}
          <textarea
            ref={promptRef}
            className="studio-dock-textarea"
            placeholder="Describe the image you want to create."
            value={settings.prompt}
            maxLength={MAX_PROMPT}
            rows={1}
            aria-label="Image prompt"
            onChange={(e) => {
              setSettings((prev) => ({ ...prev, prompt: e.target.value }));
              // Auto grow
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (!settings.prompt.trim() || busy || gate.blocked) return;
                formRef.current?.requestSubmit();
              }
            }}
          />

          {/* Submit / Generate Button */}
          {!owner && !authLoading ? (
            <Link
              href={authEntryPath(pathname)}
              className="studio-dock-submit-btn signin"
              title="Sign in to generate"
              aria-label="Sign in to generate"
            >
              <Sparkles size={18} />
            </Link>
          ) : (
            <button
              type="submit"
              className="studio-dock-submit-btn"
              disabled={
                studio.availability === 'unavailable' ||
                gate.blocked ||
                !studio.ready ||
                authLoading ||
                !settings.prompt.trim() ||
                busy ||
                studio.retryIn > 0
              }
              aria-label="Generate images"
              title="Generate (Enter)"
            >
              {busy ? (
                <LoaderCircle className="studio-spin" size={18} />
              ) : (
                <Sparkles size={18} />
              )}
            </button>
          )}
        </form>
      </div>

      {/* --- Image Detail Inspector Modal --- */}
      <dialog
        className="studio-inspector"
        ref={dialogRef}
        aria-labelledby="studio-inspector-title"
        onCancel={() => setActive(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setActive(null);
        }}
        onKeyDown={(event) => {
          if (
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.nativeEvent.isComposing ||
            (event.target instanceof HTMLElement &&
              event.target.closest('input, textarea, select, [contenteditable="true"]')) ||
            !window.getSelection()?.isCollapsed
          )
            return;
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            browseImage(event.key === 'ArrowLeft' ? -1 : 1);
          }
        }}
      >
        {activeImage && (
          <>
            <div className="studio-inspector-toolbar">
              <h2 id="studio-inspector-title">Image Details</h2>
              <div className="studio-image-paging" role="group" aria-label="Browse images">
                <button
                  className="studio-icon-button"
                  aria-label="Previous image"
                  disabled={activeIndex <= 0}
                  onClick={() => browseImage(-1)}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                </button>
                <span aria-live="polite" aria-atomic="true">
                  {activeIndex + 1} of {activeCollection.length}
                </span>
                <button
                  className="studio-icon-button"
                  aria-label="Next image"
                  disabled={activeIndex >= activeCollection.length - 1}
                  onClick={() => browseImage(1)}
                >
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
              <button
                className="studio-icon-button"
                aria-label="Close image details"
                autoFocus
                onClick={() => setActive(null)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="studio-inspector-content">
              <div className="studio-inspector-image">
                <Artwork key={activeImage.id} image={activeImage} large />
              </div>
              <div className="studio-inspector-details">
                <h3>Prompt</h3>
                {activeImage.detailsLoaded === false ? (
                  detailError ? (
                    <div role="alert">
                      <p>{detailError}</p>
                      <button
                        className="studio-text-button"
                        onClick={() => setDetailRevision((v) => v + 1)}
                      >
                        Retry details
                      </button>
                    </div>
                  ) : (
                    <p role="status">Loading full prompt…</p>
                  )
                ) : (
                  <p className="studio-detail-prompt">{activeImage.prompt || 'No prompt saved.'}</p>
                )}

                <button
                  className="studio-text-button"
                  disabled={activeImage.detailsLoaded === false}
                  onClick={() => void copyPrompt(activeImage.prompt)}
                >
                  {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy prompt'}
                </button>

                <dl>
                  <div>
                    <dt>Service</dt>
                    <dd>{IMAGE_MODEL.name}</dd>
                  </div>
                  <div>
                    <dt>Aspect ratio</dt>
                    <dd>{activeImage.ratio}</dd>
                  </div>
                  <div>
                    <dt>Quality</dt>
                    <dd>{activeImage.quality === 'hd' ? 'High detail' : 'Standard'}</dd>
                  </div>
                  {activeImage.createdAt && (
                    <div>
                      <dt>Created</dt>
                      <dd>
                        {new Date(activeImage.createdAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </dd>
                    </div>
                  )}
                </dl>

                <button
                  className="studio-primary"
                  disabled={downloading}
                  onClick={() => void download(activeImage)}
                >
                  <ArrowDownToLine size={16} aria-hidden="true" />
                  {downloading ? 'Downloading…' : 'Download image'}
                </button>

                <button
                  className="studio-secondary"
                  disabled={activeImage.detailsLoaded === false}
                  onClick={() => applyPrompt(activeImage.prompt, activeImage.ratio, activeImage.quality)}
                >
                  <Sparkles size={16} aria-hidden="true" />
                  Reuse prompt & settings
                </button>

                {activeImage.saved && (
                  <button
                    className="studio-secondary"
                    disabled={studio.busyAsset === activeImage.id}
                    aria-pressed={activeImage.favorite}
                    onClick={async () => {
                      if (await studio.toggleFavorite(activeImage)) {
                        setActive({ ...activeImage, favorite: !activeImage.favorite });
                      }
                    }}
                  >
                    <Star
                      size={16}
                      aria-hidden="true"
                      fill={activeImage.favorite ? 'currentColor' : 'none'}
                    />
                    {activeImage.favorite ? 'Remove from favorites' : 'Add to favorites'}
                  </button>
                )}

                <p className="studio-field-hint">Reusing a prompt lets you tweak it in the bottom dock.</p>
                <div className="studio-inspector-status" role="status">
                  {studio.notice}
                </div>
                <button className="studio-text-button" onClick={() => setActive(null)}>
                  <ArrowLeft size={14} aria-hidden="true" />
                  Back to studio
                </button>
              </div>
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
