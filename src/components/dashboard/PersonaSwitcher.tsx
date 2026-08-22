'use client';

import React from 'react';
import { usePersona, PERSONA_CONFIGS, UserPersona } from '@/contexts/PersonaContext';
import { Smile, Terminal, Bot } from 'lucide-react';

export function PersonaSwitcher() {
  const { persona, setPersona, details } = usePersona();
  const Icon = details.icon;

  const personasList: UserPersona[] = ['creator', 'developer', 'agent_builder'];

  const cyclePersona = () => {
    const currentIndex = personasList.indexOf(persona);
    const nextPersona = personasList[(currentIndex + 1) % personasList.length];
    setPersona(nextPersona);
  };

  return (
    <button
      onClick={cyclePersona}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${details.bgColor} ${details.borderColor} ${details.color} hover:brightness-125 shadow-sm active:scale-95`}
      title={`Current: ${details.title}. Click to switch workflow mode.`}
      aria-label="Toggle user experience mode"
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="font-mono font-bold tracking-tight">{details.shortLabel}</span>
    </button>
  );
}
