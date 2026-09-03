'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/lib/i18n/translations';
import { Globe, Check, Sparkles, ChevronDown } from 'lucide-react';

export interface LanguageBadgeProps {
  placement?: 'top' | 'bottom';
  className?: string;
}

export function LanguageBadge({ placement = 'bottom', className = '' }: LanguageBadgeProps) {
  const { language, details, isAutoDetected, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const langKeys = Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocusedIndex(-1);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setFocusedIndex(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setFocusedIndex(0);
      } else {
        setFocusedIndex((prev) => {
          const next = (prev + 1) % langKeys.length;
          itemRefs.current[next]?.focus();
          return next;
        });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setFocusedIndex(langKeys.length - 1);
      } else {
        setFocusedIndex((prev) => {
          const next = prev <= 0 ? langKeys.length - 1 : prev - 1;
          itemRefs.current[next]?.focus();
          return next;
        });
      }
    }
  };

  const dropdownPositionClass =
    placement === 'top'
      ? 'top-full mt-2 right-0 left-auto'
      : 'bottom-full mb-2 left-0 sm:right-0 sm:left-auto';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/20 text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
        title={t('a11y.auto_detected_lang', 'Auto-detected language')}
        aria-label={`Current language: ${details.nativeName}. ${isAutoDetected ? 'Auto-detected' : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="w-3.5 h-3.5 text-cyan-400" />
        <span className="hidden xs:inline sm:inline">{details.nativeName}</span>
        <span className="xs:hidden sm:hidden uppercase">{language}</span>
        {isAutoDetected && (
          <span className="hidden sm:inline text-[9px] px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold leading-none">
            Auto
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute ${dropdownPositionClass} w-52 rounded-xl border border-white/10 bg-[#090b12] shadow-xl p-1 space-y-0.5 z-50 animate-in fade-in duration-100`}>
          <div className="px-2.5 py-1 text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between border-b border-white/[0.06] mb-0.5">
            <span>{t('a11y.auto_detected_lang', 'Auto-detected language')}</span>
            <Sparkles className="w-3 h-3 text-cyan-400" />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-0.5 py-0.5" role="listbox">
            {langKeys.map((k, idx) => {
              const info = SUPPORTED_LANGUAGES[k];
              const isSelected = language === k;

              return (
                <button
                  key={k}
                  ref={(el) => { itemRefs.current[idx] = el; }}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setLanguage(k);
                    setOpen(false);
                    setFocusedIndex(-1);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 ${
                    isSelected
                      ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                      : 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{info.nativeName}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">({info.name})</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
