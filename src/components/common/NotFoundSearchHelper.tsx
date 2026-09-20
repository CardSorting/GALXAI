'use client';
import { BILLING_PATHS } from '@/lib/billing/navigation';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { IntentLink as Link } from './IntentLink';
import { prefetchOnIntent } from '@/lib/resilience/intent-prefetch';
import { Search, ArrowRight, Sparkles } from 'lucide-react';
import { recordRecentVisit } from '@/lib/resilience/recent-navigation';

const publicPages = [
  { id: 'images', title: 'Image Studio', href: '/images', category: 'Product', description: 'Create generative images with floating composer.' },
  { id: 'stream', title: 'Community Stream', href: '/#stream', category: 'Product', description: 'Explore live public masonry stream of community creations.' },
  { id: 'billing', title: 'Account and billing', href: BILLING_PATHS.overview, category: 'Account', description: 'Your credits, plan and payments.' },
];

export function NotFoundSearchHelper() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const results = useMemo(() => query.trim() ? publicPages.filter(item => `${item.title} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase())) : [], [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const item = results[selectedIndex];
    if (!item) return;
    const timer = setTimeout(() => prefetchOnIntent(router, item.href), 120);
    return () => clearTimeout(timer);
  }, [selectedIndex, results, router]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = results[selectedIndex];
      if (selected) {
        recordRecentVisit(selected.title, selected.href, selected.category);
        router.push(selected.href);
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-3 pt-2">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find Images, Sites, or account pages…"
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-sans"
          aria-label="Find a page"
        />
      </div>

      {results.length > 0 && (
        <div className="p-2 rounded-2xl bg-black/80 border border-cyan-500/30 text-left space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 text-[10px] font-mono text-cyan-400 flex items-center justify-between font-bold">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>PAGES</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-normal">Use ↑ ↓ ↵</span>
          </div>
          {results.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <Link
                key={item.id}
                href={item.href}
                onMouseEnter={() => {
                  setSelectedIndex(index);
                }}
                onClick={() => recordRecentVisit(item.title, item.href, item.category)}
                className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all group border ${
                  isSelected
                    ? 'bg-white/15 border-cyan-500/40 text-white shadow-sm'
                    : 'hover:bg-white/10 border-transparent text-zinc-200 hover:text-white'
                }`}
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <div className={`font-semibold truncate ${isSelected ? 'text-cyan-300' : 'text-white'}`}>{item.title}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{item.description}</div>
                </div>
                <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? 'text-cyan-300 translate-x-0.5' : 'text-cyan-400 group-hover:translate-x-0.5'}`} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
