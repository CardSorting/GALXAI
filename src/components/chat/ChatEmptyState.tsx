'use client';

import React from 'react';
import {
  Zap,
  Sparkles,
  ShieldCheck,
  Flame,
  Brain,
  Code2,
  Bot
} from 'lucide-react';
import { CustomPersona } from './PersonaContracts';

const ICON_MAP: Record<string, React.ElementType> = {
  ShieldCheck,
  Zap,
  Flame,
  Brain,
  Sparkles,
  Code2,
  Bot,
};

interface ChatEmptyStateProps {
  activePersona?: CustomPersona | null;
  onSelectPrompt?: (prompt: string, modelId: string) => void;
  onOpenCharacterHub?: () => void;
}

export function ChatEmptyState({
  activePersona,
}: ChatEmptyStateProps) {
  // If Anime Persona is active: render clean in-character welcome hero
  if (activePersona) {
    const PersonaIcon = ICON_MAP[activePersona.avatarIcon] || Sparkles;

    return (
      <div className="max-w-2xl w-full mx-auto px-4 py-12 flex flex-col items-center justify-center text-center space-y-5 animate-in fade-in duration-300 select-none">
        {/* Glowing Anime Character Avatar */}
        <div className="relative group">
          <div className={`absolute -inset-4 bg-gradient-to-r ${activePersona.avatarGradient} rounded-full blur-2xl opacity-60 transition duration-500 animate-pulse`} />
          <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr ${activePersona.avatarGradient} flex items-center justify-center shadow-2xl border border-white/20 text-white`}>
            <PersonaIcon className="w-9 h-9 sm:w-10 sm:h-10" />
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#07090e]" />
          </div>
        </div>

        {/* Character Title & Tagline */}
        <div className="space-y-1.5 max-w-lg">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {activePersona.name}
            </h1>
            <span className="text-xs font-mono font-bold text-pink-400 bg-pink-500/15 border border-pink-500/30 px-2 py-0.5 rounded-full">
              {activePersona.handle}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed">
            {activePersona.tagline}
          </p>
        </div>

        {/* In-Character Opening Greeting Box */}
        <div className="max-w-xl w-full p-4 rounded-2xl bg-[#0c101c]/90 border border-pink-500/30 text-xs sm:text-sm text-zinc-200 font-sans leading-relaxed text-left shadow-xl">
          <div className="text-[10px] font-mono font-bold uppercase text-pink-400 mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Opening Greeting</span>
          </div>
          <p className="italic">{activePersona.greetingMessage}</p>
        </div>
      </div>
    );
  }

  // Default GALX Clean Slate (No sample prompts, no chips)
  return (
    <div className="max-w-2xl w-full mx-auto px-4 py-16 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-300 select-none">
      {/* Zenith Animated Logo */}
      <div className="relative group">
        <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-indigo-500/30 to-purple-500/20 rounded-full blur-2xl opacity-60 transition duration-500 animate-pulse" />
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-indigo-500/20 border border-white/20">
          <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-white fill-white" />
        </div>
      </div>

      {/* Main Headline */}
      <div className="space-y-2 max-w-lg">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          What can <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-300">GALX</span> help you with today?
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed">
          Ask a question, paste code, or type a message below to start.
        </p>
      </div>
    </div>
  );
}
