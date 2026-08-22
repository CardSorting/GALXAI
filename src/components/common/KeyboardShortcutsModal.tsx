'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Keyboard,
  X,
  Search,
  Share2,
  BookOpen,
  Flame,
  Terminal,
  Wallet,
  Sparkles
} from 'lucide-react';

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let lastKey = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable;

      if (e.key === 'Escape') {
        if (isOpen) setIsOpen(false);
        return;
      }

      if (isInput) return;

      const now = Date.now();

      // '?' key opens shortcuts
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // 's' opens share
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        const event = new CustomEvent('open-share-modal');
        window.dispatchEvent(event);
        return;
      }

      // Sequence navigation: 'g' then 'h', 'm', 'd', 'p', 'b'
      if (e.key === 'g' || e.key === 'G') {
        lastKey = 'g';
        lastKeyTime = now;
        return;
      }

      if (lastKey === 'g' && now - lastKeyTime < 1000) {
        if (e.key === 'h') router.push('/');
        if (e.key === 'm') router.push('/models');
        if (e.key === 'd') router.push('/docs');
        if (e.key === 'p') router.push('/playground');
        if (e.key === 'b') router.push('/billing');
        lastKey = '';
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-shortcuts-modal', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-shortcuts-modal', handleCustomOpen);
    };
  }, [isOpen, router]);

  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Global Actions',
      items: [
        { label: 'Open Command Palette', keys: ['⌘', 'K'] },
        { label: 'Quick Share Modal', keys: ['S'] },
        { label: 'Keyboard Shortcuts Sheet', keys: ['?'] },
        { label: 'Close Active Modal', keys: ['Esc'] },
      ],
    },
    {
      title: 'Quick Navigation (Press G then Key)',
      items: [
        { label: 'Go to Home', keys: ['G', 'H'] },
        { label: 'Go to Models Catalog', keys: ['G', 'M'] },
        { label: 'Go to Documentation', keys: ['G', 'D'] },
        { label: 'Go to Playground', keys: ['G', 'P'] },
        { label: 'Go to Developer Wallet', keys: ['G', 'B'] },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-white/15 p-6 sm:p-8 space-y-6 shadow-2xl bg-[#0a0d1a]/95">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Keyboard Shortcuts</h3>
              <p className="text-xs text-zinc-400">Power-user keybindings for instant navigation</p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="space-y-5">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="space-y-2.5">
              <h4 className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                {group.title}
              </h4>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-200"
                  >
                    <span>{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className="px-2 py-1 rounded-lg bg-black/60 border border-white/15 text-[11px] font-mono font-bold text-cyan-300 min-w-[24px] text-center"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-zinc-500 text-center font-mono pt-2">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-400">?</kbd> anytime to open this sheet
        </div>
      </div>
    </div>
  );
}
