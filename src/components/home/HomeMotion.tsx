'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Pause, Play, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useGalaxyInteractions } from './use-galaxy-interactions';
import { useStoryEntrance } from './use-story-entrance';
import styles from './public-home.module.css';

const chapters = [
  { id: 'possibilities', label: 'Possibilities' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'Questions' },
];
const preferenceKey = 'galx-home-motion-paused';

/** The story stays server-rendered; this island only coordinates its motion. */
export function HomeMotion({ hero, children }: { hero: ReactNode; children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState('');
  const enabled = ready && !reduced && !paused;
  const sendStar = useGalaxyInteractions(root, enabled);
  useStoryEntrance(root, enabled);

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(preference.matches);
    sync();
    try { setPaused(sessionStorage.getItem(preferenceKey) === 'true'); } catch { /* Storage is optional. */ }
    setReady(true);
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;
    if (!enabled) html.style.scrollBehavior = 'auto';
    return () => { html.style.scrollBehavior = previous; };
  }, [enabled]);

  useEffect(() => {
    const page = root.current;
    if (!page) return;
    const heroElement = page.querySelector<HTMLElement>('[data-home-hero]');
    const sky = page.querySelector<HTMLElement>('[data-home-sky]');
    const journey = page.querySelector<HTMLElement>('[data-home-journey]');
    const story = page.querySelector<HTMLElement>('[data-home-story]');
    const ending = page.querySelector<HTMLElement>('[data-home-ending]');
    const comet = page.querySelector<HTMLElement>('[data-home-comet]');
    const sections = chapters.map(({ id }) => page.querySelector<HTMLElement>(`#${id}`));
    let frame = 0;

    // Scroll events request a single frame. No perpetual render loop or React scroll state.
    const update = () => {
      frame = 0;
      const heroRect = heroElement?.getBoundingClientRect();
      const journeyRect = journey?.getBoundingClientRect();
      const storyRect = story?.getBoundingClientRect();
      const endingRect = ending?.getBoundingClientRect();
      const positions = sections.map(section => section?.getBoundingClientRect().top ?? Infinity);
      const inView = !!heroRect && heroRect.bottom > 0 && heroRect.top < innerHeight;
      page.dataset.skyActive = String(inView && !document.hidden);
      if (!inView) comet?.getAnimations().forEach(animation => animation.cancel());
      if (sky) {
        sky.style.setProperty('--sky-shift', enabled && inView ? `${Math.min(72, Math.max(0, -(heroRect?.top ?? 0) * 0.12))}px` : '0px');
        sky.style.setProperty('--sky-scale', enabled && inView ? String(1 + Math.min(0.06, Math.max(0, -(heroRect?.top ?? 0) / 12000))) : '1');
      }
      if (journey && journeyRect) journey.style.setProperty('--journey-progress', String(enabled ? Math.min(1, Math.max(0, (innerHeight * 0.7 - journeyRect.top) / journeyRect.height)) : 1));
      if (story && storyRect) story.style.setProperty('--story-progress', String(enabled ? Math.min(1, Math.max(0, (innerHeight * 0.6 - storyRect.top) / storyRect.height)) : 1));
      if (ending && endingRect) ending.style.setProperty('--ending-arrival', String(enabled ? Math.min(1, Math.max(0, (innerHeight - endingRect.top) / (innerHeight * 0.65))) : 1));
      let current = '';
      positions.forEach((top, index) => { if (top <= innerHeight * 0.45) current = chapters[index].id; });
      setActive(previous => previous === current ? previous : current);
    };
    const schedule = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(update); };
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame); frame = 0;
        page.dataset.skyActive = 'false';
      } else schedule();
    };
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    resize?.observe(page);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    document.addEventListener('visibilitychange', visibility);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resize?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [enabled]);

  function toggleMotion() {
    const next = !paused;
    setPaused(next);
    try { sessionStorage.setItem(preferenceKey, String(next)); } catch { /* Keep the in-memory preference. */ }
  }

  const motionLabel = reduced ? 'Motion reduced by your device settings' : paused ? 'Enable page motion' : 'Pause page motion';
  const motionIcon = enabled ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />;

  return <main ref={root} id="homepage-content" tabIndex={-1} className={styles.page} data-motion={enabled ? 'on' : 'off'}>
    {hero}
    <div className={styles.skyControls} role="group" aria-label="Galaxy controls" hidden={!ready}>
      <button type="button" className={styles.starControl} onClick={sendStar} disabled={!enabled} title={!enabled ? 'Motion is off' : undefined} aria-label="Send a shooting star"><Sparkles size={14} aria-hidden="true" />Send a star</button>
      <button type="button" className={styles.motionControl} onClick={toggleMotion} disabled={reduced} aria-label={motionLabel}>
        {motionIcon}{reduced ? 'Reduced motion' : paused ? 'Motion off' : 'Pause motion'}
      </button>
    </div>
    <nav className={styles.chapters} aria-label="On this page">
      <div className={styles.chapterLinks}>{chapters.map(chapter => <a key={chapter.id} href={`#${chapter.id}`} aria-current={active === chapter.id ? 'location' : undefined}>{chapter.label}<span aria-hidden="true" /></a>)}</div>
      <div className={styles.chapterActions}>
        <button type="button" className={styles.motionCompact} onClick={toggleMotion} disabled={reduced || !ready} aria-label={motionLabel} title={motionLabel}>{motionIcon}</button>
        <Link className={styles.chapterStart} href="/sites">Start with Sites <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
    </nav>
    {children}
  </main>;
}
