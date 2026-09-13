'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, type ComponentProps } from 'react';
import { prefetchOnIntent } from '@/lib/resilience/intent-prefetch';

/** Preserve native links; warm only a destination the visitor dwells on. */
export function IntentLink({ onMouseEnter, onMouseLeave, onFocus, onBlur, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = () => clearTimeout(timer.current);
  const warm = () => {
    cancel();
    if (typeof props.href === 'string') {
      const href = props.href;
      timer.current = setTimeout(() => prefetchOnIntent(router, href), 120);
    }
  };
  useEffect(() => () => clearTimeout(timer.current), [props.href]);
  return <Link {...props} prefetch={false}
    onMouseEnter={event => { onMouseEnter?.(event); if (!event.defaultPrevented) warm(); }}
    onMouseLeave={event => { cancel(); onMouseLeave?.(event); }}
    onFocus={event => { onFocus?.(event); if (!event.defaultPrevented) warm(); }}
    onBlur={event => { cancel(); onBlur?.(event); }} />;
}
