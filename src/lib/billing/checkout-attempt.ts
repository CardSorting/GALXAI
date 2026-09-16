/** Account-scoped browser retry hints. The server owns payment state. */
const key = (accountId: string, amount: number, surface: 'billing' | 'keys') => `galx_checkout:${accountId}:${surface}:${amount}`;
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function creditCheckoutAttempt(storage: Storage, accountId: string, amount: number, now = Date.now()): string {
  for (const surface of ['billing', 'keys'] as const) {
    try {
      const saved = JSON.parse(storage.getItem(key(accountId, amount, surface)) || 'null');
      if (saved && typeof saved.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved.id) && Number.isFinite(saved.created) && saved.created <= now && now - saved.created < 90 * 60_000) {
        // Move the hint without changing an already-issued payment identity.
        try { storage.setItem(key(accountId, amount, 'billing'), JSON.stringify(saved)); } catch { /* In-memory retry still works. */ }
        return saved.id;
      }
    } catch { /* Malformed or disabled optional storage. */ }
  }
  const id = crypto.randomUUID();
  try { storage.setItem(key(accountId, amount, 'billing'), JSON.stringify({ id, created: now })); } catch { /* In-memory retry still works. */ }
  return id;
}
export function clearCreditCheckoutAttempt(storage: Storage, accountId: string, amount: number) {
  for (const surface of ['billing', 'keys'] as const) {
    try { storage.removeItem(key(accountId, amount, surface)); } catch { /* Optional storage. */ }
  }
}
