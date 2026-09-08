import { timingSafeEqual } from 'node:crypto';

/** Server-only administrator credential; ordinary user sessions never grant operational access. */
export function hasInternalAccess(headers: Headers): boolean {
  const expected = process.env.GALX_INTERNAL_ADMIN_KEY;
  const supplied = headers.get('x-galx-internal-key');
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
