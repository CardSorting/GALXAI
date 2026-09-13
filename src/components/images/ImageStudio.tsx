'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, ChevronDown, Copy, ImageIcon, LoaderCircle, Plus, RefreshCw, Search, SlidersHorizontal, Sparkles, Star, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { DEFAULT_SETTINGS, IMAGE_MODEL, MAX_PROMPT, RATIOS, readSettings, type StudioImage, type StudioSettings } from './studio-contract';
import { useImageStudio } from './use-image-studio';
import { GenerationCanvas } from './GenerationCanvas';
import { StudioArtwork as Artwork } from './StudioArtwork';
import './studio.css';

export function ImageStudio() {
  const { user, isLoading } = useAuth();
  return <StudioWorkspace key={user?.id || 'guest'} owner={user?.id || null} token={user?.token} authLoading={isLoading} />;
}

function StudioWorkspace({ owner, token, authLoading }: { owner: string | null; token?: string; authLoading: boolean }) {
  const studio = useImageStudio(owner, token);
  const [view, setView] = useState<'create' | 'library'>('create');
  const [active, setActive] = useState<StudioImage | null>(null);
  const [activeCollection, setActiveCollection] = useState<StudioImage[]>([]);
  const [activeSource, setActiveSource] = useState<'create' | 'library'>('create');
  const [layout, setLayout] = useState<'image' | 'grid'>('image');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previous, setPrevious] = useState<StudioSettings | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const downloadingLock = useRef(false);
  const lastCopied = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { settings, setSettings } = studio;
  const busy = studio.submitting || studio.polling;
  const activeImage = active ? studio.images.find(image => image.id === active.id) || active : null;
  const activeIndex = activeCollection.findIndex(image => image.id === active?.id);
  const dialogOpen = Boolean(active);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'library') setView('library');
  }, []);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialogOpen || !dialog) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    const canvas = canvasRef.current;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; (returnFocus.current?.isConnected ? returnFocus.current : canvas)?.focus({ preventScroll: true }); };
  }, [dialogOpen]);
  useEffect(() => () => { if (lastCopied.current) clearTimeout(lastCopied.current); }, []);
  useEffect(() => { if (studio.error) setComposerOpen(true); }, [studio.error]);
  useEffect(() => {
    if (studio.submitting && window.matchMedia('(max-width: 760px)').matches) {
      setComposerOpen(false);
    }
  }, [studio.submitting]);
  useEffect(() => {
    if (!composerOpen && window.matchMedia('(max-width: 760px)').matches) {
      const frame = requestAnimationFrame(() => {
        canvasRef.current?.focus({ preventScroll: true });
        canvasRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [composerOpen]);

  function focusPrompt() {
    setView('create'); setComposerOpen(true);
    requestAnimationFrame(() => { promptRef.current?.focus(); promptRef.current?.scrollIntoView({ behavior: 'instant', block: 'center' }); });
  }
  function applyPrompt(prompt: string, ratio: string, quality: string = 'standard') {
    setPrevious(settings);
    setSettings(readSettings({ ...settings, prompt, ratio, quality }));
    setActive(null); setCopied(false); studio.setNotice('Prompt added. Make it your own, then generate.'); focusPrompt();
  }
  function showLibrary(favorites = false) { setView('library'); studio.setFavorites(favorites); }
  function openImage(image: StudioImage, source: 'create' | 'library') {
    setActiveCollection(source === 'create' ? studio.creations : studio.images);
    setActiveSource(source); setActive(image); setCopied(false);
  }
  function browseImage(direction: number) {
    const image = activeCollection[activeIndex + direction];
    if (!image) return;
    setActive(image); setCopied(false);
    if (activeSource === 'create') setSelectedId(image.id);
  }
  async function download(image: StudioImage) {
    if (downloadingLock.current) return;
    downloadingLock.current = true; setDownloading(true);
    try {
      let blob: Blob;
      if (image.url.startsWith('data:')) {
        const [prefix, bytes] = image.url.split(',');
        const type = prefix.slice(5).split(';')[0];
        blob = new Blob([Uint8Array.from(atob(bytes), value => value.charCodeAt(0))], { type });
      } else {
        const response = await fetch(image.url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined, signal: AbortSignal.timeout(30_000) });
        if (!response.ok) throw new Error('Download failed');
        blob = await response.blob();
      }
      const extension = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as Record<string, string>)[blob.type];
      if (!extension) throw new Error('Invalid image');
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = `galx-image-${image.id}.${extension}`; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000); studio.setNotice('Image downloaded.');
    } catch { studio.setNotice('Download couldn’t finish. Check your connection and try again.'); }
    finally { downloadingLock.current = false; setDownloading(false); }
  }
  async function copyPrompt(prompt: string) {
    const success = await safeCopyToClipboard(prompt); setCopied(success);
    studio.setNotice(success ? 'Prompt copied.' : 'Copy didn’t work. Select the prompt text to copy it.');
    if (lastCopied.current) clearTimeout(lastCopied.current);
    lastCopied.current = setTimeout(() => setCopied(false), 2200);
  }
  const imageCard = (image: StudioImage) => <article className="studio-result" key={image.id}>
    <button className="studio-result-preview" style={{ aspectRatio: image.ratio.replace(':', '/') }} onClick={() => openImage(image, 'library')} aria-label={`Open image: ${image.prompt.slice(0, 100)}`}><Artwork image={image} /></button>
    <p className="studio-result-prompt">{image.prompt}</p>
    <div className="studio-result-actions">
      <button className="studio-text-button" onClick={() => applyPrompt(image.prompt, image.ratio, image.quality)}><RefreshCw aria-hidden="true" />Reuse prompt</button>
      <div>
        {image.saved && <button className="studio-icon-button" aria-label={image.favorite ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={image.favorite} disabled={studio.busyAsset === image.id} onClick={() => void studio.toggleFavorite(image)}><Star aria-hidden="true" fill={image.favorite ? 'currentColor' : 'none'} /></button>}
        <button className="studio-icon-button" aria-label="Download image" disabled={downloading} onClick={() => void download(image)}><ArrowDownToLine aria-hidden="true" /></button>
      </div>
    </div>
  </article>;

  return <main className="studio" aria-label="Image studio">
    <div className="studio-heading">
      <div className="studio-title"><ImageIcon aria-hidden="true" /><h1>Image studio</h1><span>From idea to image.</span></div>
      <Link className="studio-text-button studio-docs" href="/docs/api-reference">API docs<ArrowRight aria-hidden="true" /></Link>
    </div>
    <div className="studio-workspace">
        <nav className="studio-view-nav" aria-label="Studio views">
          <div><button aria-current={view === 'create' ? 'page' : undefined} onClick={() => setView('create')}><Sparkles aria-hidden="true" />Create</button>
            <button aria-current={view === 'library' && !studio.favorites ? 'page' : undefined} onClick={() => showLibrary()}><ImageIcon aria-hidden="true" />My images</button>
            <button aria-current={view === 'library' && studio.favorites ? 'page' : undefined} onClick={() => showLibrary(true)}><Star aria-hidden="true" />Favorites</button></div>
          <button className="studio-icon-button" aria-label="New prompt" onClick={() => { setPrevious(settings); setSettings(DEFAULT_SETTINGS); focusPrompt(); }}><Plus aria-hidden="true" /></button>
        </nav>
      <aside className={`studio-composer ${view === 'library' ? 'studio-composer-library' : ''} ${!composerOpen ? 'studio-composer-collapsed' : ''}`} aria-label="Image creation settings">
        <div className="studio-composer-summary"><div><p>{settings.prompt || 'Your next image'}</p><span>{settings.ratio} · {settings.count} {settings.count === 1 ? 'image' : 'images'}</span></div><button type="button" className="studio-secondary" aria-expanded={composerOpen} aria-controls="studio-create-form" onClick={focusPrompt}>Edit prompt</button></div>
        <form id="studio-create-form" ref={formRef} onSubmit={event => { event.preventDefault(); setView('create'); void studio.generate(); }} onKeyDown={event => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); formRef.current?.requestSubmit(); }
        }}>
          <div className="studio-composer-heading"><h2>Create an image</h2><SlidersHorizontal aria-hidden="true" />{studio.creations.length > 0 && <button type="button" className="studio-text-button studio-return-results" onClick={() => { setComposerOpen(false); canvasRef.current?.focus({ preventScroll: true }); canvasRef.current?.scrollIntoView({ block: 'start' }); }}>Back to images<ArrowRight aria-hidden="true" /></button>}</div>
          <p className="studio-scroll-hint">Scroll for more settings<ChevronDown aria-hidden="true" /></p>
          <div className="studio-controls">
          <div className="studio-prompt-label"><label className="studio-label" htmlFor="studio-prompt">Prompt</label>{settings.prompt && <button type="button" className="studio-text-button" onClick={() => { setPrevious(settings); setSettings(current => ({ ...current, prompt: '' })); promptRef.current?.focus(); }}>Clear</button>}</div>
          <textarea id="studio-prompt" ref={promptRef} value={settings.prompt} maxLength={MAX_PROMPT} rows={7} placeholder={"Describe what you imagine…\n\nTry a subject, a setting, and a mood."} aria-describedby="studio-prompt-hint" onChange={event => setSettings(current => ({ ...current, prompt: event.target.value }))} />
          <div className="studio-prompt-hint" id="studio-prompt-hint"><span>Be specific about light, color, and composition.</span>{settings.prompt.length > 28_000 && <span>{settings.prompt.length.toLocaleString()} / {MAX_PROMPT.toLocaleString()}</span>}</div>
          {previous && <button type="button" className="studio-text-button studio-undo" onClick={() => { setSettings(previous); setPrevious(null); studio.setNotice('Previous prompt restored.'); }}>Undo prompt change</button>}

          <fieldset className="studio-fieldset"><legend>Aspect ratio</legend><div className="studio-ratios">{RATIOS.map(ratio => <button type="button" key={ratio.value} aria-label={`${ratio.label} ${ratio.value}`} aria-pressed={settings.ratio === ratio.value} title={ratio.label} onClick={() => setSettings(current => ({ ...current, ratio: ratio.value }))}>
            <span className="studio-ratio-icon"><span style={{ width: ratio.width, height: ratio.height }} /></span><span>{ratio.value}</span>
          </button>)}</div><p className="studio-field-hint">{RATIOS.find(ratio => ratio.value === settings.ratio)?.label} · {RATIOS.find(ratio => ratio.value === settings.ratio)?.size.replace('x', ' × ')} px requested</p></fieldset>

          <fieldset className="studio-fieldset studio-count"><legend>Number of images</legend><div>{[1, 2, 3, 4].map(count => <button type="button" key={count} aria-pressed={settings.count === count} aria-label={`${count} ${count === 1 ? 'image' : 'images'}`} onClick={() => setSettings(current => ({ ...current, count }))}>{count}</button>)}</div></fieldset>
          </div>
          <div className="studio-submit-area">
            {!owner && !authLoading ? <Link className="studio-primary" href="/auth/signin?next=%2Fimages"><Sparkles aria-hidden="true" />Sign in to generate<ArrowRight aria-hidden="true" /></Link> : <button className="studio-primary" type="submit" disabled={!studio.ready || authLoading || !settings.prompt.trim() || busy || Boolean(studio.pending) || studio.uncertain || studio.retryIn > 0}>
              {busy ? <LoaderCircle className="studio-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
              {authLoading ? 'Loading…' : studio.submitting ? 'Submitting…' : studio.polling ? 'Generating…' : studio.retryIn > 0 ? `Try again in ${studio.retryIn}s` : `Generate ${settings.count === 1 ? 'image' : `${settings.count} images`}`}
            </button>}
            <p>{owner ? <>Uses your account’s image allowance. <span className="studio-shortcut">⌘ / Ctrl + Enter</span></> : 'Your prompt stays here while you sign in.'}</p>
          </div>
        </form>
      </aside>

      <section className="studio-canvas" aria-label="Image results">

        <div className="studio-canvas-body" ref={canvasRef} tabIndex={-1}>
          <div className="studio-announcement" role="status" aria-live="polite">{studio.notice}</div>
          {studio.error && <div className="studio-alert" role="alert"><p>{studio.error}</p><div><button className="studio-text-button" onClick={() => { showLibrary(); studio.refresh(); }}>Check my images<ArrowRight aria-hidden="true" /></button>{studio.error.includes('Sign in') && <Link className="studio-text-button" href="/auth/signin?next=%2Fimages">Sign in</Link>}</div></div>}
          {(studio.pending || studio.submitting || studio.uncertain) && <section className="studio-progress" aria-label="Generation status">
            <div className="studio-progress-heading">{busy ? <LoaderCircle className="studio-spin" aria-hidden="true" /> : <ImageIcon aria-hidden="true" />}<div><h2 aria-live="polite" aria-atomic="true">{studio.submitting ? 'Submitting your prompt' : studio.polling ? studio.progress : studio.pending ? 'Updates paused' : 'Your generation'}</h2><p>{studio.pending ? `${studio.pending.settings.count} ${studio.pending.settings.count === 1 ? 'image' : 'images'} · ${studio.pending.settings.ratio} · ${Math.floor(studio.elapsed / 60)}:${String(studio.elapsed % 60).padStart(2, '0')} elapsed` : 'Sending your request…'}</p></div></div>
            {studio.pending && <p className="studio-progress-prompt">{studio.pending.settings.prompt}</p>}
            <details className="studio-progress-options" open={!busy}><summary>Generation options</summary><div className="studio-progress-actions">{studio.pending && (studio.polling ? <button className="studio-secondary" onClick={() => { studio.setPolling(false); studio.setNotice('Updates paused. Your generation may continue.'); }}>Pause updates</button> : <button className="studio-secondary" onClick={() => studio.setPolling(true)}>Resume updates</button>)}
              {!busy && <button className="studio-text-button" onClick={() => setConfirmNew(true)}>Start a new generation</button>}</div>
            <p>Pausing updates doesn’t cancel your generation.</p></details>
            {confirmNew && <div className="studio-confirm"><p>The earlier request may still finish. Starting again can use more of your allowance.</p><button className="studio-secondary" onClick={() => { studio.clearPending(); setConfirmNew(false); focusPrompt(); }}>Continue with a new generation</button><button className="studio-text-button" onClick={() => setConfirmNew(false)}>Keep waiting</button></div>}
          </section>}

          {view === 'create' ? <GenerationCanvas images={studio.creations} request={studio.pending?.settings || studio.submission}
            animating={busy && !studio.error} onOpen={image => openImage(image, 'create')} onDownload={image => void download(image)} downloading={downloading}
            onReuse={image => applyPrompt(image.prompt, image.ratio, image.quality)} layout={layout} onLayout={setLayout} selectedId={selectedId} onSelect={setSelectedId} />
          : <section className="studio-library" aria-label={studio.favorites ? 'Favorite images' : 'Your images'}>
            <div className="studio-section-heading"><div><h2>{studio.favorites ? 'Your favorites' : 'Your images'}</h2><p>{owner ? 'A little inspiration, saved for later.' : 'Sign in to see the images you’ve made.'}</p></div><button className="studio-icon-button" aria-label="Refresh library" disabled={studio.libraryLoading || !owner} onClick={studio.refresh}><RefreshCw className={studio.libraryLoading ? 'studio-spin' : undefined} aria-hidden="true" /></button></div>
            {owner ? <><div className="studio-library-toolbar"><div className="studio-search"><Search aria-hidden="true" /><input aria-label="Search your images" type="search" value={studio.search} onChange={event => studio.setSearch(event.target.value)} placeholder="Search by prompt…" maxLength={200} /></div><div className="studio-select-wrap"><select aria-label="Sort images" value={studio.sort} onChange={event => studio.setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select><ChevronDown aria-hidden="true" /></div></div>
              {studio.libraryError && <div className={studio.images.length ? 'studio-alert' : 'studio-empty'} role="alert">
                {studio.images.length ? <p>Couldn’t update your library. Your loaded images are still here.</p> : <><h3>Your images couldn’t be loaded</h3><p>{studio.libraryError}</p></>}
                <div className="studio-empty-actions"><button className="studio-secondary" disabled={studio.libraryLoading} onClick={studio.retryLibrary}>Try again</button>{studio.libraryError.includes('Sign in') && <Link className="studio-primary" href="/auth/signin?next=%2Fimages">Sign in again</Link>}</div>
              </div>}
              {studio.libraryLoading && !studio.images.length ? <div className="studio-results-grid" aria-label="Loading images" aria-busy="true">{[0, 1, 2].map(index => <div key={index} className="studio-skeleton" />)}</div> : studio.images.length ? <><div className="studio-library-count" role="status">{studio.libraryLoading ? 'Updating images…' : `${studio.total.toLocaleString()} ${studio.total === 1 ? 'image' : 'images'}`}</div><div className="studio-results-grid">{studio.images.map(imageCard)}</div>{studio.cursor && !studio.libraryError && <button className="studio-secondary studio-load-more" disabled={studio.libraryLoading} onClick={studio.loadMore}>{studio.libraryLoading ? 'Loading…' : 'Load more images'}</button>}</> : !studio.libraryError && <div className="studio-empty"><ImageIcon aria-hidden="true" /><h3>{studio.search ? 'No images match your search' : studio.favorites ? 'Keep your favorites close' : 'Your next idea belongs here'}</h3><p>{studio.search ? 'Try a different word from your prompt.' : studio.favorites ? 'Star an image in your library to find it here.' : 'Generate your first image to start your collection.'}</p><button className="studio-secondary" onClick={() => studio.search ? studio.setSearch('') : studio.favorites ? showLibrary() : focusPrompt()}>{studio.search ? 'Clear search' : studio.favorites ? 'Browse my images' : 'Create an image'}</button></div>}
            </> : <div className="studio-empty"><ImageIcon aria-hidden="true" /><h3>Your own space to create</h3><p>Generate images, save your favorites, and pick up where you left off.</p><Link href="/auth/signin?next=%2Fimages" className="studio-primary">Sign in to get started<ArrowRight aria-hidden="true" /></Link></div>}
          </section>}
        </div>
      </section>
    </div>
    <dialog className="studio-inspector" ref={dialogRef} aria-labelledby="studio-inspector-title" onCancel={() => setActive(null)} onClick={event => { if (event.target === event.currentTarget) setActive(null); }} onKeyDown={event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.nativeEvent.isComposing || (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) || !window.getSelection()?.isCollapsed) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); browseImage(event.key === 'ArrowLeft' ? -1 : 1); }
    }}>
      {activeImage && <><div className="studio-inspector-toolbar"><h2 id="studio-inspector-title">Image details</h2><div className="studio-image-paging" role="group" aria-label="Browse images"><button className="studio-icon-button" aria-label="Previous image" disabled={activeIndex <= 0} onClick={() => browseImage(-1)}><ArrowLeft aria-hidden="true" /></button><span aria-live="polite" aria-atomic="true">{activeIndex + 1} of {activeCollection.length}</span><button className="studio-icon-button" aria-label="Next image" disabled={activeIndex >= activeCollection.length - 1} onClick={() => browseImage(1)}><ArrowRight aria-hidden="true" /></button></div><button className="studio-icon-button" aria-label="Close image details" autoFocus onClick={() => setActive(null)}><X aria-hidden="true" /></button></div><div className="studio-inspector-content"><div className="studio-inspector-image"><Artwork key={activeImage.id} image={activeImage} large /></div><div className="studio-inspector-details">
        <h3>Prompt</h3><p className="studio-detail-prompt">{activeImage.prompt || 'No prompt saved.'}</p><button className="studio-text-button" onClick={() => void copyPrompt(activeImage.prompt)}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? 'Copied' : 'Copy prompt'}</button>
        <dl><div><dt>Model</dt><dd>{IMAGE_MODEL.name}</dd></div><div><dt>Aspect ratio</dt><dd>{activeImage.ratio}</dd></div><div><dt>Quality</dt><dd>{activeImage.quality === 'hd' ? 'High detail' : 'Standard'}</dd></div>{activeImage.createdAt && <div><dt>Created</dt><dd>{new Date(activeImage.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>}</dl>
        <button className="studio-primary" disabled={downloading} onClick={() => void download(activeImage)}><ArrowDownToLine aria-hidden="true" />{downloading ? 'Downloading…' : 'Download image'}</button>
        <button className="studio-secondary" onClick={() => applyPrompt(activeImage.prompt, activeImage.ratio, activeImage.quality)}><RefreshCw aria-hidden="true" />Reuse prompt & settings</button>
        {activeImage.saved && <button className="studio-secondary" disabled={studio.busyAsset === activeImage.id} aria-pressed={activeImage.favorite} onClick={async () => { if (await studio.toggleFavorite(activeImage)) setActive({ ...activeImage, favorite: !activeImage.favorite }); }}><Star aria-hidden="true" fill={activeImage.favorite ? 'currentColor' : 'none'} />{activeImage.favorite ? 'Remove from favorites' : 'Add to favorites'}</button>}
        <p className="studio-field-hint">Reusing a prompt creates a new image.</p>
        <div className="studio-inspector-status" role="status">{studio.notice}</div>
        <button className="studio-text-button" onClick={() => setActive(null)}><ArrowLeft aria-hidden="true" />Back to studio</button>
      </div></div></>}
    </dialog>
  </main>;
}
