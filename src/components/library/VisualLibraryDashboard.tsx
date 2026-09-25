'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ImageIcon,
  LoaderCircle,
  Lock,
  Search,
  Star,
  Trash2,
  X
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent
} from 'react';
import type { ImageGenerationRecord, ImageLibraryStats } from '@/core/contracts/GalxContracts';
import { VisualLibrarySkeleton } from '@/components/library/VisualLibrarySkeleton';

type SortOrder = 'newest' | 'oldest';

interface LibraryResponse {
  success: boolean;
  error?: string;
  total: number;
  nextCursor: string | null;
  stats: ImageLibraryStats;
  availableSessions: Array<{ sessionId: string; count: number }>;
  records: ImageGenerationRecord[];
}

const EMPTY_STATS: ImageLibraryStats = {
  totalImages: 0,
  totalBytes: 0,
  favoriteCount: 0,
  sessionCount: 0,
  aspectRatios: {}
};

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const NUMBER_FORMATTER = new Intl.NumberFormat();

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function dateGroupLabel(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const key = date.toDateString();
  if (key === today.toDateString()) return 'Today';
  if (key === yesterday.toDateString()) return 'Yesterday';
  return DATE_FORMATTER.format(date);
}

export function VisualLibraryDashboard() {
  const [records, setRecords] = useState<ImageGenerationRecord[]>([]);
  const [stats, setStats] = useState<ImageLibraryStats>(EMPTY_STATS);
  const [availableSessions, setAvailableSessions] = useState<Array<{ sessionId: string; count: number }>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState('all');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const requestSequence = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const lastSelectedIndex = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const buildSearchParams = useCallback((cursor?: string) => {
    const params = new URLSearchParams({ limit: '48', sort: sortOrder });
    if (selectedSession !== 'all') params.set('sessionId', selectedSession);
    if (selectedAspectRatio !== 'all') params.set('aspectRatio', selectedAspectRatio);
    if (onlyFavorites) params.set('isFavorite', 'true');
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (cursor) params.set('cursor', cursor);
    return params;
  }, [debouncedSearch, onlyFavorites, selectedAspectRatio, selectedSession, sortOrder]);

  const fetchLibrary = useCallback(async (cursor?: string) => {
    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    activeRequest.current?.abort();
    activeRequest.current = controller;
    cursor ? setLoadingMore(true) : setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/images/library?${buildSearchParams(cursor)}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      const payload = await response.json() as LibraryResponse;
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Could not load your images.');
      if (sequence !== requestSequence.current) return;

      setRecords((current) => cursor
        ? [...current, ...payload.records.filter((record) => !current.some((item) => item.id === record.id))]
        : payload.records);
      setStats(payload.stats || EMPTY_STATS);
      setAvailableSessions(payload.availableSessions || []);
      setNextCursor(payload.nextCursor || null);
      if (!cursor) {
        setSelectedAssetIds(new Set());
        setActiveLightboxIndex(null);
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      if (sequence === requestSequence.current) {
        setError(caught instanceof Error ? caught.message : 'Could not load your images.');
      }
    } finally {
      if (sequence === requestSequence.current) {
        activeRequest.current = null;
        setLoading(false);
        setLoadingMore(false);
      }
    }

  }, [buildSearchParams]);

  useEffect(() => {
    void fetchLibrary();
    return () => activeRequest.current?.abort();
  }, [fetchLibrary]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const element = document.activeElement?.tagName;
      if (event.key === '/' && element !== 'INPUT' && element !== 'TEXTAREA' && element !== 'SELECT') {
        event.preventDefault();
        document.getElementById('library-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const activeRecord = activeLightboxIndex === null ? null : records[activeLightboxIndex] || null;

  const inspectorOpen = activeLightboxIndex !== null && activeRecord !== null;

  useEffect(() => {
    if (!inspectorOpen) return;
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveLightboxIndex(null);
      if (event.key === 'ArrowLeft') setActiveLightboxIndex((index) => index === null ? null : Math.max(0, index - 1));
      if (event.key === 'ArrowRight') setActiveLightboxIndex((index) => index === null ? null : Math.min(records.length - 1, index + 1));
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')];
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleDialogKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleDialogKeys);
      previouslyFocused.current?.focus();
      previouslyFocused.current = null;
    };
  }, [inspectorOpen, records.length]);

  const groupedRecords = useMemo(() => {
    const groups = new Map<string, Array<{ record: ImageGenerationRecord; index: number }>>();
    records.forEach((record, index) => {
      const label = dateGroupLabel(record.createdAt);
      groups.set(label, [...(groups.get(label) || []), { record, index }]);
    });
    return [...groups.entries()];
  }, [records]);

  const runBatchAction = async (
    action: 'delete' | 'favorite',
    ids: string[],
    payloadOpts?: { isFavorite?: boolean }
  ) => {
    const response = await fetch('/api/images/library/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        action,
        assetIds: ids,
        isFavorite: payloadOpts?.isFavorite
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.error || 'The action could not be completed.');
    return Number(action === 'delete' ? payload.deletedCount : payload.updatedCount) || 0;
  };


  const handleToggleFavorite = async (record: ImageGenerationRecord, event?: ReactMouseEvent) => {
    event?.stopPropagation();
    const nextValue = !record.isFavorite;
    setPendingAction(`favorite:${record.id}`);
    setRecords((current) => current.map((item) => item.id === record.id ? { ...item, isFavorite: nextValue } : item));
    setStats((current) => ({ ...current, favoriteCount: Math.max(0, current.favoriteCount + (nextValue ? 1 : -1)) }));
    try {
      const response = await fetch(`/api/images/library/${encodeURIComponent(record.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ isFavorite: nextValue })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Favorite was not saved.');
      setNotice(nextValue ? 'Added to favorites.' : 'Removed from favorites.');
    } catch (caught) {
      setRecords((current) => current.map((item) => item.id === record.id ? record : item));
      setStats((current) => ({ ...current, favoriteCount: Math.max(0, current.favoriteCount + (nextValue ? -1 : 1)) }));
      setError(caught instanceof Error ? caught.message : 'Favorite was not saved.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (ids.length === 0 || !window.confirm(`Delete ${ids.length === 1 ? 'this image' : `${ids.length} images`} permanently? This also removes the stored originals.`)) return;
    const previous = records;
    setPendingAction('delete');
    setRecords((current) => current.filter((record) => !ids.includes(record.id)));
    setSelectedAssetIds(new Set());
    setActiveLightboxIndex(null);
    try {
      const deletedCount = await runBatchAction('delete', ids);
      if (deletedCount !== ids.length) throw new Error(`Only ${deletedCount} of ${ids.length} images were deleted. Refresh and try again.`);
      setNotice(`${deletedCount} ${deletedCount === 1 ? 'image' : 'images'} deleted.`);
      await fetchLibrary();
    } catch (caught) {
      setRecords(previous);
      setError(caught instanceof Error ? caught.message : 'The images could not be deleted.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleBatchFavorite = async () => {
    const ids = [...selectedAssetIds];
    if (ids.length === 0) return;
    const previous = records;
    setPendingAction('batch-favorite');
    setRecords((current) => current.map((record) => selectedAssetIds.has(record.id) ? { ...record, isFavorite: true } : record));
    try {
      const updatedCount = await runBatchAction('favorite', ids, { isFavorite: true });
      if (updatedCount !== ids.length) throw new Error(`Only ${updatedCount} of ${ids.length} favorites were saved.`);
      setSelectedAssetIds(new Set());
      setNotice(`${updatedCount} ${updatedCount === 1 ? 'image' : 'images'} added to favorites.`);
      await fetchLibrary();
    } catch (caught) {
      setRecords(previous);
      setError(caught instanceof Error ? caught.message : 'Favorites were not saved.');
    } finally {
      setPendingAction(null);
    }
  };

  const toggleSelection = (id: string, index: number, event: ReactMouseEvent) => {
    event.stopPropagation();
    setSelectedAssetIds((current) => {
      const next = new Set(current);
      if (event.shiftKey && lastSelectedIndex.current !== null) {
        const start = Math.min(lastSelectedIndex.current, index);
        const end = Math.max(lastSelectedIndex.current, index);
        records.slice(start, end + 1).forEach((record) => next.add(record.id));
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      lastSelectedIndex.current = index;
      return next;
    });
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1800);
    } catch {
      setError('Copy failed. Select the text and copy it manually.');
    }
  };

  const hasFilters = Boolean(debouncedSearch || selectedSession !== 'all' || selectedAspectRatio !== 'all' || onlyFavorites);

  if (loading) return <VisualLibrarySkeleton />;

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-white">Image library</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Find, inspect, download, and organize images generated through your GALXAI account.
          </p>
        </div>
        <dl className="grid grid-cols-3 divide-x divide-white/[0.08] rounded-xl border border-white/[0.08] bg-white/[0.025] px-1 py-2 text-center">
          {[
            ['Images', NUMBER_FORMATTER.format(stats.totalImages)],
            ['Favorites', NUMBER_FORMATTER.format(stats.favoriteCount)],
            ['Storage', formatBytes(stats.totalBytes)]
          ].map(([label, value]) => (
            <div key={label} className="min-w-24 px-3">
              <dt className="text-[11px] text-zinc-400">{label}</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section aria-label="Library filters" className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search image prompts, models, and tags</span>
          <Search aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            id="library-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search prompts, models, and tags"
            className="h-11 w-full rounded-lg border border-white/[0.1] bg-white/[0.035] pl-10 pr-12 text-base text-white outline-none placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 sm:text-sm"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/[0.1] bg-black/30 px-1.5 py-0.5 text-[10px] text-zinc-400 sm:block">/</kbd>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Library filter" className="flex h-11 items-center rounded-lg border border-white/[0.1] bg-white/[0.035] p-1 text-xs">
            <button
              type="button"
              role="tab"
              aria-selected={!onlyFavorites}
              onClick={() => setOnlyFavorites(false)}
              className={`h-full rounded-md px-3 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                !onlyFavorites
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={onlyFavorites}
              onClick={() => setOnlyFavorites((value) => !value)}
              className={`flex h-full items-center gap-1.5 rounded-md px-3 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                onlyFavorites
                  ? 'bg-amber-400 text-black font-semibold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Star aria-hidden="true" className={`h-3.5 w-3.5 ${onlyFavorites ? 'fill-current' : ''}`} />
              Favorites
            </button>
          </div>

          <label>
            <span className="sr-only">Filter by session</span>
            <select value={selectedSession} onChange={(event) => setSelectedSession(event.target.value)} className="h-11 w-full rounded-lg border border-white/[0.1] bg-[#0d101c] px-3 text-sm text-zinc-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 sm:w-36">
              <option value="all">All sessions</option>
              {availableSessions.map((session) => <option key={session.sessionId} value={session.sessionId}>{session.sessionId} ({session.count})</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by aspect ratio</span>
            <select value={selectedAspectRatio} onChange={(event) => setSelectedAspectRatio(event.target.value)} className="h-11 w-full rounded-lg border border-white/[0.1] bg-[#0d101c] px-3 text-sm text-zinc-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 sm:w-32">
              <option value="all">All ratios</option>
              {Object.keys(stats.aspectRatios).sort().map((ratio) => <option key={ratio} value={ratio}>{ratio} ({stats.aspectRatios[ratio]})</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Sort images</span>
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)} className="h-11 w-full rounded-lg border border-white/[0.1] bg-[#0d101c] px-3 text-sm text-zinc-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 sm:w-36">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
      </section>

      {notice && <div role="status" className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-lg border border-white/[0.12] bg-[#14192d] px-4 py-3 text-sm text-white shadow-[0_12px_32px_rgba(0,0,0,0.4)]">{notice}</div>}
      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-rose-400/30 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-100 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => void fetchLibrary()} className="min-h-11 rounded-md border border-rose-300/30 px-3 font-medium hover:bg-rose-200/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">Try again</button>
        </div>
      )}

      {selectedAssetIds.size > 0 && (
        <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-400/30 bg-[#11152a]/95 px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm text-white">
            <span className="font-semibold tabular-nums">{selectedAssetIds.size} selected</span>
            <button type="button" onClick={() => setSelectedAssetIds(new Set(records.map((record) => record.id)))} className="min-h-11 px-2 text-zinc-300 underline decoration-zinc-600 underline-offset-4 hover:text-white">Select loaded</button>
            <button type="button" onClick={() => setSelectedAssetIds(new Set())} className="min-h-11 px-2 text-zinc-300 underline decoration-zinc-600 underline-offset-4 hover:text-white">Cancel</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={pendingAction !== null} onClick={() => void handleBatchFavorite()} className="flex min-h-11 items-center gap-2 rounded-lg border border-amber-400/30 px-3 text-sm font-medium text-amber-100 hover:bg-amber-300/10 disabled:opacity-50"><Star aria-hidden="true" className="h-4 w-4" /> Favorite</button>
            <button type="button" disabled={pendingAction !== null} onClick={() => void handleDelete([...selectedAssetIds])} className="flex min-h-11 items-center gap-2 rounded-lg border border-rose-400/30 px-3 text-sm font-medium text-rose-100 hover:bg-rose-300/10 disabled:opacity-50"><Trash2 aria-hidden="true" className="h-4 w-4" /> Delete</button>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        hasFilters ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.015] px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-zinc-400"><Search aria-hidden="true" className="h-5 w-5" /></div>
            <h2 className="mt-4 text-base font-semibold text-white">No matching images</h2>
            <p className="mt-1 max-w-sm text-sm text-zinc-400">Try a broader search or reset the active filters to see your full library.</p>
            <button type="button" onClick={() => { setSearchInput(''); setSelectedSession('all'); setSelectedAspectRatio('all'); setOnlyFavorites(false); }} className="mt-5 min-h-11 rounded-lg border border-white/[0.12] bg-white/[0.04] px-4 text-sm font-semibold text-white hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">Reset filters</button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.015]">
            <div className="grid gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)] lg:items-center">
              <div className="max-w-lg">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300"><ImageIcon aria-hidden="true" className="h-5 w-5" /></div>
                <h2 className="mt-5 text-lg font-semibold tracking-[-0.01em] text-white">Your private library is ready</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">Create privately in Image Studio. Finished Works stay in your account and are never added to public discovery.</p>
                <Link href="/images/create" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">Create privately</Link>
              </div>
              <div aria-hidden="true" className="grid grid-cols-3 items-end gap-2 opacity-70">
                <div className="aspect-[4/5] rounded-lg border border-white/[0.08] bg-white/[0.025] p-2"><div className="h-full rounded-md bg-gradient-to-br from-indigo-400/[0.09] to-transparent" /></div>
                <div className="aspect-square rounded-lg border border-white/[0.1] bg-white/[0.035] p-2"><div className="flex h-full items-center justify-center rounded-md bg-gradient-to-br from-indigo-400/[0.12] via-cyan-300/[0.06] to-transparent"><ImageIcon className="h-6 w-6 text-white/20" /></div></div>
                <div className="aspect-[4/5] rounded-lg border border-white/[0.08] bg-white/[0.025] p-2"><div className="h-full rounded-md bg-gradient-to-bl from-cyan-300/[0.08] to-transparent" /></div>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-8">
          {groupedRecords.map(([label, items]) => (
            <section key={label} aria-labelledby={`group-${items[0].record.id}`}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 id={`group-${items[0].record.id}`} className="text-sm font-semibold text-zinc-200">{label}</h2>
                <span className="text-xs tabular-nums text-zinc-400">{items.length} {items.length === 1 ? 'image' : 'images'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {items.map(({ record, index }) => {
                  const selected = selectedAssetIds.has(record.id);
                  return (
                    <article key={record.id} className={`group relative min-w-0 overflow-hidden rounded-lg border bg-[#0d101c] ${selected ? 'border-indigo-300 ring-2 ring-indigo-400/50' : 'border-white/[0.08] hover:border-white/[0.2]'}`}>
                      <button type="button" onClick={() => setActiveLightboxIndex(index)} aria-label={`Open image: ${record.prompt}`} className="relative block aspect-square w-full overflow-hidden bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-300">
                        {record.publicUrl ? <Image src={record.publicUrl} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" className="object-cover transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.025]" /> : <span className="flex h-full items-center justify-center text-zinc-600"><ImageIcon aria-hidden="true" className="h-6 w-6" /></span>}
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-10 text-left text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none"><span className="line-clamp-2">{record.prompt}</span></span>
                      </button>
                      <button type="button" aria-label={selected ? `Deselect ${record.prompt}` : `Select ${record.prompt}`} aria-pressed={selected} onClick={(event) => toggleSelection(record.id, index, event)} className={`absolute left-2 top-2 flex h-11 w-11 items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${selected ? 'border-indigo-300 bg-indigo-500 text-white' : 'border-white/40 bg-black/55 text-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'}`}><Check aria-hidden="true" className="h-5 w-5" /></button>
                      <span aria-label="Private Work" title="Private Work" className="absolute right-14 top-2 flex h-11 items-center gap-1.5 rounded-full border border-amber-400/50 bg-black/75 px-3 text-xs font-medium text-amber-200"><Lock aria-hidden="true" className="h-3.5 w-3.5" />Private</span>
                      <button type="button" aria-label={record.isFavorite ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={record.isFavorite} disabled={pendingAction === `favorite:${record.id}`} onClick={(event) => void handleToggleFavorite(record, event)} className={`absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/55 shadow-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 ${record.isFavorite ? 'text-amber-300' : 'text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'}`}><Star aria-hidden="true" className={`h-5 w-5 ${record.isFavorite ? 'fill-current' : ''}`} /></button>
                      <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2 text-xs">
                        <span className="truncate text-zinc-400">{record.model.replace(/^openai-/, '')}</span>
                        <div className="flex shrink-0 items-center gap-1.5 text-zinc-400">
                          <span className="tabular-nums">{record.aspectRatio}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-300">
                            <Lock className="h-3 w-3" />
                            Private
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
          {nextCursor && <div className="flex justify-center pt-2"><button type="button" disabled={loadingMore} onClick={() => void fetchLibrary(nextCursor)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.035] px-5 text-sm font-medium text-zinc-200 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50">{loadingMore && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />} {loadingMore ? 'Loading more…' : 'Load more'}</button></div>}
        </div>
      )}

      {activeRecord && activeLightboxIndex !== null && (
        <div role="dialog" aria-modal="true" aria-labelledby="image-inspector-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setActiveLightboxIndex(null); }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-0 sm:p-5">
          <div ref={dialogRef} className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden bg-[#07080d] shadow-[0_20px_70px_rgba(0,0,0,0.65)] sm:h-auto sm:max-h-[92vh] sm:rounded-xl sm:border sm:border-white/[0.1] lg:flex-row">
            <button ref={closeButtonRef} type="button" aria-label="Close image inspector" onClick={() => setActiveLightboxIndex(null)} className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-sm hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><X aria-hidden="true" className="h-5 w-5" /></button>
            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black p-3 sm:p-6">
              {/* The inspector intentionally uses the original asset instead of an optimized derivative. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeRecord.publicUrl} alt={activeRecord.prompt} className="max-h-[58vh] max-w-full object-contain lg:max-h-[86vh]" />
              <button type="button" aria-label="Previous image" disabled={activeLightboxIndex === 0} onClick={() => setActiveLightboxIndex((index) => index === null ? null : Math.max(0, index - 1))} className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white disabled:invisible"><ChevronLeft aria-hidden="true" className="h-5 w-5" /></button>
              <button type="button" aria-label="Next image" disabled={activeLightboxIndex === records.length - 1} onClick={() => setActiveLightboxIndex((index) => index === null ? null : Math.min(records.length - 1, index + 1))} className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white disabled:invisible"><ChevronRight aria-hidden="true" className="h-5 w-5" /></button>
            </div>
            <aside className="w-full shrink-0 overflow-y-auto border-t border-white/[0.08] bg-[#0d101c] p-5 lg:max-h-[92vh] lg:w-[22rem] lg:border-l lg:border-t-0">
              <div className="pr-12">
                <h2 id="image-inspector-title" className="text-base font-semibold text-white">Image details</h2>
                <p className="mt-1 text-xs text-zinc-400">{TIME_FORMATTER.format(new Date(activeRecord.createdAt))}</p>
              </div>
              <div className="mt-5">
                <h3 className="text-xs font-semibold text-zinc-400">Prompt</h3>
                <p className="mt-1.5 break-words text-sm leading-6 text-zinc-100">{activeRecord.prompt}</p>
                <button type="button" onClick={() => void copyToClipboard(activeRecord.prompt, 'prompt')} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm text-indigo-300 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">{copiedField === 'prompt' ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />} {copiedField === 'prompt' ? 'Copied' : 'Copy prompt'}</button>
              </div>

              {/* Private Work is a content class, not a visibility toggle. */}
              <div className="mt-5 rounded-lg border border-white/[0.08] bg-white/[0.025] p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-semibold text-zinc-200">Private Work</span>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">Visible only to you. Human accounts cannot publish Works to GALX.</p>
              </div>

              <dl className="mt-5 divide-y divide-white/[0.06] border-y border-white/[0.08] text-sm">
                {[
                  ['Model', activeRecord.model],
                  ['Dimensions', `${activeRecord.dimensions} (${activeRecord.aspectRatio})`],
                  ['Quality', activeRecord.quality],
                  ['File size', formatBytes(activeRecord.sizeBytes)],
                  ['Session', activeRecord.sessionId],
                  ['Work type', 'Private · only you']
                ].map(([term, value]) => <div key={term} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-3"><dt className="text-zinc-400">{term}</dt><dd className="min-w-0 break-words text-right text-zinc-200">{value}</dd></div>)}
              </dl>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <a href={activeRecord.publicUrl} download={`${activeRecord.id}.${activeRecord.contentType.split('/')[1] || 'png'}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-3 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"><Download aria-hidden="true" className="h-4 w-4" /> Download</a>
                <button type="button" onClick={() => void handleToggleFavorite(activeRecord)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.12] px-3 text-sm font-medium text-zinc-200 hover:bg-white/[0.06]"><Star aria-hidden="true" className={`h-4 w-4 ${activeRecord.isFavorite ? 'fill-amber-300 text-amber-300' : ''}`} /> {activeRecord.isFavorite ? 'Favorited' : 'Favorite'}</button>
              </div>
              <button type="button" disabled={pendingAction === 'delete'} onClick={() => void handleDelete([activeRecord.id])} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-rose-300 hover:bg-rose-300/[0.08] disabled:opacity-50"><Trash2 aria-hidden="true" className="h-4 w-4" /> Delete image</button>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
