'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { startActivityPolling, imageStatusDelay } from '@/lib/resilience/activity-polling';
import { DEFAULT_SETTINGS, generationBody, readGeneration, readLibrary, readPending, readSettings, studioError,
  type PendingGeneration, type StudioImage, type StudioSettings } from './studio-contract';

function stored(key: string): unknown {
  try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; }
}
function save(key: string, value: unknown) {
  try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing may disable storage. */ }
}

export function useImageStudio(owner: string | null, token?: string) {
  const key = `galx-image-studio:${owner || 'guest'}`;
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<PendingGeneration | null>(null);
  const [polling, setPolling] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [latest, setLatest] = useState<StudioImage[]>([]);
  const [images, setImages] = useState<StudioImage[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(Boolean(owner));
  const [libraryError, setLibraryError] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState(false);
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
  const libraryRetryCursor = useRef<string | undefined>(undefined);
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
  const fetchLibrary = useCallback(async (after?: string) => {
    if (!owner) { setImages([]); setLibraryLoading(false); return; }
    const sequence = ++librarySequence.current;
    libraryController.current?.abort();
    const controller = new AbortController(); libraryController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    setLibraryLoading(true); setLibraryError('');
    const view = JSON.stringify([owner, filter, favorites, sort]);
    if (!after && libraryView.current !== view) { setImages([]); setCursor(null); }
    libraryView.current = view;
    const params = new URLSearchParams({ limit: '36', sort });
    if (filter) params.set('search', filter);
    if (favorites) params.set('isFavorite', 'true');
    if (after) params.set('cursor', after);
    let failureMessage = 'Your library couldn’t be loaded. Try refreshing it.';
    let accessDenied = false;
    try {
      const response = await fetch(`/api/images/library?${params}`, { headers: headers(), signal: controller.signal, cache: 'no-store' });
      if (!response.ok) {
        if ([401,403].includes(response.status) && alive.current && sequence === librarySequence.current) {
          accessDenied = true;
          setImages([]); setCursor(null); setTotal(0);
          failureMessage = studioError(response.status);
        }
        throw new Error('Library unavailable');
      }
      const result = readLibrary(await response.json());
      if (!alive.current || sequence !== librarySequence.current) return;
      setImages(current => after ? [...current, ...result.images.filter(image => !current.some(item => item.id === image.id))] : result.images);
      setCursor(result.cursor); setTotal(result.total);
    } catch {
      if (alive.current && sequence === librarySequence.current) {
        libraryRetryCursor.current = accessDenied ? undefined : after;
        setLibraryError(controller.signal.aborted ? 'Your library took too long to load. Try again.' : failureMessage);
      }
    } finally {
      clearTimeout(timeout);
      if (alive.current && sequence === librarySequence.current) setLibraryLoading(false);
    }
  }, [favorites, filter, headers, owner, sort]);
  useEffect(() => { void fetchLibrary(); return () => { libraryController.current?.abort(); }; }, [fetchLibrary, revision]);

  useEffect(() => {
    if (!pending || !polling || !owner) return;
    let active = true, attempt = 0;
    const deadline = Date.now() + 300_000;
    setError(''); setProgress('Checking your generation…');
    const stop = startActivityPolling(async signal => {
      try {
        const response = await fetch(`/v1/images/requests/${encodeURIComponent(pending.id)}`, {
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
        setLatest(readGeneration(payload, pending.settings, pending.id));
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
    const id = crypto.randomUUID();
    save(`${key}:unconfirmed`, true);
    try {
      const response = await fetch('/v1/images/generations', { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json', Prefer: 'respond-async', 'Idempotency-Key': id },
        body: JSON.stringify(generationBody(snapshot)), signal: controller.signal });
      if (!alive.current) return;
      if (!response.ok) {
        const seconds = Number(response.headers.get('Retry-After'));
        if (Number.isFinite(seconds) && seconds > 0) { const time = Date.now(); setNow(time); setRetryAt(time + Math.min(seconds, 3600) * 1000); }
        setError(studioError(response.status));
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
        setLatest(readGeneration(payload, snapshot, id)); save(`${key}:unconfirmed`, null); refresh(); setNotice('Your images are ready.');
      }
    } catch {
      if (alive.current) { setError('The connection was interrupted. Your images may still finish. Check your library before generating again.'); setUncertain(true); }
    } finally {
      clearTimeout(timeout); submitLock.current = false;
      if (alive.current) setSubmitting(false);
    }
  }

  async function toggleFavorite(image: StudioImage) {
    if (!owner || !image.saved || assetLock.current) return;
    assetLock.current = true; setBusyAsset(image.id);
    try {
      const response = await fetch(`/api/images/library/${encodeURIComponent(image.id)}`, { method: 'PATCH', headers: { ...headers(), 'Content-Type': 'application/json' },
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
  return { settings, setSettings, ready, pending, polling, setPolling, submitting, uncertain, progress, error, notice, setNotice,
    retryIn: Math.max(0, Math.ceil((retryAt - now) / 1000)), elapsed: pending ? Math.max(0, Math.floor((now - pending.startedAt) / 1000)) : 0,
    latest, images, total, cursor, libraryLoading, libraryError, search, setSearch, favorites, setFavorites, sort, setSort,
    generate, refresh, retryLibrary: () => { if (!libraryLoading) void fetchLibrary(libraryRetryCursor.current); },
    loadMore: () => { if (cursor && !libraryLoading) void fetchLibrary(cursor); }, toggleFavorite, busyAsset, clearPending };
}
