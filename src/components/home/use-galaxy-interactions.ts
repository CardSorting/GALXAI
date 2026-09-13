'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';

/** Input-driven decoration: one pointer frame and one replaceable comet at a time. */
export function useGalaxyInteractions(root: RefObject<HTMLElement | null>, enabled: boolean) {
  const comet = useRef<Animation | null>(null);

  useEffect(() => {
    const page = root.current;
    const hero = page?.querySelector<HTMLElement>('[data-home-hero]');
    const sky = page?.querySelector<HTMLElement>('[data-home-parallax]');
    if (!page || !hero || !sky || !enabled) return;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      sky.style.setProperty('--pointer-x', `${x}px`);
      sky.style.setProperty('--pointer-y', `${y}px`);
    };
    const reset = () => {
      cancelAnimationFrame(frame); frame = 0;
      x = 0; y = 0; paint();
    };
    const move = (event: PointerEvent) => {
      if (!finePointer.matches || event.pointerType !== 'mouse' || document.hidden) return;
      const rect = hero.getBoundingClientRect();
      x = Math.max(-12, Math.min(12, ((event.clientX - rect.left) / rect.width - 0.5) * 24));
      y = Math.max(-8, Math.min(8, ((event.clientY - rect.top) / rect.height - 0.5) * 16));
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const suspend = () => {
      if (document.hidden) { reset(); comet.current?.cancel(); }
    };
    hero.addEventListener('pointermove', move, { passive: true });
    hero.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', suspend);
    finePointer.addEventListener('change', reset);
    return () => {
      reset();
      comet.current?.cancel();
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', reset);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', suspend);
      finePointer.removeEventListener('change', reset);
    };
  }, [enabled, root]);

  return useCallback(() => {
    const page = root.current;
    const hero = page?.querySelector<HTMLElement>('[data-home-hero]');
    const star = page?.querySelector<HTMLElement>('[data-home-comet]');
    if (!enabled || document.hidden || !hero || !star || typeof star.animate !== 'function') return;
    comet.current?.cancel();
    const startX = hero.clientWidth * 0.08;
    const endX = hero.clientWidth * 0.92;
    const distanceY = Math.min(240, hero.clientHeight * 0.25);
    const angle = Math.atan2(distanceY, endX - startX) * 180 / Math.PI;
    const position = (progress: number) => `translate3d(${startX + (endX - startX) * progress}px, ${64 + distanceY * progress}px, 0) rotate(${angle}deg)`;
    const animation = star.animate([
      { transform: position(0), opacity: 0 },
      { transform: position(0.12), opacity: 0.85, offset: 0.12 },
      { transform: position(0.75), opacity: 0.75, offset: 0.75 },
      { transform: position(1), opacity: 0 },
    ], { duration: 1100, easing: 'linear' });
    comet.current = animation;
    animation.onfinish = () => { if (comet.current === animation) comet.current = null; };
  }, [enabled, root]);
}
