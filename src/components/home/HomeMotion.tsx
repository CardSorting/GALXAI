'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Pause, Play } from 'lucide-react';
import Link from 'next/link';
import { useStoryEntrance } from './use-story-entrance';
import styles from './public-home.module.css';

const chapters = [
  { id: 'stream', label: 'Community Stream' },
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
    const journey = page.querySelector<HTMLElement>('[data-home-journey]');
    const story = page.querySelector<HTMLElement>('[data-home-story]');
    const ending = page.querySelector<HTMLElement>('[data-home-ending]');
    const sections = chapters.map(({ id }) => page.querySelector<HTMLElement>(`#${id}`));
    let frame = 0;

    // Scroll events request a single frame. No perpetual render loop or React scroll state.
    const update = () => {
      frame = 0;
      const journeyRect = journey?.getBoundingClientRect();
      const storyRect = story?.getBoundingClientRect();
      const endingRect = ending?.getBoundingClientRect();
      const positions = sections.map(section => section?.getBoundingClientRect().top ?? Infinity);
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
    <nav className={styles.chapters} aria-label="On this page">
      <div className={styles.chapterLinks}>{chapters.map(chapter => <a key={chapter.id} href={`#${chapter.id}`} aria-current={active === chapter.id ? 'location' : undefined}>{chapter.label}<span aria-hidden="true" /></a>)}</div>
      <div className={styles.chapterActions}>
        <button type="button" className={styles.motionCompact} onClick={toggleMotion} disabled={reduced || !ready} aria-label={motionLabel} title={motionLabel}>{motionIcon}</button>
        <Link className={styles.chapterStart} href="/images/create">Private creation <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
    </nav>
    {children}
  </main>;
}
