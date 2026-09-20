'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

type ShareState = 'idle' | 'shared' | 'copied' | 'error';

interface ProfileShareButtonProps {
  path: string;
  title: string;
  description: string;
  className?: string;
}

export function ProfileShareButton({
  path,
  title,
  description,
  className = '',
}: ProfileShareButtonProps) {
  const [state, setState] = useState<ShareState>('idle');
  const [busy, setBusy] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const showTransientState = (nextState: Exclude<ShareState, 'idle'>) => {
    setState(nextState);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setState('idle'), 2400);
  };

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);

    try {
      const shareUrl = new URL(path, window.location.origin).toString();
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title, text: description, url: shareUrl });
          showTransientState('shared');
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
        }
      }

      showTransientState(await safeCopyToClipboard(shareUrl) ? 'copied' : 'error');
    } finally {
      setBusy(false);
    }
  };

  const label = state === 'shared'
    ? 'Shared'
    : state === 'copied'
      ? 'Link copied'
      : state === 'error'
        ? 'Try again'
        : 'Share profile';
  const statusMessage = state === 'shared'
    ? 'Profile shared.'
    : state === 'copied'
      ? 'Profile link copied to your clipboard.'
      : state === 'error'
        ? 'Couldn’t copy the profile link. Try again.'
        : '';

  return (
    <button
      type="button"
      className={className}
      onClick={handleShare}
      disabled={busy}
      aria-label={statusMessage || `Share ${title}`}
      aria-busy={busy}
    >
      {state === 'copied' || state === 'shared' ? <Check size={16} aria-hidden="true" /> : state === 'error' ? <Copy size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
      <span aria-live="polite">{label}</span>
      <span className="sr-only" role="status" aria-live="polite">{statusMessage}</span>
    </button>
  );
}
