'use client';

import { useEffect, useRef, type RefObject } from 'react';

const arrival = {
  intro: { distance: 18, duration: 720, opacity: .76 },
  step: { distance: 14, duration: 660, opacity: .8 },
  plan: { distance: 18, duration: 760, opacity: .8 },
  question: { distance: 8, duration: 520, opacity: .86 },
  close: { distance: 16, duration: 720, opacity: .8 },
  action: { distance: 10, duration: 560, opacity: .86 },
};

/** Readable by default; arrivals follow reading order and never gate an action. */
export function useStoryEntrance(root: RefObject<HTMLElement | null>, enabled: boolean) {
  const entered = useRef(new WeakSet<Element>());

  useEffect(() => {
    const page = root.current;
    if (!page || !enabled || typeof IntersectionObserver === 'undefined') return;
    const targets = Array.from(page.querySelectorAll<HTMLElement>('[data-home-reveal]'));
    const animations = new Map<Element, Animation>();
    const compact = matchMedia('(max-width: 760px)').matches;

    const settle = (target: Element) => {
      animations.get(target)?.cancel();
      animations.delete(target);
      observer.unobserve(target);
    };
    const settleSection = (section: Element | null) => {
      if (!section) return;
      for (const target of targets) {
        if (!section.contains(target)) continue;
        entered.current.add(target);
        observer.unobserve(target);
        settle(target);
      }
    };
    const anchorSection = (hash: string) => {
      if (!hash || hash === '#') return;
      try { settleSection(document.getElementById(decodeURIComponent(hash.slice(1)))?.closest('section') ?? null); }
      catch { /* A malformed fragment must not interrupt native navigation. */ }
    };

    const observer = new IntersectionObserver(entries => {
      const sequence = new Map<Element, number>();
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        if (!entry.isIntersecting) {
          // Fast scrolling must not leave a late arrival running above the reader.
          if (entry.boundingClientRect.bottom < 84) {
            entered.current.add(target);
            observer.unobserve(target);
            settle(target);
          }
          continue;
        }
        if (entered.current.has(target)) continue;
        entered.current.add(target);
        const section = target.closest('section');
        if (!section || document.hidden || section.contains(document.activeElement) || window.location.hash === `#${section.id}` || typeof target.animate !== 'function') {
          observer.unobserve(target);
          continue;
        }
        const kind = target.dataset.homeReveal as keyof typeof arrival;
        const timing = arrival[kind] ?? arrival.step;
        const position = sequence.get(section) ?? 0;
        sequence.set(section, position + 1);
        const animation = target.animate([
          { opacity: timing.opacity, transform: `translateY(${compact ? timing.distance * .75 : timing.distance}px)` },
          { opacity: 1, transform: 'translateY(0)' },
        ], {
          duration: timing.duration,
          delay: Math.min(position * (compact ? 45 : 65), 160),
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'backwards',
        });
        animations.set(target, animation);
        animation.onfinish = () => { animations.delete(target); observer.unobserve(target); };
      }
    }, { threshold: 0, rootMargin: '0px 0px 48px 0px' });

    // Restored scroll positions and enabling motion must not dim visible content.
    for (const target of targets) {
      if (target.getBoundingClientRect().top < innerHeight) entered.current.add(target);
      if (!entered.current.has(target)) observer.observe(target);
    }
    anchorSection(window.location.hash);
    const onHash = () => anchorSection(window.location.hash);
    const onInteraction = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      settleSection(event.target.closest('section'));
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (link?.origin === location.origin && link.pathname === location.pathname) anchorSection(link.hash);
    };
    const onVisibility = () => {
      if (document.hidden) for (const target of animations.keys()) settle(target);
    };
    page.addEventListener('focusin', onInteraction);
    page.addEventListener('pointerdown', onInteraction, { passive: true });
    page.addEventListener('click', onInteraction);
    window.addEventListener('hashchange', onHash);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      for (const target of animations.keys()) settle(target);
      page.removeEventListener('focusin', onInteraction);
      page.removeEventListener('pointerdown', onInteraction);
      page.removeEventListener('click', onInteraction);
      window.removeEventListener('hashchange', onHash);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, root]);
}
