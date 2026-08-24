'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowRight, Sparkles } from 'lucide-react';
import { BroccoliOmniSearch, OmniSearchItem } from '@/lib/resilience/BroccoliOmniSearch';

export function NotFoundSearchHelper() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const results: OmniSearchItem[] = useMemo(() => (query.trim() ? BroccoliOmniSearch.search(query, 4) : []), [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Predictive prefetch the highlighted search match
  useEffect(() => {
    if (results.length > 0 && results[selectedIndex]) {
      try {
        router.prefetch(results[selectedIndex].href);
        BroccoliOmniSearch.prefetchRoute(results[selectedIndex].href);
      } catch {}
    }
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
        BroccoliOmniSearch.recordVisit(selected.title, selected.href, selected.category);
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
          placeholder="Type what you're looking for (e.g. 'api keys', 'pricing', 'deposit')..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-sans"
          aria-label="404 Smart Search Recovery"
        />
      </div>

      {results.length > 0 && (
        <div className="p-2 rounded-2xl bg-black/80 border border-cyan-500/30 text-left space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 text-[10px] font-mono text-cyan-400 flex items-center justify-between font-bold">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>INSTANT SMART MATCHES</span>
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
                  router.prefetch(item.href);
                  BroccoliOmniSearch.prefetchRoute(item.href);
                }}
                onClick={() => BroccoliOmniSearch.recordVisit(item.title, item.href, item.category)}
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
