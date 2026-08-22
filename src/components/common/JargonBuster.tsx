'use client';

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Sparkles, Zap, ShieldCheck } from 'lucide-react';

export interface JargonTerm {
  title: string;
  shortDesc: string;
  plainEnglishAnalogy: string;
}

export const JARGON_GLOSSARY: Record<string, JargonTerm> = {
  'ttft': {
    title: 'Time To First Token (TTFT)',
    shortDesc: 'The exact delay before the AI starts typing the first word of its response.',
    plainEnglishAnalogy: 'Think of it like how fast a coffee shop barista starts pouring your cup after you finish ordering. GALXAI starts in under 15 milliseconds.'
  },
  'prompt-caching': {
    title: '75% Prompt Prefix Caching',
    shortDesc: 'Reusing memory for repeated text like large PDF documents or instructions.',
    plainEnglishAnalogy: 'Like keeping a textbook bookmark open so you don’t have to re-read chapters 1 to 5 every time you ask a new question. Saves 75% on token costs.'
  },
  'token-bucket': {
    title: 'Continuous Token Bucket Rate Limiting',
    shortDesc: 'Mathematical algorithm that continuously refills your allowed request quota.',
    plainEnglishAnalogy: 'Like a water tank with a steady drip faucet refilling it every millisecond, so you never get sudden lockouts or rate-limit blocks.'
  },
  'zero-retention': {
    title: 'Zero Data Retention & RAM Transit',
    shortDesc: 'Your prompts pass through secure server memory without ever touching a hard drive.',
    plainEnglishAnalogy: 'Like talking through a sealed walkie-talkie where sound waves vanish into the air immediately after playing. 100% private.'
  },
  'aes-256': {
    title: 'AES-256-GCM Authenticated Encryption',
    shortDesc: 'Military-grade cryptographic vaulting protecting your keys with unique tenant keys.',
    plainEnglishAnalogy: 'Like a biometric safe where even if an intruder picked the lock, they’d only find scrambled nonsense without your unique key.'
  },
  'context-window': {
    title: 'Context Window (e.g. 2M Tokens)',
    shortDesc: 'The total amount of text, documents, or code the AI can remember in a single session.',
    plainEnglishAnalogy: 'A 2,000,000 token context window is large enough to read 5 whole novels or an entire software codebase in a single prompt.'
  }
};

interface JargonBusterProps {
  termKey: keyof typeof JARGON_GLOSSARY | string;
  label?: React.ReactNode;
}

export function JargonBuster({ termKey, label }: JargonBusterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const info = JARGON_GLOSSARY[termKey] || {
    title: termKey,
    shortDesc: 'Technical concept explained in plain English.',
    plainEnglishAnalogy: 'Optimized for high performance and reliability.'
  };

  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <span
      ref={containerRef}
      className="relative inline-flex items-center gap-1 cursor-pointer select-none group"
      onClick={() => setIsOpen(!isOpen)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span className="underline decoration-cyan-400/50 decoration-dotted underline-offset-4 hover:decoration-cyan-300 transition-colors">
        {label || info.title}
      </span>
      <HelpCircle className="w-3.5 h-3.5 text-cyan-400 opacity-70 group-hover:opacity-100 transition-opacity" />

      {/* Popover Bubble */}
      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 p-3.5 rounded-2xl glass-panel border border-cyan-500/30 bg-[#07080d]/95 backdrop-blur-xl shadow-2xl z-50 text-left space-y-2 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-1.5 text-cyan-300 font-mono text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{info.title}</span>
          </div>

          <p className="text-xs text-zinc-200 font-sans leading-snug">
            {info.shortDesc}
          </p>

          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-200 leading-tight space-y-1">
            <span className="font-bold block text-[10px] text-cyan-300 uppercase tracking-wide">💡 Plain English Metaphor:</span>
            <span>{info.plainEnglishAnalogy}</span>
          </div>
        </div>
      )}
    </span>
  );
}
