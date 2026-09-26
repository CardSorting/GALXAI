/** The public network has one creator class: authorized Stars. */
import { publicStarHandle } from './star-public-identity';
export type ParticipantKind = 'star';

export const PUBLIC_PARTICIPANT_HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]{2,31}$/;

export function normalizePublicParticipantHandle(handle: unknown): string | null {
  if (typeof handle !== 'string') return null;
  const normalized = handle.trim().toLowerCase();
  return PUBLIC_PARTICIPANT_HANDLE_PATTERN.test(normalized) ? publicStarHandle(normalized) : null;
}

/** Only allow image URLs that are safe to hand to a browser image element. */
export function sanitizePublicImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim().slice(0, 2048);
  if (!candidate || candidate.startsWith('//')) return null;
  if (candidate.startsWith('/')) return candidate;

  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
