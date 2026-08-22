'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePersona, PERSONA_CONFIGS, UserPersona } from '@/contexts/PersonaContext';
import {
  Smile,
  Terminal,
  Bot,
  ChevronDown,
  Sparkles,
  Check,
  ArrowRight,
  X,
  Zap
} from 'lucide-react';

export function PersonaSwitcher() {
  const { persona, setPersona, details } = usePersona();
  const [modalOpen, setModalOpen] = useState(false);
  const Icon = details.icon;

  const personasList: UserPersona[] = ['creator', 'developer', 'agent_builder'];

  return (
    <>
      {/* Trigger Button in Header/Nav */}
      <button
        onClick={() => setModalOpen(true)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${details.bgColor} ${details.borderColor} ${details.color} hover:brightness-125 shadow-sm`}
        title="Customize your view (Creator / Developer / Agent mode)"
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline font-sans">{details.shortLabel} View</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {/* Interactive Experience Mode Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl glass-panel rounded-3xl border border-white/15 p-6 sm:p-8 space-y-6 shadow-2xl bg-[#0a0d1a]/95">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Select Your Experience Mode</h3>
                  <p className="text-xs text-zinc-400">Tailors navigation and guides to your workflow</p>
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Persona Cards */}
            <div className="space-y-3">
              {personasList.map((pId) => {
                const conf = PERSONA_CONFIGS[pId];
                const PIcon = conf.icon;
                const isSelected = persona === pId;

                return (
                  <div
                    key={pId}
                    onClick={() => {
                      setPersona(pId);
                      setModalOpen(false);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 group ${
                      isSelected
                        ? `${conf.bgColor} ${conf.borderColor} border-2 shadow-lg`
                        : 'bg-black/40 border-white/10 hover:border-white/25 hover:bg-white/5'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'bg-black/60 text-white' : 'bg-white/5 text-zinc-400 group-hover:text-white'
                      }`}
                    >
                      <PIcon className={`w-5 h-5 ${conf.color}`} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {conf.title}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${conf.bgColor} ${conf.color} border ${conf.borderColor}`}
                          >
                            {conf.badge}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-400 text-black flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed font-sans">{conf.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Recommendation Action */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <div className="text-xs text-zinc-400 font-sans">
                Recommended guide for <span className="text-white font-bold">{details.shortLabel}</span>:
              </div>
              <Link
                href={details.primaryDocLink}
                onClick={() => setModalOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-cyan-200 transition-colors"
              >
                <span>{details.primaryActionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
