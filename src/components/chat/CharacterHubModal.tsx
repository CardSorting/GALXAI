'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Plus,
  Sparkles,
  ShieldCheck,
  Zap,
  Coins,
  Flame,
  Brain,
  Code2,
  Bot,
  Star,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Heart,
  Crown
} from 'lucide-react';
import { CustomPersona } from './PersonaContracts';

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

interface CharacterHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: CustomPersona[];
  onSelectPersona: (persona: CustomPersona) => void;
  onCreateNew: () => void;
}

export function CharacterHubModal({
  isOpen,
  onClose,
  personas,
  onSelectPersona,
  onCreateNew,
}: CharacterHubModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'trending' | 'security' | 'code' | 'speed' | 'data' | 'visual' | 'custom'>('all');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[88vh] rounded-3xl bg-[#090c14] border border-white/15 shadow-2xl flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d111d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <Sparkles className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Anime Characters & AI Companions
                </h2>
                <span className="text-[10px] font-mono font-bold text-pink-400 bg-pink-500/15 border border-pink-500/30 px-2 py-0.5 rounded-full">
                  Character.AI Flow
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans">
                Chat with specialized anime AI companions powered by frontier GPT-5.6 & Codex models
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => {
                onClose();
                onCreateNew();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-purple-500/20 cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create an AI Companion</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Category Pills */}
        <div className="px-4 sm:px-6 py-3 border-b border-white/10 space-y-3 bg-black/40">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by character name, handle (@aiko, @kage), or anime archetype..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-pink-500/50"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono no-scrollbar">
            {[
              { id: 'all', label: '🌟 All Characters' },
              { id: 'trending', label: '🔥 Trending (>180k)' },
              { id: 'security', label: '🛡️ Tsundere Security (@aiko)' },
              { id: 'code', label: '⚡ Cyber Shinobi (@kage)' },
              { id: 'data', label: '🔮 Frost Oracle (@yuki)' },
              { id: 'speed', label: '🏎️ Thunder Speed (@raiden)' },
              { id: 'visual', label: '🎨 Starlight Idol (@lumina)' },
              { id: 'custom', label: '✨ My Created' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer border ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/50 text-pink-300 font-bold'
                    : 'bg-white/5 border-transparent text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Character Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredPersonas.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Bot className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-400">No characters matching your search</p>
              <button
                onClick={onCreateNew}
                className="px-4 py-2 rounded-xl bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-bold hover:bg-pink-500/30 transition-all cursor-pointer"
              >
                Create an AI Companion
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPersonas.map((persona) => {
                const IconComponent = ICON_MAP[persona.avatarIcon] || Sparkles;

                return (
                  <div
                    key={persona.id}
                    onClick={() => {
                      onSelectPersona(persona);
                      onClose();
                    }}
                    className="p-4 rounded-3xl bg-[#0e121e]/90 hover:bg-[#131828] border border-white/10 hover:border-pink-500/40 transition-all group flex flex-col justify-between gap-4 cursor-pointer shadow-xl hover:shadow-pink-500/10 hover:-translate-y-0.5"
                  >
                    {/* Top Character Header */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Glowing Anime Avatar */}
                          <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-tr ${persona.avatarGradient} flex items-center justify-center text-white shadow-lg shrink-0 group-hover:scale-105 transition-transform`}>
                            <IconComponent className="w-6 h-6" />
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0e121e]" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-black text-sm text-white group-hover:text-pink-300 transition-colors truncate">
                                {persona.name}
                              </h3>
                            </div>
                            <p className="text-[11px] font-mono text-cyan-400 truncate font-semibold">
                              {persona.handle}
                            </p>
                          </div>
                        </div>

                        {/* Archetype Badge */}
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 shrink-0">
                          {persona.avatarBadge || persona.animeArchetype}
                        </span>
                      </div>

                      {/* Tagline */}
                      <p className="text-xs text-zinc-300 font-sans leading-relaxed line-clamp-2">
                        {persona.tagline}
                      </p>

                      {/* In-Character Greeting Snippet */}
                      <div className="p-2.5 rounded-2xl bg-black/50 border border-white/5 text-[11px] text-zinc-400 font-sans italic leading-snug line-clamp-2">
                        {persona.greetingMessage}
                      </div>
                    </div>

                    {/* Footer Stats & Chat Action */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-amber-400 font-bold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{persona.rating.toFixed(1)}</span>
                        </span>
                        <span className="flex items-center gap-1 text-zinc-400">
                          <MessageSquare className="w-3 h-3 text-cyan-400" />
                          <span>{(persona.chatCount / 1000).toFixed(0)}k chats</span>
                        </span>
                      </div>

                      <span className="flex items-center gap-1 text-pink-400 group-hover:translate-x-1 transition-transform font-bold text-xs">
                        <span>Chat</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
