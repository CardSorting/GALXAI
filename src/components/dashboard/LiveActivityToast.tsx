'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, Key, ShieldCheck, Flame, X, ArrowUpRight } from 'lucide-react';

interface ActivityEvent {
  id: string;
  location: string;
  action: string;
  model: string;
  savedAmount: string;
  timeAgo: string;
}

const SAMPLE_EVENTS: ActivityEvent[] = [
  {
    id: '1',
    location: 'San Francisco, US',
    action: 'Developer Key Activated',
    model: 'GPT-5.6 Sol',
    savedAmount: '+$380/mo saved',
    timeAgo: 'Just now'
  },
  {
    id: '2',
    location: 'London, UK',
    action: '50% Match Grant Claimed',
    model: 'Grok 4.5',
    savedAmount: '+$500 compute added',
    timeAgo: '2m ago'
  },
  {
    id: '3',
    location: 'Tokyo, JP',
    action: 'Agent Fleet Connected',
    model: 'GPT-5.6 Terra',
    savedAmount: '14.2M tokens routed',
    timeAgo: '4m ago'
  },
  {
    id: '4',
    location: 'Berlin, DE',
    action: 'Cursor IDE Configured',
    model: 'GPT-5.6 Sol',
    savedAmount: '-38% wholesale rate lock',
    timeAgo: '6m ago'
  },
  {
    id: '5',
    location: 'New York, US',
    action: 'Production Backend Deployed',
    model: 'GPT-5.6 Luna',
    savedAmount: '+$1,240/mo saved',
    timeAgo: '8m ago'
  }
];

export function LiveActivityToast() {
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Initial delay before first toast appears
    const initialTimer = setTimeout(() => {
      if (!dismissed) setIsVisible(true);
    }, 2500);

    // Rotate events periodically
    const interval = setInterval(() => {
      if (dismissed) return;
      setIsVisible(false);
      setTimeout(() => {
        setCurrentEventIndex(prev => (prev + 1) % SAMPLE_EVENTS.length);
        setIsVisible(true);
      }, 600);
    }, 7000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [dismissed]);

  if (dismissed) return null;

  const event = SAMPLE_EVENTS[currentEventIndex];

  return (
    <div
      className={`fixed bottom-6 left-6 z-40 max-w-xs sm:max-w-sm transition-all duration-500 pointer-events-auto ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="glass-panel rounded-2xl p-3.5 border border-amber-500/30 bg-[#090c17]/95 backdrop-blur-xl shadow-2xl space-y-1 text-xs font-mono text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[10px] uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Live Mesh Activity</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400 font-normal">{event.timeAgo}</span>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded cursor-pointer"
            aria-label="Dismiss activity notification"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-start justify-between gap-2 pt-0.5">
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-zinc-200">
              {event.action} <span className="text-zinc-500 font-normal">({event.location})</span>
            </div>
            <div className="text-[10px] text-zinc-400">
              Engine: <strong className="text-cyan-300">{event.model}</strong> • <strong className="text-emerald-400">{event.savedAmount}</strong>
            </div>
          </div>

          <Link
            href="/keys/new"
            className="px-2 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-[10px] font-bold flex items-center gap-0.5 shrink-0 transition-colors cursor-pointer border border-amber-500/30"
          >
            <span>Lock In</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
