'use client';

import { useEffect, useRef, useState } from 'react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import type { DocCode } from '@/lib/docs/content';

export function DocsCopyButton({ text, label = 'Copy', primary = false }: { text: string; label?: string; primary?: boolean }) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <div className="min-w-0">
    <button type="button" className={`rounded-md border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${primary ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30' : 'border-white/15 text-zinc-300 hover:bg-white/5'}`} onClick={async () => {
      clearTimeout(timer.current);
      const success = await safeCopyToClipboard(text);
      setState(success ? 'copied' : 'manual');
      if (success) timer.current = setTimeout(() => setState('idle'), 2000);
    }}><span aria-live="polite">{state === 'copied' ? 'Copied' : label}</span></button>
    {state === 'manual' && <div className="mt-2 space-y-2 text-sm text-zinc-300"><p role="status">Clipboard unavailable. Select and copy the text below.</p><textarea aria-label={`${label} manually`} readOnly value={text} onFocus={event => event.target.select()} className="h-40 w-full rounded border border-white/20 bg-zinc-950 p-3 font-mono text-xs" /></div>}
  </div>;
}

export function DocsCode({ examples }: { examples: DocCode[] }) {
  const [selected, setSelected] = useState(0);
  const active = examples[selected] || examples[0];
  return <div className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-black/20">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
      <div className="flex flex-wrap gap-1" aria-label="Example language">{examples.map((example, index) => examples.length > 1 ? <button type="button" key={example.label} aria-pressed={selected === index} onClick={() => setSelected(index)} className={`rounded px-2 py-1.5 text-xs focus-visible:ring-2 focus-visible:ring-indigo-300 ${selected === index ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'}`}>{example.label}</button> : <span key={example.label} className="text-xs text-zinc-400">{example.label}</span>)}</div>
      <DocsCopyButton key={active.label} text={active.source} label="Copy code" />
    </div>
    <pre tabIndex={0} aria-label={`${active.label} example`} className="overflow-x-auto p-4 text-[13px] leading-6 text-zinc-200 focus-visible:outline-indigo-300"><code>{active.source}</code></pre>
  </div>;
}
