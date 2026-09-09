'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, WifiOff, X } from 'lucide-react';

export interface RecoverySummary { pending: number; active: number; needsAttention: number; paused: boolean; }
export function RecoveryNotice({ offline, reconnected, needsRefresh, summary, onReload }: {
  offline: boolean; reconnected: boolean; needsRefresh: boolean; summary: RecoverySummary; onReload: () => void;
}) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const attention = summary.needsAttention > 0 || (summary.paused && summary.pending > 0);
  const state = needsRefresh ? 'refresh' : offline ? 'offline' : attention ? 'attention'
    : summary.pending > 0 ? summary.active > 0 ? 'sending' : 'waiting' : reconnected ? 'connected' : null;
  const noticeKey = [state, summary.pending, summary.needsAttention].join(':');
  if (!state || dismissed === noticeKey) return null;
  const title = { refresh: 'A page update is available', offline: 'You’re offline', attention: 'Saved actions need attention',
    sending: 'Sending saved actions', waiting: 'Saved actions are waiting', connected: 'Connection restored' }[state];
  const description = { refresh: 'Reload this page when you’re ready. Check any unsaved changes first.',
    offline: 'Some features are unavailable until your connection returns.',
    attention: 'Automatic recovery is paused for some actions. Check the affected page before submitting again.',
    sending: 'Your saved actions are being sent. This does not yet confirm they are complete.',
    waiting: 'We’ll try again when it’s safe. You can keep using the app.',
    connected: 'You’re back online. Check your latest changes before continuing.' }[state];
  const Icon = state === 'offline' ? WifiOff : state === 'connected' ? CheckCircle2
    : attention || needsRefresh ? AlertCircle : Clock3;
  return (
    <aside aria-label="Connection and recovery" className="fixed bottom-4 inset-x-4 z-50 mx-auto max-h-[calc(100dvh-2rem)] max-w-sm overflow-y-auto rounded-xl border border-white/15 bg-background p-4 text-foreground">
      <button type="button" aria-label="Dismiss notification" onClick={() => setDismissed(noticeKey)} className="absolute end-1 top-1 flex h-11 w-11 items-center justify-center rounded-md text-foreground/80 hover:bg-white/10 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyber-400">
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
      <div role="status" aria-live="polite" aria-atomic="true" className="flex items-start gap-3">
        <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 pe-7">
          <p className="text-sm font-semibold leading-5">{title}</p>
          <p className="mt-1 text-sm leading-5 text-foreground/80">{description}</p>
        </div>
      </div>
      {summary.pending > 0 && (
        <details className="mt-2 text-sm">
          <summary className="min-h-11 cursor-pointer rounded-md py-3 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyber-400">Recovery details</summary>
          <p className="pb-2 leading-5 text-foreground/80">Saved actions: {new Intl.NumberFormat().format(summary.pending)}. Needs attention: {new Intl.NumberFormat().format(summary.needsAttention)}.</p>
          <p className="leading-5 text-foreground/80">Nothing here has been discarded. Return to the page where you made the change to check its result. Don’t submit it again if it already succeeded.</p>
        </details>
      )}
      {needsRefresh && <button type="button" onClick={onReload} className="mt-3 min-h-11 rounded-md bg-cyber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyber-400">Reload page</button>}
    </aside>
  );
}
