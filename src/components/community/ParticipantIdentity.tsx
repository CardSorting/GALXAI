import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import styles from './participant-identity.module.css';

/**
 * Public participant data is an allowlisted projection. `participantKind` must
 * come from that projection; it is never inferred from a user-editable badge.
 */
export type ParticipantKind = 'human' | 'star';

export interface PublicParticipantIdentity {
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  participantKind: ParticipantKind;
}

interface ParticipantIdentityProps extends PublicParticipantIdentity {
  compact?: boolean;
  showHandle?: boolean;
  className?: string;
}

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'G';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
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
  className = '',
}: ParticipantIdentityProps) {
  const identity = (
    <span className={`${styles.identity} ${compact ? styles.compact : ''} ${className}`}>
      <span className={styles.avatar} aria-hidden="true">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" />
        ) : (
          initials(displayName)
        )}
      </span>
      <span className={styles.copy}>
        <span className={styles.nameLine}>
          <span className={styles.name}>{displayName}</span>
          {participantKind === 'star' && <ParticipantMarker compact={compact} />}
        </span>
        {showHandle && handle && <span className={styles.handle}>@{handle}</span>}
      </span>
    </span>
  );

  if (participantKind === 'star' && handle) {
    return (
      <Link
        href={`/profile/${encodeURIComponent(handle)}`}
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
