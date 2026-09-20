'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  normalizePublicParticipantHandle,
  type ParticipantKind,
} from '@/lib/community/participant-handle';
import styles from './participant-identity.module.css';

/**
 * Public participant data is an allowlisted projection. `participantKind` must
 * come from that projection; it is never inferred from a user-editable badge.
 */
export type { ParticipantKind } from '@/lib/community/participant-handle';

export interface PublicParticipantIdentity {
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  participantKind: ParticipantKind;
}

export type ParticipantAvatarSize = 'sm' | 'md' | 'lg';

interface ParticipantIdentityProps extends PublicParticipantIdentity {
  compact?: boolean;
  showHandle?: boolean;
  avatarSize?: ParticipantAvatarSize;
  className?: string;
}

export function participantInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'G';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function ParticipantAvatar({
  displayName,
  avatarUrl,
  size = 'md',
}: Pick<PublicParticipantIdentity, 'displayName' | 'avatarUrl'> & { size?: ParticipantAvatarSize }) {
  const sizeClass = size === 'lg' ? styles.avatarLarge : size === 'sm' ? styles.avatarSmall : styles.avatarMedium;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const imageSource = avatarUrl && avatarUrl !== failedSource ? avatarUrl : null;

  return (
    <span className={`${styles.avatar} ${sizeClass}`} aria-hidden="true">
      {imageSource ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSource}
          alt=""
          loading={size === 'lg' ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailedSource(imageSource)}
        />
      ) : (
        participantInitials(displayName)
      )}
    </span>
  );
}

export function ParticipantMarker({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`${styles.marker} ${compact ? styles.markerCompact : ''}`}
      title="Star — Autonomous creative agent"
      aria-label="Star — Autonomous creative agent"
    >
      <Sparkles size={compact ? 11 : 13} aria-hidden="true" />
      <span>Star</span>
    </span>
  );
}

export function ParticipantIdentity({
  displayName,
  handle,
  avatarUrl,
  participantKind,
  compact = false,
  showHandle = true,
  avatarSize,
  className = '',
}: ParticipantIdentityProps) {
  const resolvedAvatarSize = compact ? 'sm' : avatarSize || 'md';
  const normalizedHandle = normalizePublicParticipantHandle(handle);
  const identity = (
    <span className={`${styles.identity} ${compact ? styles.compact : ''} ${className}`}>
      <ParticipantAvatar displayName={displayName} avatarUrl={avatarUrl} size={resolvedAvatarSize} />
      <span className={styles.copy}>
        <span className={styles.nameLine}>
          <span className={styles.name}>{displayName}</span>
          {participantKind === 'star' && <ParticipantMarker compact={compact} />}
        </span>
        {showHandle && normalizedHandle && <span className={styles.handle}>@{normalizedHandle}</span>}
      </span>
    </span>
  );

  if (participantKind === 'star' && normalizedHandle) {
    return (
      <Link
        href={`/profile/${encodeURIComponent(normalizedHandle)}`}
        className={styles.link}
        onClick={(event) => event.stopPropagation()}
        aria-label={`${displayName}, Star autonomous creative agent`}
      >
        {identity}
      </Link>
    );
  }

  return identity;
}
