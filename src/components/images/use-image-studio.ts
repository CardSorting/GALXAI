'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GENERATION_QUOTA_CHANGED } from '@/lib/billing/free-generation-contract';
import { workspaceFetch } from '@/lib/auth/workspace-client';
import { startActivityPolling, imageStatusDelay } from '@/lib/resilience/activity-polling';
import { DEFAULT_SETTINGS, appendCreations, generationBody, readGeneration, readLibrary, readImageDetail, readPending, readSettings, studioError,
  estimateGenerationSeconds, calculateGenerationProgress,
  type PendingGeneration, type StudioImage, type StudioSettings } from './studio-contract';

function stored(key: string): unknown {
  try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; }
}
function save(key: string, value: unknown) {
  try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing may disable storage. */ }
}

export function useImageStudio(owner: string | null, token?: string, libraryActive = true, pinnedId?: string | null, favorites = false) {
  const pinned = useRef(pinnedId); pinned.current = pinnedId;
  const key = `galx-image-studio:${owner || 'guest'}`;
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<PendingGeneration | null>(null);
  const [polling, setPolling] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<StudioSettings | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [creations, setCreations] = useState<StudioImage[]>([]);
  const [images, setImages] = useState<StudioImage[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [previousCursor, setPreviousCursor] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [filter, setFilter] = useState('');
  const [revision, setRevision] = useState(0);
  const [busyAsset, setBusyAsset] = useState<string | null>(null);
  const alive = useRef(true);
  const submitLock = useRef(false);
  const submitController = useRef<AbortController | null>(null);
  const libraryController = useRef<AbortController | null>(null);
  const librarySequence = useRef(0);
  const libraryView = useRef('');
  const libraryRetry = useRef<{ cursor?: string; page: number }>({ page: 1 });
  const loadedPage = useRef<{ cursor?: string; page: number }>({ page: 1 });
  const assetLock = useRef(false);
  const headers = useCallback((): Record<string, string> => ({ Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }), [token]);

  useEffect(() => {
    alive.current = true;
    const draft = stored(`${key}:draft`) ?? (owner ? stored('galx-image-studio:guest:draft') : null);
    if (draft) setSettings(readSettings(draft));
    if (owner) save('galx-image-studio:guest:draft', null);
    const request = readPending(stored(`${key}:pending`));
    if (request) { setPending(request); setPolling(true); }
    else if (stored(`${key}:unconfirmed`) === true) {
      setUncertain(true);
      setError('An earlier request was interrupted. Check your library before generating again.');
    }
    setReady(true);
    return () => { alive.current = false; submitController.current?.abort(); libraryController.current?.abort(); };
  }, [key, owner]);
  useEffect(() => { if (ready) save(`${key}:draft`, settings); }, [key, ready, settings]);
  useEffect(() => { const timer = window.setTimeout(() => setFilter(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    if (!pending && !submitting && !retryAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pending, retryAt, submitting]);
  useEffect(() => { if (retryAt && now >= retryAt) setRetryAt(0); }, [now, retryAt]);

  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const fetchLibrary = useCallback(async (after?: string, requestedPage = 1) => {
    if (!owner) { setImages([]); setLibraryLoading(false); return; }
    const sequence = ++librarySequence.current;
    libraryController.current?.abort();
    const controller = new AbortController(); libraryController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    setLibraryLoading(true); setLibraryError('');
    const view = JSON.stringify([owner, filter, favorites, sort]);
    if (!after && libraryView.current !== view) { setImages([]); setCursor(null); setPreviousCursor(null); setPage(1); }
    libraryView.current = view;
    const params = new URLSearchParams({ limit: '36', sort, summary: 'none' });
    if (filter) params.set('search', filter);
    if (favorites) params.set('isFavorite', 'true');
    if (after) params.set('cursor', after);
    let failureMessage = 'Your library couldn’t be loaded. Try refreshing it.';
    let accessDenied = false;
    try {
      const response = await workspaceFetch(owner, `/api/images/library?${params}`, { headers: headers(), signal: controller.signal, cache: 'no-store' });
      if (!response.ok) {
        if ([401,403].includes(response.status) && alive.current && sequence === librarySequence.current) {
          accessDenied = true;
          setImages([]); setCursor(null); setPreviousCursor(null); setPage(1); setTotal(null);
          failureMessage = studioError(response.status);
        }
        throw new Error('Library unavailable');
      }
      const result = readLibrary(await response.json());
      if (!alive.current || sequence !== librarySequence.current) return;
      setImages(result.images);
      setPreviousCursor(result.previousCursor); setPage(requestedPage);
      loadedPage.current = { cursor: after, page: requestedPage };
      setCursor(result.cursor); setTotal(result.total);
    } catch {
      if (alive.current && sequence === librarySequence.current) {
        libraryRetry.current = accessDenied ? { page: 1 } : { cursor: after, page: requestedPage };
        setLibraryError(controller.signal.aborted ? 'Your library took too long to load. Try again.' : failureMessage);
      }
    } finally {
      clearTimeout(timeout);
      if (alive.current && sequence === librarySequence.current) setLibraryLoading(false);
    }
  }, [favorites, filter, headers, owner, sort]);
  const cancelLibrary = useCallback(() => { librarySequence.current++; libraryController.current?.abort(); }, []);
  useEffect(() => {
    if (libraryActive) {
      const sameView = libraryView.current === JSON.stringify([owner, filter, favorites, sort]);
      void fetchLibrary(sameView ? loadedPage.current.cursor : undefined, sameView ? loadedPage.current.page : 1);
    }
    return cancelLibrary;
  }, [fetchLibrary, revision, libraryActive, owner, filter, favorites, sort, cancelLibrary]);

  useEffect(() => {
    if (!pending || !polling || !owner) return;
    let active = true, attempt = 0;
    const deadline = Date.now() + 300_000;
    setError(''); setProgress('Checking your generation…');
    const stop = startActivityPolling(async signal => {
      try {
        const response = await workspaceFetch(owner, `/v1/images/requests/${encodeURIComponent(pending.id)}`, {
          headers: headers(), signal: AbortSignal.any([signal, AbortSignal.timeout(25_000)]), cache: 'no-store',
        });
        if (signal.aborted || !active || !alive.current) return null;
        if (!response.ok) { setError(studioError(response.status)); setPolling(false); return null; }
        const payload = await response.json();
        if (signal.aborted || !active || !alive.current) return null;
        if (response.status === 202) {
          setProgress(payload.status === 'queued' ? 'Waiting to start…' : 'Creating your images…');
          if (Date.now() >= deadline) { setPolling(false); setNotice('Still waiting. You can check the status again or look in your library.'); return null; }
          return imageStatusDelay(attempt++, response.headers.get('Retry-After'));
        }
        const completed = readGeneration(payload, pending.settings, pending.id);
        setCreations(current => appendCreations(current, completed, pinned.current));
        setNotice('Your images are ready. Download them or reuse the prompt.');
        save(`${key}:pending`, null); save(`${key}:unconfirmed`, null); setPending(null); setPolling(false); refresh();
      } catch {
        if (!active || !alive.current) return null;
        setPolling(false); setError('The status check was interrupted. Check again to resume this generation.');
      }
      return null;
    });
    return () => { active = false; stop(); };
  }, [headers, key, owner, pending, polling, refresh]);

  async function generate() {
    if (!owner || !settings.prompt.trim() || submitting || pending || uncertain || submitLock.current || Date.now() < retryAt) return;
    submitLock.current = true; setSubmitting(true); setError(''); setNotice('');
    const controller = new AbortController(); submitController.current = controller;
    const timeout = setTimeout(() => controller.abort(), 180_000);
    const snapshot = readSettings(settings);
    setSubmission(snapshot);
    const id = crypto.randomUUID();
    save(`${key}:unconfirmed`, true);
    try {
      const response = await workspaceFetch(owner, '/v1/images/generations', { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json', Prefer: 'respond-async', 'Idempotency-Key': id },
        body: JSON.stringify(generationBody(snapshot)), signal: controller.signal });
      window.dispatchEvent(new Event(GENERATION_QUOTA_CHANGED));
      if (!alive.current) return;
      if (!response.ok) {
        const seconds = Number(response.headers.get('Retry-After'));
        if (Number.isFinite(seconds) && seconds > 0) { const time = Date.now(); setNow(time); setRetryAt(time + Math.min(seconds, 3600) * 1000); }
        const code=(await response.json().catch(()=>null))?.error?.code;
        setError(code==='free_generation_paused'?'Free image creation is temporarily paused. Your quota was not used. Try later or explore Pro.'
          : code==='free_generation_busy'?'Free image creation is busy right now. Your quota was not used. Try again later.'
          : code==='free_quota_exhausted'?'Your free image quota is used up. Explore Pro to keep creating.':studioError(response.status));
        if (response.status >= 500) setUncertain(true);
        else save(`${key}:unconfirmed`, null);
        return;
      }
      const payload = await response.json();
      if (!alive.current) return;
      if (response.status === 202) {
        const request = readPending({ id: payload.id, startedAt: Date.now(), settings: snapshot });
        if (!request) throw new Error('Invalid request receipt');
        save(`${key}:pending`, request); save(`${key}:unconfirmed`, null); setPending(request); setPolling(true);
      } else {
        const completed = readGeneration(payload, snapshot, id);
        setCreations(current => appendCreations(current, completed, pinned.current));
        save(`${key}:unconfirmed`, null); refresh(); setNotice('Your images are ready.');
      }
    } catch {
      if (alive.current) { setError('The connection was interrupted. Your images may still finish. Check your library before generating again.'); setUncertain(true); }
    } finally {
      clearTimeout(timeout); submitLock.current = false;
      if (alive.current) { setSubmitting(false); setSubmission(null); }
    }
  }

  const getDetails = useCallback(async (image: StudioImage, signal: AbortSignal) => {
    if (image.detailsLoaded !== false) return image;
    const response = await workspaceFetch(owner, `/api/images/library/${encodeURIComponent(image.id)}`, { headers: headers(), signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]), cache: 'no-store' });
    if (!response.ok) throw new Error('Image details could not be loaded. Try again.');
    return readImageDetail(await response.json(), image.id);
  }, [headers, owner]);

  async function toggleFavorite(image: StudioImage) {
    if (!owner || !image.saved || assetLock.current) return;
    assetLock.current = true; setBusyAsset(image.id);
    try {
      const response = await workspaceFetch(owner, `/api/images/library/${encodeURIComponent(image.id)}`, { method: 'PATCH', headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !image.favorite }), signal: AbortSignal.timeout(20_000) });
      if (!response.ok || (await response.json()).success !== true) throw new Error('Favorite could not be saved. Try again.');
      if (!alive.current) return;
      setImages(current => current.map(item => item.id === image.id ? { ...item, favorite: !image.favorite } : item).filter(item => !favorites || item.favorite));
      setNotice(image.favorite ? 'Removed from favorites.' : 'Added to favorites.');
      return true;
    } catch { if (alive.current) setNotice('Favorite could not be saved. Try again.'); }
    finally { assetLock.current = false; if (alive.current) setBusyAsset(null); }
  }
  function clearPending() {
    setPolling(false); setPending(null); setUncertain(false); setError(''); save(`${key}:pending`, null); save(`${key}:unconfirmed`, null);
    setNotice('Ready for a new generation. Earlier images may still appear in your library.');
  }

  async function cancelPending() {
    if (pending && owner) {
      const targetId = pending.id;
      void workspaceFetch(owner, `/v1/images/requests/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
        headers: headers(),
      }).catch(() => { /* best-effort cancel */ });
    }
    clearPending();
  }

  const elapsed = pending ? Math.max(0, Math.floor((now - pending.startedAt) / 1000)) : submitting ? 1 : 0;
  const activeSettings = pending?.settings || submission || settings;
  const estimatedTotal = estimateGenerationSeconds(activeSettings);
  const progressMetrics = calculateGenerationProgress(elapsed, estimatedTotal, pending ? (progress.includes('Waiting') ? 'queued' : 'processing') : 'queued');

  return { settings, setSettings, ready, pending, polling, setPolling, submitting, submission, uncertain, progress, error, notice, setNotice,
    retryIn: Math.max(0, Math.ceil((retryAt - now) / 1000)), elapsed,
    estimatedTotal, remainingSeconds: progressMetrics.remainingSeconds, progressPercent: progressMetrics.percent,
    generationPhase: progressMetrics.phase, phaseStatusText: progressMetrics.statusText,
    creations, images, total, cursor, previousCursor, page, getDetails, libraryLoading: libraryLoading || Boolean(owner && libraryActive && !libraryView.current), libraryError, search, setSearch, favorites, sort, setSort,
    generate, refresh, retryLibrary: () => { if (!libraryLoading) void fetchLibrary(libraryRetry.current.cursor, libraryRetry.current.page); },
    firstPage: () => { if (!libraryLoading) void fetchLibrary(); },
    nextPage: () => { if (cursor && !libraryLoading) void fetchLibrary(cursor, page + 1); },
    previousPage: () => { if (previousCursor && !libraryLoading) void fetchLibrary(previousCursor, Math.max(1, page - 1)); },
    toggleFavorite, busyAsset, clearPending, cancelPending };
}
