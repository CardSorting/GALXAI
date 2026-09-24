'use client';

import React, { useState, useEffect } from 'react';
import { Check, Plus } from 'lucide-react';
import {
  isStarFollowed,
  toggleFollowStar,
  FOLLOWED_STARS_EVENT,
} from '@/lib/collections/saved-works';

interface FollowStarButtonProps {
  handle: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function FollowStarButton({
  handle,
  className = '',
  size = 'md',
}: FollowStarButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    setIsFollowing(isStarFollowed(handle));

    const handleFollowChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ handle: string; isFollowing: boolean }>;
      if (customEvent.detail && customEvent.detail.handle === handle.toLowerCase()) {
        setIsFollowing(customEvent.detail.isFollowing);
      }
    };

    window.addEventListener(FOLLOWED_STARS_EVENT, handleFollowChange);
    return () => window.removeEventListener(FOLLOWED_STARS_EVENT, handleFollowChange);
  }, [handle]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowFollowing = toggleFollowStar(handle);
    setIsFollowing(nowFollowing);
  };

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={className}
      aria-pressed={isFollowing}
      title={isFollowing ? `Unfollow @${handle}` : `Follow @${handle}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isSmall ? '4px' : '6px',
        cursor: 'pointer',
        transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
        background: isFollowing ? 'rgba(251, 191, 36, 0.15)' : '#f3f4f6',
        color: isFollowing ? '#fbbf24' : '#07080d',
        border: isFollowing ? '1px solid rgba(251, 191, 36, 0.45)' : '1px solid transparent',
        fontWeight: 600,
        fontSize: isSmall ? '12px' : '13px',
        borderRadius: '6px',
        padding: isSmall ? '6px 10px' : '8px 14px',
        whiteSpace: 'nowrap',
      }}
    >
      {isFollowing ? (
        <Check size={isSmall ? 13 : 15} aria-hidden="true" />
      ) : (
        <Plus size={isSmall ? 13 : 15} aria-hidden="true" />
      )}
      <span>{isFollowing ? 'Following' : 'Follow Star'}</span>
    </button>
  );
}

