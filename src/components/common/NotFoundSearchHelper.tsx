'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, Sparkles } from 'lucide-react';
import { BroccoliOmniSearch, OmniSearchItem } from '@/lib/resilience/BroccoliOmniSearch';

export function NotFoundSearchHelper() {
  const [query, setQuery] = useState('');
  const results: OmniSearchItem[] = query.trim() ? BroccoliOmniSearch.search(query, 4) : [];

  return (
    <div className="w-full max-w-md mx-auto space-y-3 pt-2">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type what you're looking for (e.g. 'api keys', 'pricing', 'deposit')..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-black/60 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-sans"
        />
      </div>

      {results.length > 0 && (
        <div className="p-2 rounded-2xl bg-black/80 border border-cyan-500/30 text-left space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 text-[10px] font-mono text-cyan-400 flex items-center gap-1 font-bold">
            <Sparkles className="w-3 h-3" />
            <span>INSTANT SMART MATCHES</span>
          </div>
          {results.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-white/10 text-xs text-zinc-200 hover:text-white transition-all group"
            >
              <div className="space-y-0.5 min-w-0 pr-2">
                <div className="font-semibold truncate text-white">{item.title}</div>
                <div className="text-[10px] text-zinc-400 truncate">{item.description}</div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
