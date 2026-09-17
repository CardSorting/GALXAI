'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Terminal, Lightbulb, Info, AlertTriangle, Code2 } from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import type { DocCode, DocCallout } from '@/lib/docs/content';

export function DocsCopyButton({
  text,
  label = 'Copy',
  primary = false,
  className = '',
}: {
  text: string;
  label?: string;
  primary?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
          primary
            ? 'border border-indigo-400/30 bg-indigo-500/20 text-indigo-200 shadow-sm hover:bg-indigo-500/30'
            : 'border border-white/10 bg-white/[0.04] text-zinc-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
        } ${className}`}
        onClick={async () => {
          clearTimeout(timer.current);
          const success = await safeCopyToClipboard(text);
          setState(success ? 'copied' : 'manual');
          if (success) {
            timer.current = setTimeout(() => setState('idle'), 2200);
          }
        }}
      >
        {state === 'copied' ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            <span className="text-emerald-300 font-medium">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
            <span>{label}</span>
          </>
        )}
      </button>

      {state === 'manual' && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-white/20 bg-zinc-900 p-3 shadow-2xl">
          <p className="text-xs text-zinc-300 mb-1.5">Clipboard direct write restricted. Copy below:</p>
          <textarea
            aria-label={`${label} manually`}
            readOnly
            value={text}
            onFocus={(e) => e.target.select()}
            className="h-28 w-full resize-none rounded border border-white/15 bg-black/80 p-2 font-mono text-[11px] text-zinc-200 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

export function DocsCode({
  examples,
  responseCode,
}: {
  examples: DocCode[];
  responseCode?: DocCode;
}) {
  const [selected, setSelected] = useState(0);
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('request');

  const active = examples[selected] || examples[0];
  const currentCode = activeTab === 'response' && responseCode ? responseCode : active;

  return (
    <div className="group relative my-4 overflow-hidden rounded-xl border border-white/10 bg-[#06070a] shadow-xl shadow-black/40 ring-1 ring-white/5">
      {/* Chrome Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-zinc-900/60 px-3.5 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2">
          {/* Mac window dots */}
          <div className="flex items-center gap-1.5 mr-2 opacity-60">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          {/* Request vs Response Switcher */}
          {responseCode && (
            <div className="flex items-center rounded-lg bg-black/40 p-0.5 ring-1 ring-white/10 mr-2">
              <button
                type="button"
                onClick={() => setActiveTab('request')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeTab === 'request'
                    ? 'bg-indigo-500/20 text-indigo-200 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Request
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('response')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeTab === 'response'
                    ? 'bg-indigo-500/20 text-indigo-200 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Response (JSON)
              </button>
            </div>
          )}

          {/* Language Tabs (only visible when in request tab) */}
          {activeTab === 'request' && examples.length > 1 && (
            <div className="flex flex-wrap items-center gap-1" aria-label="Example language">
              {examples.map((example, index) => (
                <button
                  type="button"
                  key={example.label}
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    selected === index
                      ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/10'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`}
                >
                  {example.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'request' && examples.length === 1 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <Code2 className="h-3.5 w-3.5 text-indigo-400" />
              {active.label}
            </span>
          )}

          {activeTab === 'response' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <Terminal className="h-3.5 w-3.5" />
              HTTP 200 OK • application/json
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <DocsCopyButton key={currentCode.label + currentCode.source} text={currentCode.source} label="Copy snippet" />
        </div>
      </div>

      {/* Code Body */}
      <pre
        tabIndex={0}
        aria-label={`${currentCode.label} snippet`}
        className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-zinc-200 selection:bg-indigo-500/30 selection:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400/50"
      >
        <code>{currentCode.source}</code>
      </pre>
    </div>
  );
}

export function DocsCalloutBox({ callout }: { callout: DocCallout }) {
  const configs = {
    tip: {
      border: 'border-emerald-500/30 bg-emerald-500/[0.05] text-emerald-300',
      icon: <Lightbulb className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />,
      defaultTitle: 'PRO TIP',
    },
    note: {
      border: 'border-cyan-500/30 bg-cyan-500/[0.05] text-cyan-300',
      icon: <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />,
      defaultTitle: 'NOTE',
    },
    important: {
      border: 'border-amber-500/30 bg-amber-500/[0.05] text-amber-300',
      icon: <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />,
      defaultTitle: 'IMPORTANT',
    },
  };

  const config = configs[callout.type] || configs.note;

  return (
    <div className={`my-4 flex items-start gap-3 rounded-xl border p-4 shadow-sm ${config.border}`}>
      {config.icon}
      <div className="min-w-0 text-xs sm:text-sm leading-relaxed text-zinc-300">
        <span className="font-semibold tracking-wide uppercase text-xs mr-2 text-white">
          {callout.title || config.defaultTitle}:
        </span>
        {callout.text}
      </div>
    </div>
  );
}
