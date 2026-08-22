'use client';

import React from 'react';
import { usePersona, UserPersona } from '@/contexts/PersonaContext';

export function PersonaSwitcher() {
  const { persona, setPersona, details } = usePersona();

  const personasList: UserPersona[] = ['creator', 'developer', 'agent_builder'];

  const cyclePersona = () => {
    const currentIndex = personasList.indexOf(persona);
    const nextPersona = personasList[(currentIndex + 1) % personasList.length];
    setPersona(nextPersona);
  };

  return (
    <button
      onClick={cyclePersona}
      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
      title={`Mode: ${details.title}. Click to toggle.`}
      aria-label="Toggle user mode"
    >
      <span>{details.shortLabel}</span>
    </button>
  );
}
