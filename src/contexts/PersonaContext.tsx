'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Smile, Terminal, Bot } from 'lucide-react';

export type UserPersona = 'creator' | 'developer' | 'agent_builder';

export interface PersonaDetails {
  id: UserPersona;
  title: string;
  shortLabel: string;
  tagline: string;
  description: string;
  badge: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  primaryDocLink: string;
  primaryActionLabel: string;
}

export const PERSONA_CONFIGS: Record<UserPersona, PersonaDetails> = {
  creator: {
    id: 'creator',
    title: 'Creator & Non-Technical',
    shortLabel: 'Creator',
    tagline: 'Zero-Code & Big Savings',
    description: 'Use top models in ChatGPT-style web apps, Cursor, and Make.com workflows with 0 coding and 35% savings.',
    badge: 'Beginner Friendly',
    icon: Smile,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    primaryDocLink: '/docs/simple',
    primaryActionLabel: 'Open Plain English Guide',
  },
  developer: {
    id: 'developer',
    title: 'Developer & Cursor User',
    shortLabel: 'Developer',
    tagline: '1-Line OpenAI Drop-in',
    description: 'Direct OpenAI-compatible API base URL override for Cursor, Windsurf, Python, and Node.js SDKs.',
    badge: 'Cursor / SDKs',
    icon: Terminal,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    primaryDocLink: '/docs/quickstart',
    primaryActionLabel: '30s Quickstart',
  },
  agent_builder: {
    id: 'agent_builder',
    title: 'Agent Architect & Swarms',
    shortLabel: 'Agents',
    tagline: 'High-Concurrency Fleet Routing',
    description: 'Engineered for autonomous agent fleets, 75% prompt caching, vector embeddings, and zero-retention RAM transit.',
    badge: 'High Concurrency',
    icon: Bot,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
    primaryDocLink: '/docs/agents',
    primaryActionLabel: 'Explore Agent Hub',
  },
};

import { SafeStorage } from '@/lib/resilience/SafeStorage';

interface PersonaContextType {
  persona: UserPersona;
  setPersona: (p: UserPersona) => void;
  details: PersonaDetails;
  isCustomized: boolean;
}

const PersonaContext = createContext<PersonaContextType | undefined>(undefined);

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const [persona, setPersonaState] = useState<UserPersona>('creator');
  const [isCustomized, setIsCustomized] = useState(false);

  useEffect(() => {
    try {
      const saved = SafeStorage.getItem('galx_user_persona') as UserPersona;
      if (saved && PERSONA_CONFIGS[saved]) {
        setPersonaState(saved);
        setIsCustomized(true);
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  const setPersona = (newPersona: UserPersona) => {
    setPersonaState(newPersona);
    setIsCustomized(true);
    SafeStorage.setItem('galx_user_persona', newPersona);
  };

  return (
    <PersonaContext.Provider
      value={{
        persona,
        setPersona,
        details: PERSONA_CONFIGS[persona],
        isCustomized,
      }}
    >
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error('usePersona must be used within a PersonaProvider');
  }
  return context;
}
