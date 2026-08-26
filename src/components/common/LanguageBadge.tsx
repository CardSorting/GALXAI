'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/lib/i18n/translations';
import { Globe, Check, Sparkles, ChevronDown } from 'lucide-react';

export function LanguageBadge() {
  const { language, details, isAutoDetected, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const langKeys = Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
        title={t('a11y.auto_detected_lang', 'Auto-detected language')}
        aria-label={`Current language: ${details.nativeName}. ${isAutoDetected ? 'Auto-detected' : ''}`}
        aria-expanded={open}
      >
        <Globe className="w-3.5 h-3.5 text-cyan-400" />
        <span>{details.nativeName}</span>
        {isAutoDetected && (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
            Auto
          </span>
        )}
        <ChevronDown className="w-3 h-3 text-zinc-500" />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 sm:right-0 sm:left-auto w-48 rounded-2xl glass-panel border border-white/15 bg-[#07080d]/95 backdrop-blur-2xl shadow-2xl p-1.5 space-y-0.5 z-50 animate-in fade-in duration-100">
          <div className="px-2.5 py-1.5 text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between border-b border-white/5">
            <span>{t('a11y.auto_detected_lang', 'Auto-detected language')}</span>
            <Sparkles className="w-3 h-3 text-cyan-400" />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5 py-1">
            {langKeys.map((k) => {
              const info = SUPPORTED_LANGUAGES[k];
              const isSelected = language === k;

              return (
                <button
                  key={k}
                  onClick={() => {
                    setLanguage(k);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-zinc-300 hover:text-white hover:bg-white/5'
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
