import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { executePostgresQuery } from '@/lib/db/postgres';
import type { PublicFeedItem } from '@/app/api/images/feed/route';
import {
  PUBLIC_PARTICIPANT_HANDLE_PATTERN,
  normalizePublicParticipantHandle,
  sanitizePublicImageUrl,
} from '@/lib/community/participant-handle';
import type { ParticipantKind } from '@/lib/community/participant-handle';

export {
  PUBLIC_PARTICIPANT_HANDLE_PATTERN,
  normalizePublicParticipantHandle,
} from '@/lib/community/participant-handle';

export interface PublicParticipantProfile {
  displayName: string;
  handle: string;
  bio: string;
  interests: string[];
  avatarUrl: string | null;
  participantKind: ParticipantKind;
  creationCount: number;
}

export interface PublicParticipantCreationsPage {
  items: PublicFeedItem[];
  nextCursor: string | null;
}

export class PublicParticipantRepositoryUnavailable extends Error {}

function encodeCreationCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt},${id}`).toString('base64');
}

function decodeCreationCursor(cursor: string | undefined): { createdAt: string; id: string } | null {
  if (!cursor || cursor.length > 512 || !/^[A-Za-z0-9+/]+={0,2}$/.test(cursor)) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    const parts = decoded.split(',');
    if (parts.length !== 2) return null;
    const [createdAt, id] = parts;
    if (!createdAt || !id || id.length > 200 || Number.isNaN(Date.parse(createdAt))) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export function isValidPublicParticipantCursor(cursor: unknown): cursor is string {
  return typeof cursor === 'string' && decodeCreationCursor(cursor) !== null;
}

function publicText(value: unknown, fallback = '', maxLength = 500): string {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}

export function mapPublicParticipantProfileRow(
  row: Record<string, unknown>,
  fallbackHandle: string,
): PublicParticipantProfile {
  const normalizedHandle = normalizePublicParticipantHandle(row.handle) || fallbackHandle;
  const interests = Array.isArray(row.interests)
    ? Array.from(new Set(
      row.interests
        .map((interest) => publicText(interest, '', 64))
        .filter(Boolean),
    )).slice(0, 12)
    : [];
  const rawCreationCount = Number(row.creation_count);

  return {
    displayName: publicText(row.display_name, normalizedHandle, 120),
    handle: normalizedHandle,
    bio: publicText(row.bio, '', 500),
    interests,
    avatarUrl: sanitizePublicImageUrl(row.avatar_url),
    participantKind: 'star',
    creationCount: Number.isFinite(rawCreationCount) ? Math.max(0, Math.floor(rawCreationCount)) : 0,
  };
}

export function mapPublicParticipantCreationRow(row: Record<string, unknown>): PublicFeedItem {
  let publicUrl = sanitizePublicImageUrl(row.public_url) || '';
  let thumbnailUrl = publicUrl;
  if (row.user_id && row.id) {
    try {
      const token = GalxCryptoVault.sealImageDownload(String(row.user_id), String(row.id));
      publicUrl = `/v1/images/assets/${token}`;
      thumbnailUrl = `/v1/images/assets/${token}/thumbnail`;
    } catch {
      // Keep the allowlisted stored URL if sealing is unavailable.
    }
  }

  return {
    id: publicText(row.id, '', 200),
    prompt: publicText(row.prompt, '', 4000),
    aspect_ratio: publicText(row.aspect_ratio, '1:1', 16),
    dimensions: publicText(row.dimensions, '1024x1024', 32),
    public_url: publicUrl,
    thumbnail_url: thumbnailUrl,
    created_at: new Date(String(row.created_at)).toISOString(),
    lqip: typeof row.lqip === 'string' ? row.lqip.slice(0, 100000) : null,
    likes_count: Number.isFinite(Number(row.likes_count)) ? Math.max(0, Number(row.likes_count)) : 0,
    remix_count: Number.isFinite(Number(row.remix_count)) ? Math.max(0, Number(row.remix_count)) : 0,
    views_count: Number.isFinite(Number(row.views_count)) ? Math.max(0, Number(row.views_count)) : 0,
    author: {
      displayName: publicText(row.author_display_name, 'GALX creator', 120),
      handle: normalizePublicParticipantHandle(row.author_handle),
      avatarUrl: sanitizePublicImageUrl(row.author_avatar_url),
      participantKind: row.participant_kind === 'star' ? 'star' : 'human',
    },
  };
}

export class PublicParticipantRepository {
  static async getProfile(handle: string): Promise<PublicParticipantProfile | null> {
    const normalized = normalizePublicParticipantHandle(handle);
    if (!normalized) return null;
    const result = await executePostgresQuery(`
      SELECT display_name, handle, bio, avatar_url, interests,
             creation_count
      FROM public.community_participant_profiles
      WHERE handle = $1 AND participant_kind = 'star'
      LIMIT 1
    `, [normalized]);
    if (!result) throw new PublicParticipantRepositoryUnavailable();
    const row = result.rows[0];
    if (!row) return null;
    return mapPublicParticipantProfileRow(row as Record<string, unknown>, normalized);
  }

  static async getCreationsPage(
    handle: string,
    options: { cursor?: string; limit?: number } = {},
  ): Promise<PublicParticipantCreationsPage> {
    const normalized = normalizePublicParticipantHandle(handle);
    if (!normalized) return { items: [], nextCursor: null };

    const boundedLimit = Math.max(1, Math.min(options.limit ?? 24, 48));
    const cursor = decodeCreationCursor(options.cursor);
    const params: Array<string | number> = [normalized];
    const conditions = [
      'author_handle = $1',
      "participant_kind = 'star'",
    ];
    let paramIndex = 2;

    if (cursor) {
      conditions.push(`(created_at, id) < ($${paramIndex++}::timestamptz, $${paramIndex++})`);
      params.push(cursor.createdAt, cursor.id);
    }

    params.push(boundedLimit);
    const limitIndex = paramIndex;
    const result = await executePostgresQuery(`
      SELECT id, user_id, prompt, aspect_ratio, dimensions, public_url,
             created_at, lqip, likes_count, remix_count, views_count,
             author_display_name, author_handle, author_avatar_url, participant_kind
      FROM public.community_creations_feed
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC, id DESC
      LIMIT $${limitIndex}
    `, params);
    if (!result) throw new PublicParticipantRepositoryUnavailable();
    const items = result.rows.map((row) => mapPublicParticipantCreationRow(row as Record<string, unknown>));
    const last = result.rows[items.length - 1];

    return {
      items,
      nextCursor: items.length === boundedLimit && last
        ? encodeCreationCursor(new Date(last.created_at).toISOString(), String(last.id))
        : null,
    };
  }

  static async getCreations(handle: string, limit = 36): Promise<PublicFeedItem[]> {
    const page = await PublicParticipantRepository.getCreationsPage(handle, { limit });
    return page.items;
  }
}
