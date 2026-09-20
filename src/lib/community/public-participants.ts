import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';
import { executePostgresQuery } from '@/lib/db/postgres';
import type { PublicFeedItem } from '@/app/api/images/feed/route';
import type { ParticipantKind } from '@/components/community/ParticipantIdentity';

export interface PublicParticipantProfile {
  displayName: string;
  handle: string;
  bio: string;
  interests: string[];
  avatarUrl: string | null;
  participantKind: ParticipantKind;
  creationCount: number;
  createdAt: string;
}

export class PublicParticipantRepositoryUnavailable extends Error {}

const validHandle = (handle: string): boolean => /^[a-z0-9][a-z0-9_-]{2,31}$/.test(handle);

function normalizeHandle(handle: string): string | null {
  const normalized = handle.trim().toLowerCase();
  return validHandle(normalized) ? normalized : null;
}

function mapCreation(row: any): PublicFeedItem {
  let publicUrl = String(row.public_url || '');
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
    id: String(row.id),
    prompt: String(row.prompt || ''),
    aspect_ratio: String(row.aspect_ratio || '1:1'),
    dimensions: String(row.dimensions || '1024x1024'),
    public_url: publicUrl,
    thumbnail_url: thumbnailUrl,
    created_at: new Date(row.created_at).toISOString(),
    lqip: typeof row.lqip === 'string' ? row.lqip : null,
    likes_count: Number(row.likes_count || 0),
    remix_count: Number(row.remix_count || 0),
    views_count: Number(row.views_count || 0),
    author: {
      displayName: typeof row.author_display_name === 'string' && row.author_display_name.trim()
        ? row.author_display_name.trim()
        : 'GALX creator',
      handle: typeof row.author_handle === 'string' && row.author_handle.trim()
        ? row.author_handle.trim()
        : null,
      avatarUrl: typeof row.author_avatar_url === 'string' && row.author_avatar_url.trim()
        ? row.author_avatar_url.trim()
        : null,
      participantKind: row.participant_kind === 'star' ? 'star' : 'human',
    },
  };
}

export class PublicParticipantRepository {
  static async getProfile(handle: string): Promise<PublicParticipantProfile | null> {
    const normalized = normalizeHandle(handle);
    if (!normalized) return null;
    const result = await executePostgresQuery(`
      SELECT display_name, handle, bio, avatar_url, interests,
             participant_kind, creation_count, created_at
      FROM public.community_participant_profiles
      WHERE handle = $1 AND participant_kind = 'star'
      LIMIT 1
    `, [normalized]);
    if (!result) throw new PublicParticipantRepositoryUnavailable();
    const row = result.rows[0];
    if (!row) return null;
    return {
      displayName: String(row.display_name || normalized),
      handle: String(row.handle),
      bio: String(row.bio || ''),
      interests: Array.isArray(row.interests) ? row.interests.map(String).slice(0, 12) : [],
      avatarUrl: typeof row.avatar_url === 'string' && row.avatar_url ? row.avatar_url : null,
      participantKind: 'star',
      creationCount: Number(row.creation_count || 0),
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  static async getCreations(handle: string, limit = 36): Promise<PublicFeedItem[]> {
    const normalized = normalizeHandle(handle);
    if (!normalized) return [];
    const boundedLimit = Math.max(1, Math.min(limit, 36));
    const result = await executePostgresQuery(`
      SELECT id, user_id, prompt, aspect_ratio, dimensions, public_url,
             created_at, lqip, likes_count, remix_count, views_count,
             author_display_name, author_handle, author_avatar_url, participant_kind
      FROM public.community_creations_feed
      WHERE author_handle = $1 AND participant_kind = 'star'
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    `, [normalized, boundedLimit]);
    if (!result) throw new PublicParticipantRepositoryUnavailable();
    return result.rows.map(mapCreation);
  }
}
