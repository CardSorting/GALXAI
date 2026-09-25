'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { workspaceFetch } from '@/lib/auth/workspace-client';
import { startActivityPolling, imageStatusDelay, retryAfterDelay } from '@/lib/resilience/activity-polling';
import { DEFAULT_SETTINGS, appendCreations, generationBody, readGeneration, readLibrary, readImageDetail, readPending, readSettings, readPrivateAllowance, studioError,
  readPendingGenerations, generationStatusFailure, MAX_ACTIVE_GENERATIONS,
  type PendingGeneration, type StudioImage, type StudioImageAllowance, type StudioSettings } from './studio-contract';

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
  const [activeCount, setActiveCount] = useState(0);
  const [polling, setPolling] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<StudioSettings | null>(null);
  const [recoverableSubmission, setRecoverableSubmission] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [availability, setAvailability] = useState<'available' | 'unavailable' | 'unknown'>('unknown');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityRetryAt, setAvailabilityRetryAt] = useState(0);
  const [imageAllowance, setImageAllowance] = useState<StudioImageAllowance | null>(null);
  const [allowanceChecking, setAllowanceChecking] = useState(true);
  const [allowanceUnavailable, setAllowanceUnavailable] = useState(false);
  const allowanceSequence = useRef(0);
  const availabilityLock = useRef(false);
  const availabilitySequence = useRef(0);
  const availabilityAttempt = useRef(0);
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
  const activeTasks = useRef<Map<string, PendingGeneration>>(new Map());
  const headers = useCallback((): Record<string, string> => ({ Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }), [token]);

  const refreshAllowance = useCallback(async () => {
    const sequence = ++allowanceSequence.current;
    if (!owner) { setImageAllowance(null); setAllowanceUnavailable(false); setAllowanceChecking(false); return; }
    setAllowanceChecking(true);
    try {
      const response = await workspaceFetch(owner, '/api/billing/image-allowance', {
        headers: headers(), cache: 'no-store', signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error('Allowance unavailable');
      const value = readPrivateAllowance(await response.json());
      if (alive.current && sequence === allowanceSequence.current) {
        setImageAllowance(value); setAllowanceUnavailable(false);
      }
    } catch {
      if (alive.current && sequence === allowanceSequence.current) setAllowanceUnavailable(true);
    } finally {
      if (alive.current && sequence === allowanceSequence.current) setAllowanceChecking(false);
    }
  }, [headers, owner]);

  useEffect(() => { void refreshAllowance(); }, [refreshAllowance]);

  const checkAvailability = useCallback(async (manual = false) => {
    if (!owner || availabilityLock.current) return;
    if (manual) {
      availabilityAttempt.current = 0;
      setAvailabilityRetryAt(0);
    }
    availabilityLock.current = true; setCheckingAvailability(true);
    const sequence = ++availabilitySequence.current;
    try {
      const response = await workspaceFetch(owner, '/api/images/availability', {
        headers: headers(), cache: 'no-store', signal: AbortSignal.timeout(7000),
      });
      const data = await response.json().catch(() => null);
      if (!alive.current || sequence !== availabilitySequence.current) return;
      if (response.ok && (data?.status === 'available' || data?.status === 'unavailable')) {
        setAvailability(data.status);
        if (data.status === 'available') {
          availabilityAttempt.current = 0;
          setAvailabilityRetryAt(0);
        } else {
          const delay = Math.min(60_000, 15_000 * (2 ** Math.min(availabilityAttempt.current++, 3)));
          setAvailabilityRetryAt(Date.now() + Math.round(delay * (0.85 + Math.random() * 0.3)));
        }
      } else {
        setAvailability('unknown');
        const delay = Math.min(60_000, 5_000 * (2 ** Math.min(availabilityAttempt.current++, 3)));
        setAvailabilityRetryAt(Date.now() + Math.round(delay * (0.85 + Math.random() * 0.3)));
      }
    } catch {
      if (alive.current && sequence === availabilitySequence.current) {
        setAvailability('unknown');
        const delay = Math.min(60_000, 5_000 * (2 ** Math.min(availabilityAttempt.current++, 3)));
        setAvailabilityRetryAt(Date.now() + Math.round(delay * (0.85 + Math.random() * 0.3)));
      }
    }
    finally { if (sequence === availabilitySequence.current) { availabilityLock.current = false; if (alive.current) setCheckingAvailability(false); } }
  }, [owner, headers]);

  useEffect(() => {
    alive.current = true;
    const draft = stored(`${key}:draft`) ?? (owner ? stored('galx-image-studio:guest:draft') : null);
    if (draft) setSettings(readSettings(draft));
    if (owner) save('galx-image-studio:guest:draft', null);
    activeTasks.current.clear();
    setRecoverableSubmission(Boolean(readPending(stored(`${key}:submission`))));
    const restored = readPendingGenerations(stored(`${key}:tasks`) ?? stored(`${key}:pending`));
    restored.forEach(task => activeTasks.current.set(task.id, task));
    setActiveCount(restored.length);
    const request = restored.at(-1);
    if (request) {
      activeTasks.current.set(request.id, request);
      setPending(request);
      setPolling(restored.some(task => !task.paused));
    }
    else if (stored(`${key}:unconfirmed`) === true) {
      setUncertain(true);
      setError('An earlier request was interrupted. Check your library before generating again.');
    }
    setReady(true);
    return () => { alive.current = false; submitController.current?.abort(); libraryController.current?.abort(); };
  }, [key, owner]);
  const invalidateAvailability = useCallback(() => {
    availabilitySequence.current++;
    availabilityLock.current = false;
    availabilityAttempt.current = 0;
  }, []);
  useEffect(() => {
    setAvailability('unknown');
    availabilityAttempt.current = 0;
    setAvailabilityRetryAt(0);
    void checkAvailability();
    return invalidateAvailability;
  }, [checkAvailability, invalidateAvailability]);
  useEffect(() => {
    if (!owner || !availabilityRetryAt || availability === 'available') return;
    const timer = window.setTimeout(() => {
      if (document.visibilityState !== 'visible') {
        setAvailabilityRetryAt(Date.now() + 15_000);
        return;
      }
      void checkAvailability();
    }, Math.max(0, availabilityRetryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [availability, availabilityRetryAt, checkAvailability, owner]);
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
      // Loading a page cannot establish the outcome of an unrelated generation.
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

  const persistTasks = useCallback(() => {
    const tasks = [...activeTasks.current.values()];
    save(`${key}:tasks`, tasks.length ? tasks : null);
    save(`${key}:pending`, null);
    setActiveCount(tasks.length);
    setPending(tasks.filter(task => !task.paused).at(-1) || tasks.at(-1) || null);
  }, [key]);

  const resumeUpdates = useCallback(() => {
    for (const task of activeTasks.current.values()) delete task.paused;
    persistTasks(); setPolling(true);
  }, [persistTasks]);

  useEffect(() => {
    if (!polling || !owner || activeTasks.current.size === 0) return;
    let active = true, attempt = 0;
    const checkStartedAt = Date.now();
    setError(''); setProgress('Checking your private creation…');
    const stop = startActivityPolling(async signal => {
      const tasks = [...activeTasks.current.values()].filter(task => !task.paused);
      if (!tasks.length) { setPolling(false); return null; }
      let delay = imageStatusDelay(attempt++, null), changed = false, completedAny = false;
      // A bounded set of independent GETs avoids one slow result blocking the rest.
      await Promise.all(tasks.map(async task => {
        try {
          const response = await workspaceFetch(owner, `/v1/images/requests/${encodeURIComponent(task.id)}`, {
            headers: headers(), signal: AbortSignal.any([signal, AbortSignal.timeout(25_000)]), cache: 'no-store',
          });
          const payload = await response.json().catch(() => null);
          if (!active || !alive.current || signal.aborted) return;
          delay = Math.max(delay, retryAfterDelay(response.headers.get('Retry-After')));
          if (!response.ok) {
            const failure = generationStatusFailure(response.status, payload);
            if (failure === 'not-started') {
              activeTasks.current.delete(task.id); changed = true;
              const time = Date.now(); setNow(time); setRetryAt(time + Math.max(5000, delay));
              setError('Your image generation did not start. Try again shortly.');
              void checkAvailability();
              void refreshAllowance();
            } else if (failure === 'auth' || failure === 'unconfirmed') {
              task.paused = true; changed = true;
              setError(studioError(response.status));
            } else {
              setProgress('Your private creation is still in progress.');
            }
            return;
          }
          if (response.status === 202) {
            if (task.id === pending?.id) setProgress('Your private creation is in progress.');
            return;
          }
          const completed = readGeneration(payload, task.settings, task.id);
          setCreations(current => appendCreations(current, completed, pinned.current));
          activeTasks.current.delete(task.id); changed = true; completedAny = true;
          setNotice('Your images are ready. Download them or reuse the prompt.');
        } catch {
          if (active && alive.current && !signal.aborted) setProgress('Your private creation is still in progress.');
        }
      }));
      if (!active || !alive.current || signal.aborted) return null;
      if (changed) persistTasks();
      if (completedAny) refresh();
      if (![...activeTasks.current.values()].some(task => !task.paused)) { setPolling(false); return null; }
      if (Date.now() - checkStartedAt >= 300_000) {
        setPolling(false); setNotice('Updates paused after a long wait. Resume updates to check the same requests.');
        return null;
      }
      return delay;
    });
    return () => { active = false; stop(); };
  }, [headers, owner, pending?.id, polling, refresh, refreshAllowance, persistTasks, checkAvailability]);

  async function generate(recovery?: PendingGeneration) {
    const requestedSettings = recovery?.settings || settings;
    const requestedUnits = imageAllowance?.allowance
      ? requestedSettings.count * (requestedSettings.quality === 'hd' ? imageAllowance.allowance.hdOutputUnits : imageAllowance.allowance.standardOutputUnits)
      : Number.POSITIVE_INFINITY;
    const allowanceBlocks = !imageAllowance?.plan || !imageAllowance.privateCreationAvailable ||
      requestedUnits > (imageAllowance.allowance?.remainingUnits ?? 0);
    if (!owner || !requestedSettings.prompt.trim() || submitting || submitLock.current ||
      (!recovery && (availability === 'unavailable' || allowanceUnavailable || allowanceChecking || allowanceBlocks)) ||
      (uncertain && !recovery) || activeTasks.current.size >= MAX_ACTIVE_GENERATIONS || Date.now() < retryAt) return;
    submitLock.current = true; setSubmitting(true); setError(''); setNotice('');
    setUncertain(false); save(`${key}:unconfirmed`, null);
    const controller = new AbortController(); submitController.current = controller;
    const timeout = setTimeout(() => controller.abort(), 180_000);
    const snapshot = readSettings(recovery?.settings || settings);
    setSubmission(snapshot);
    const id = recovery?.id || crypto.randomUUID();
    save(`${key}:submission`, { id, startedAt: recovery?.startedAt || Date.now(), settings: snapshot });
    setRecoverableSubmission(true);
    save(`${key}:unconfirmed`, true);
    try {
      const response = await workspaceFetch(owner, '/v1/images/generations', { method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json', Prefer: 'respond-async', 'Idempotency-Key': id },
        body: JSON.stringify(generationBody(snapshot)), signal: controller.signal });
      void refreshAllowance();
      if (!alive.current) return;
      if (!response.ok) {
        const seconds = Number(response.headers.get('Retry-After'));
        if (Number.isFinite(seconds) && seconds > 0) { const time = Date.now(); setNow(time); setRetryAt(time + Math.min(seconds, 3600) * 1000); }
        const code=(await response.json().catch(()=>null))?.error?.code;
        setError(code==='image_plan_required'?'A paid GALX Images tier is required for private creation.'
          : code==='image_allowance_exhausted'?'Creation allowance exhausted. Review your plan or wait for renewal.'
          : code==='image_allowance_unavailable'?'Your creation allowance could not be verified. No image was dispatched; try again shortly.'
          : code==='publishing_forbidden'?'Human accounts cannot publish Works to GALX.'
          : studioError(response.status));
        if (response.status >= 500) setUncertain(true);
        else { save(`${key}:unconfirmed`, null); save(`${key}:submission`, null); setRecoverableSubmission(false); }
        return;
      }
      const payload = await response.json();
      if (!alive.current) return;
      if (response.status === 202) {
        const request = readPending({ id: payload.id, startedAt: Date.now(), settings: snapshot });
        if (!request) throw new Error('Invalid request receipt');
        activeTasks.current.set(request.id, request);
        persistTasks(); save(`${key}:unconfirmed`, null); save(`${key}:submission`, null); setRecoverableSubmission(false); setPolling(true);
      } else {
        const completed = readGeneration(payload, snapshot, id);
        setCreations(current => appendCreations(current, completed, pinned.current));
        save(`${key}:unconfirmed`, null); save(`${key}:submission`, null); setRecoverableSubmission(false); refresh(); void refreshAllowance(); setNotice('Your images are ready.');
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
    // Explicit dismissal releases only paused/unconfirmed work; active work stays tracked.
    for (const task of activeTasks.current.values()) if (task.paused) activeTasks.current.delete(task.id);
    persistTasks(); setUncertain(false); setError(''); save(`${key}:unconfirmed`, null); save(`${key}:submission`, null); setRecoverableSubmission(false);
    setNotice('Ready for a new generation. Earlier images may still appear in your library.');
  }

  async function cancelPending() {
    if (owner) {
      const taskIds = Array.from(activeTasks.current.keys());
      if (pending && !taskIds.includes(pending.id)) taskIds.push(pending.id);
      for (const targetId of taskIds) {
        void workspaceFetch(owner, `/v1/images/requests/${encodeURIComponent(targetId)}`, {
          method: 'DELETE',
          headers: headers(),
        }).catch(() => { /* best-effort cancel */ });
      }
    }
    clearPending();
  }

  return { availability, checkingAvailability, checkAvailability, recoverableSubmission, recoverSubmission: () => { const original = readPending(stored(`${key}:submission`)); if (original) void generate(original); }, activeCount, atCapacity: activeCount >= MAX_ACTIVE_GENERATIONS, resumeUpdates, settings, setSettings, ready, pending, polling, setPolling, submitting, submission, uncertain, progress, error, notice, setNotice,
    retryIn: Math.max(0, Math.ceil((retryAt - now) / 1000)),
    creations, images, total, cursor, previousCursor, page, getDetails, libraryLoading: libraryLoading || Boolean(owner && libraryActive && !libraryView.current), libraryError, search, setSearch, favorites, sort, setSort,
    generate, refresh, imageAllowance, allowanceChecking, allowanceUnavailable, refreshAllowance, retryLibrary: () => { if (!libraryLoading) void fetchLibrary(libraryRetry.current.cursor, libraryRetry.current.page); },
    firstPage: () => { if (!libraryLoading) void fetchLibrary(); },
    nextPage: () => { if (cursor && !libraryLoading) void fetchLibrary(cursor, page + 1); },
    previousPage: () => { if (previousCursor && !libraryLoading) void fetchLibrary(previousCursor, Math.max(1, page - 1)); },
    toggleFavorite, busyAsset, clearPending, cancelPending };
}
