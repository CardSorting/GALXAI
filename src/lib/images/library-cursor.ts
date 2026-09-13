import { createHash } from 'node:crypto';
import type { ImageLibraryFilterOptions } from '@/core/contracts/GalxContracts';

export class InvalidImageLibraryQuery extends Error {}
export interface LibraryCursor { createdAt: string; id: string; before?: boolean; scope?: string }
export function libraryScope(owner: string, options: ImageLibraryFilterOptions): string {
  return createHash('sha256').update(JSON.stringify([owner, options.sort || 'newest', options.search || '', options.isFavorite, options.sessionId || '', options.aspectRatio || '', options.includeSummary !== false])).digest('hex').slice(0, 32);
}
export function encodeLibraryCursor(cursor: LibraryCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}
export function decodeLibraryCursor(value?: string, scope?: string): LibraryCursor | null {
  if (!value) return null;
  if (value.length > 768 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new InvalidImageLibraryQuery();
  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor) || Object.keys(cursor).some(key => !['createdAt','id','before','scope'].includes(key)) ||
      typeof cursor.createdAt !== 'string' || !/^\d{4}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d(?::?\d\d)?)$/.test(cursor.createdAt) || !Number.isFinite(Date.parse(cursor.createdAt)) ||
      typeof cursor.id !== 'string' || !/^[A-Za-z0-9._:-]{1,160}$/.test(cursor.id) ||
      (cursor.before !== undefined && typeof cursor.before !== 'boolean') || (scope && cursor.scope !== scope)) throw new Error();
    // Preserve PostgreSQL microseconds. Converting through Date would skip tied rows.
    return { createdAt: cursor.createdAt, id: cursor.id, before: cursor.before === true, scope: cursor.scope };
  } catch { throw new InvalidImageLibraryQuery(); }
}

export function readImageLibraryQuery(params: URLSearchParams): ImageLibraryFilterOptions {
  const allowed = ['limit','sort','search','sessionId','aspectRatio','isFavorite','cursor','summary'];
  for (const key of params.keys()) if (!allowed.includes(key) || params.getAll(key).length !== 1) throw new InvalidImageLibraryQuery();
  const limit = Number(params.get('limit') ?? 48), sort = params.get('sort') ?? 'newest';
  const search = params.get('search')?.trim(), sessionId = params.get('sessionId') || undefined, aspectRatio = params.get('aspectRatio') || undefined;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !['newest','oldest'].includes(sort) ||
    (search && search.length > 200) || (sessionId && !/^[A-Za-z0-9._:-]{1,160}$/.test(sessionId)) ||
    (aspectRatio && aspectRatio !== 'all' && !/^\d{1,2}:\d{1,2}$/.test(aspectRatio)) ||
    (params.has('isFavorite') && !['true','false'].includes(params.get('isFavorite')!)) ||
    (params.has('summary') && !['full','none'].includes(params.get('summary')!))) throw new InvalidImageLibraryQuery();
  const cursor = params.get('cursor') || undefined;
  decodeLibraryCursor(cursor);
  return { limit, sort: sort as 'newest' | 'oldest', search: search || undefined, sessionId, aspectRatio,
    isFavorite: params.has('isFavorite') ? params.get('isFavorite') === 'true' : undefined, cursor, includeSummary: params.get('summary') !== 'none' };
}
