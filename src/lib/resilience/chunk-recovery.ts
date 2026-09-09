const KEY = 'galx_chunk_reload_attempt';
const WINDOW_MS = 5 * 60_000;
/** Both error entry points share a durable, fail-closed reload allowance. */
export function claimChunkReload(storage: Pick<Storage, 'getItem' | 'setItem'>, now = Date.now()): boolean {
  try {
    const raw = storage.getItem(KEY);
    if (raw !== null) {
      const prior = Number(raw);
      if (!Number.isFinite(prior) || now - prior < WINDOW_MS) return false;
    }
    storage.setItem(KEY, String(now));
    return storage.getItem(KEY) === String(now);
  } catch { return false; }
}
