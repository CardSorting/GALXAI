'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Search,
  Plus,
  ArrowLeft,
  Star,
  MessageSquare,
  Zap,
  Flame,
  Brain,
  Code2,
  Bot,
  ShieldCheck,
  Coins,
  Crown,
  ChevronRight,
  TrendingUp,
  Tag,
} from 'lucide-react';
import { CustomPersona, BUILTIN_ANIME_PERSONAS } from '@/components/chat/PersonaContracts';

const ICON_MAP: Record<string, React.ElementType> = {
  ShieldCheck,
  Zap,
  Coins,
  Flame,
  Brain,
  Sparkles,
  Code2,
  Bot,
};

export default function CharactersPage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<CustomPersona[]>(BUILTIN_ANIME_PERSONAS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'trending' | 'security' | 'code' | 'speed' | 'data' | 'visual' | 'custom'
  >('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/personas')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.personas) && data.personas.length > 0) {
          const mergedMap = new Map<string, CustomPersona>();
          for (const p of BUILTIN_ANIME_PERSONAS) mergedMap.set(p.id, p);
          for (const p of data.personas) mergedMap.set(p.id, p);
          setPersonas(Array.from(mergedMap.values()));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredPersonas = personas.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.animeArchetype.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'trending') return (p.chatCount || 0) > 170000;
    if (selectedCategory === 'security') return p.animeArchetype.toLowerCase().includes('tsundere') || p.handle === '@aiko';
    if (selectedCategory === 'code') return p.animeArchetype.toLowerCase().includes('void') || p.handle === '@zero';
    if (selectedCategory === 'speed') return p.animeArchetype.toLowerCase().includes('speedster') || p.handle === '@raiden';
    if (selectedCategory === 'data') return p.animeArchetype.toLowerCase().includes('frost') || p.handle === '@yuki';
    if (selectedCategory === 'visual') return p.animeArchetype.toLowerCase().includes('idol') || p.handle === '@lumina';
    if (selectedCategory === 'custom') return !p.isBuiltIn;

    return true;
  });

  const categories = [
    { id: 'all', label: 'All Companions', icon: Sparkles },
    { id: 'trending', label: '🔥 Trending', icon: TrendingUp },
    { id: 'security', label: '🛡️ Tsundere Security', icon: ShieldCheck },
    { id: 'code', label: '⚡ Codex Hackers', icon: Code2 },
    { id: 'speed', label: '⚡ Lightning Speed', icon: Flame },
    { id: 'data', label: '❄️ Frost Oracles', icon: Brain },
    { id: 'custom', label: '✨ Community Created', icon: Crown },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-white font-sans selection:bg-pink-500 selection:text-black">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#07090e]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/chat"
            className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Chat</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
              <Sparkles className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight">
                AI Companions & Anime Personas
              </h1>
              <p className="hidden md:block text-[10px] text-zinc-400 font-mono">
                Character.AI Experience • Powered by GPT-5.6 & Codex V3
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/characters/create"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Companion</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Hero Banner */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#170e28] via-[#0d1326] to-[#0a1624] border border-white/15 p-6 sm:p-10 overflow-hidden shadow-2xl">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive Persona Engine</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Chat with specialized anime companions, security chiefs & codex hackers
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
              Every companion possesses distinct personality traits, system directives, voice mannerisms, and specialized expertise on top of GALX Anycast edge routing.
            </p>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="space-y-4">
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by character name, handle (@aiko), or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#0e121e] border border-white/15 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/60 focus:ring-1 focus:ring-pink-500/30 transition-all shadow-inner"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-pink-500 text-black shadow-lg shadow-pink-500/25 scale-105'
                      : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Character Roster Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPersonas.map((persona) => {
            const Icon = ICON_MAP[persona.avatarIcon] || Sparkles;

            return (
              <div
                key={persona.id}
                className="group relative rounded-3xl bg-[#0c101c] hover:bg-[#101626] border border-white/10 hover:border-pink-500/40 p-5 transition-all duration-200 hover:-translate-y-1 shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top Avatar & Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${persona.avatarGradient} flex items-center justify-center text-white shadow-lg shrink-0 group-hover:scale-105 transition-transform`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-white truncate">{persona.name}</h3>
                          {persona.japaneseName && (
                            <span className="text-[10px] text-zinc-500 font-mono font-medium">
                              ({persona.japaneseName})
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-pink-400 font-bold truncate">
                          {persona.handle}
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-zinc-400 shrink-0">
                      {persona.avatarBadge || persona.animeArchetype}
                    </span>
                  </div>

                  {/* Tagline */}
                  <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed font-sans">
                    {persona.tagline}
                  </p>

                  {/* Sample Greeting Snippet */}
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-zinc-400 italic font-sans line-clamp-2">
                    {persona.greetingMessage}
                  </div>
                </div>

                {/* Footer Metrics & Chat Action */}
                <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-cyan-400" />
                      <span>{persona.chatCount ? `${(persona.chatCount / 1000).toFixed(0)}k` : '1.2k'} chats</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>{persona.rating || '4.9'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/chat?persona=${encodeURIComponent(persona.id)}`);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-pink-500 text-white hover:text-black font-bold text-xs transition-all cursor-pointer shadow group-hover:bg-pink-500 group-hover:text-black"
                  >
                    <span>Chat Now</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
