'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ImageIcon, Printer } from 'lucide-react';
import styles from './essay-actions.module.css';

export function EssayActions({ canonicalUrl }: { canonicalUrl: string }) {
  const [state, setState] = useState<'idle' | 'copying' | 'copied' | 'manual'>('idle');
  const generation = useRef(0);
  const inFlight = useRef(false);
  const fallback = useRef<HTMLInputElement>(null);

  useEffect(() => {
    generation.current += 1;
    inFlight.current = false;
    setState('idle');
    return () => { generation.current += 1; };
  }, [canonicalUrl]);

  useEffect(() => {
    if (state === 'manual') fallback.current?.focus();
  }, [state]);

  async function copyLink() {
    if (inFlight.current) return;
    inFlight.current = true;
    const current = generation.current;
    setState('copying');
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      if (current === generation.current) setState('copied');
    } catch {
      if (current === generation.current) setState('manual');
    } finally {
      if (current === generation.current) inFlight.current = false;
    }
  }

  return <div className={styles.tools}>
    <div className={styles.actions} role="group" aria-label="Essay actions">
      <a href="#illustrated-work"><ImageIcon size={16} aria-hidden="true" />View artwork</a>
      <button type="button" onClick={copyLink} disabled={state === 'copying'} aria-busy={state === 'copying'}>
        {state === 'copied' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {state === 'copying' ? 'Copying…' : state === 'copied' ? 'Link copied' : 'Copy link'}
      </button>
      <button type="button" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print</button>
    </div>
    <p role="status" className={styles.status}>{state === 'copied' ? 'Essay link copied.' : state === 'manual' ? 'Copy is unavailable. Select and copy the essay address below.' : ''}</p>
    {state === 'manual' && <label className={styles.fallback}>Essay address
      <input ref={fallback} type="url" value={canonicalUrl} readOnly onFocus={event => event.currentTarget.select()} />
    </label>}
  </div>;
}
