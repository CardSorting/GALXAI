'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  Coins,
  Flame,
  Brain,
  Code2,
  Bot,
  ArrowRight,
  ArrowLeft,
  Check,
  Heart,
  Layers,
  AlertCircle,
  Cpu
} from 'lucide-react';
import { CustomPersona } from './PersonaContracts';
import { useAuth } from '@/contexts/AuthContext';

const GRADIENT_PRESETS = [
  { id: 'rose-amber', name: 'Tsundere Flare', gradient: 'from-rose-500 via-pink-500 to-amber-500' },
  { id: 'cyan-violet', name: 'Cyber Shinobi', gradient: 'from-cyan-500 via-indigo-500 to-violet-600' },
  { id: 'amber-gold', name: 'Kitsune Gold', gradient: 'from-amber-400 via-orange-500 to-yellow-500' },
  { id: 'sky-blue', name: 'Frost Oracle', gradient: 'from-sky-400 via-cyan-500 to-blue-600' },
  { id: 'purple-pink', name: 'Virtual Idol', gradient: 'from-fuchsia-500 via-purple-500 to-pink-500' },
  { id: 'emerald-teal', name: 'Quantum Sage', gradient: 'from-emerald-400 via-teal-500 to-cyan-600' },
];

const ARCHETYPE_SUGGESTIONS = [
  'Tsundere Security Chief',
  'Cyber-Shinobi Architect',
  'Kitsune Token Alchemist',
  'Shonen Thunder Speedster',
  'Kuudere Frost Oracle',
  'Starlight Cyber Idol',
  'Chuunibyou Quantum Void',
  'Mecha Tactical Operator',
  'Yandere Code Guardian',
];

const ICON_OPTIONS = [
  { id: 'Sparkles', icon: Sparkles, label: 'Sparkles' },
  { id: 'ShieldCheck', icon: ShieldCheck, label: 'Shield' },
  { id: 'Zap', icon: Zap, label: 'Lightning' },
  { id: 'Coins', icon: Coins, label: 'Alchemist' },
  { id: 'Flame', icon: Flame, label: 'Speedster' },
  { id: 'Brain', icon: Brain, label: 'Oracle' },
  { id: 'Code2', icon: Code2, label: 'Codex Hacker' },
  { id: 'Bot', icon: Bot, label: 'Autonomous' },
];

interface CharacterCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCharacterCreated: (persona: CustomPersona) => void;
}

export function CharacterCreatorModal({
  isOpen,
  onClose,
  onCharacterCreated,
}: CharacterCreatorModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [japaneseName, setJapaneseName] = useState('');
  const [handle, setHandle] = useState('@');
  const [animeArchetype, setAnimeArchetype] = useState(ARCHETYPE_SUGGESTIONS[0]);
  const [tagline, setTagline] = useState('');
  const [avatarGradient, setAvatarGradient] = useState(GRADIENT_PRESETS[0].gradient);
  const [avatarIcon, setAvatarIcon] = useState('Sparkles');
  const [avatarBadge, setAvatarBadge] = useState('ANIME AGENT');
  const [greetingMessage, setGreetingMessage] = useState(
    '*Glances up with a confident smile.* "State your parameters, creator! What are we building today?"'
  );
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a specialized anime AI companion and high-performance engineer. You speak with distinct anime mannerisms and action text (*actions*) while providing world-class technical code.'
  );
  const [baseModelId, setBaseModelId] = useState('gpt-5.6-sol');
  const [starters, setStarters] = useState([
    { title: 'Refactor Architecture', prompt: 'Help me refactor this route handler!' },
    { title: 'Security Audit', prompt: 'Audit this token auth flow for vulnerabilities.' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cleanHandle = useMemo(() => {
    let clean = handle.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 32);
    if (!clean && name.trim()) {
      clean = name.trim().replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 32);
    }
    return `@${clean || 'companion'}`;
  }, [handle, name]);

  const handleHandleChange = (val: string) => {
    let clean = val.replace(/[^a-zA-Z0-9_@]/g, '').toLowerCase().slice(0, 33);
    if (!clean.startsWith('@')) clean = `@${clean}`;
    setHandle(clean);
  };

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

  const validateStep = (currentStep: number): boolean => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!name.trim()) {
        setErrorMsg('Please provide a character name.');
        return false;
      }
      if (cleanHandle.length < 2) {
        setErrorMsg('Please specify a valid handle (@name).');
        return false;
      }
    } else if (currentStep === 3) {
      if (!greetingMessage.trim()) {
        setErrorMsg('Please enter an in-character opening greeting.');
        return false;
      }
    } else if (currentStep === 4) {
      if (!systemPrompt.trim()) {
        setErrorMsg('System directives and personality cannot be empty.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < 4) setStep((step + 1) as any);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (step > 1) setStep((step - 1) as any);
  };

  const handleFinish = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const personaId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const sanitizedName = name.trim().slice(0, 64);

    const newPersona: CustomPersona = {
      id: personaId,
      userId: user?.id,
      name: sanitizedName,
      japaneseName: japaneseName.trim() ? japaneseName.trim().slice(0, 32) : undefined,
      nickname: sanitizedName,
      handle: cleanHandle,
      animeArchetype,
      tagline: tagline.trim() ? tagline.trim().slice(0, 140) : `${animeArchetype} AI Companion`,
      description: tagline.trim() ? tagline.trim().slice(0, 280) : `${animeArchetype} AI Companion`,
      avatarIcon,
      avatarGradient,
      avatarBadge: avatarBadge.trim() ? avatarBadge.trim().toUpperCase().slice(0, 24) : 'ANIME AGENT',
      greetingMessage: greetingMessage.trim().slice(0, 1000),
      systemPrompt: systemPrompt.trim().slice(0, 4000),
      exampleDialogue: [],
      baseModelId,
      conversationStarters: starters
        .filter((s) => s.title.trim() && s.prompt.trim())
        .map((s) => ({ title: s.title.trim().slice(0, 60), prompt: s.prompt.trim().slice(0, 300) })),
      capabilities: {
        webSearch: true,
        deepReasoning: true,
        codeInterpreter: true,
      },
      isPublic: true,
      isBuiltIn: false,
      chatCount: 1,
      rating: 5.0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (user?.token) {
        requestHeaders['Authorization'] = `Bearer ${user.token}`;
      }

      const res = await fetch('/api/personas', {
        method: 'POST',
        headers: requestHeaders,
        credentials: 'include',
        body: JSON.stringify(newPersona),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save companion profile.');
      }

      setIsSubmitting(false);
      onCharacterCreated(newPersona);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Network error occurred while spawning companion.');
    }
  };

  const SelectedIcon = ICON_OPTIONS.find((i) => i.id === avatarIcon)?.icon || Sparkles;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-[#0a0d17] border border-white/15 shadow-2xl flex flex-col overflow-hidden text-white max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-[#0e1220]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${avatarGradient} flex items-center justify-center text-white shadow-lg`}>
              <SelectedIcon className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Create an AI Companion</h2>
              <p className="text-xs text-zinc-400 font-sans">
                Step {step} of 4 — {step === 1 ? 'Identity & Archetype' : step === 2 ? 'Visual Aesthetic' : step === 3 ? 'In-Character Greeting' : 'System Directives'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Wizard Step Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-sans text-xs">
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-200">Character Name *</label>
                  <input
                    type="text"
                    maxLength={64}
                    placeholder="e.g. Asuka, Kenji, Rei"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (handle === '@' || handle === '') {
                        setHandle(`@${e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')}`);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-200">Japanese Kanji (Optional)</label>
                  <input
                    type="text"
                    maxLength={32}
                    placeholder="e.g. 飛鳥, 賢治, 零"
                    value={japaneseName}
                    onChange={(e) => setJapaneseName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-200">Handle (@) *</label>
                  <input
                    type="text"
                    maxLength={33}
                    placeholder="@asuka"
                    value={handle}
                    onChange={(e) => handleHandleChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-cyan-400 font-mono focus:outline-none focus:border-cyan-500/50 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-200">Anime Archetype</label>
                  <select
                    value={animeArchetype}
                    onChange={(e) => setAnimeArchetype(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-pink-500/50"
                  >
                    {ARCHETYPE_SUGGESTIONS.map((arc) => (
                      <option key={arc} value={arc} className="bg-zinc-900">
                        {arc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-zinc-200">Short Tagline</label>
                <input
                  type="text"
                  maxLength={140}
                  placeholder="One punchy sentence describing your character's personality & specialty..."
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50"
                />
              </div>
            </div>
          )}

          {/* STEP 2: VISUAL AESTHETIC */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="font-bold text-zinc-200">Glowing Gradient Theme</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAvatarGradient(preset.gradient)}
                      className={`p-2.5 rounded-2xl border transition-all text-left flex items-center gap-2 cursor-pointer ${
                        avatarGradient === preset.gradient
                          ? 'border-pink-400 bg-white/10 ring-2 ring-pink-500/30'
                          : 'border-white/10 bg-black/40 hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-xl bg-gradient-to-tr ${preset.gradient} shadow-md shrink-0`} />
                      <span className="text-[11px] font-bold text-white truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-zinc-200">Avatar Icon Symbol</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {ICON_OPTIONS.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAvatarIcon(item.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          avatarIcon === item.id
                            ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
                            : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-zinc-200">Badge Label</label>
                <input
                  type="text"
                  maxLength={24}
                  placeholder="e.g. CYBER GUARDIAN, ARCHITECT, MECHA DEFENDER"
                  value={avatarBadge}
                  onChange={(e) => setAvatarBadge(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono uppercase focus:outline-none focus:border-pink-500/50 text-xs"
                />
              </div>
            </div>
          )}

          {/* STEP 3: IN-CHARACTER GREETING */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-zinc-200">In-Character Opening Greeting *</label>
                  <span className="text-[10px] font-mono text-zinc-500">{greetingMessage.length}/1000</span>
                </div>
                <p className="text-zinc-400 text-[11px]">
                  This is the opening message your anime companion speaks when a user starts a chat! Use <code className="text-pink-400 font-mono">*narrative actions*</code> for physical anime gestures.
                </p>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  placeholder='*Crosses arms and glances over with a smirk.* "Hmph! What brings you to my terminal?"'
                  className="w-full p-3 rounded-2xl bg-black/50 border border-white/10 text-white font-sans focus:outline-none focus:border-pink-500/50 resize-none text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-zinc-200">Conversation Starter Chips</label>
                {starters.map((starter, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      maxLength={60}
                      placeholder="Chip Title (e.g. Audit Route)"
                      value={starter.title}
                      onChange={(e) => {
                        const updated = [...starters];
                        updated[idx].title = e.target.value;
                        setStarters(updated);
                      }}
                      className="p-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
                    />
                    <input
                      type="text"
                      maxLength={300}
                      placeholder="Prompt payload when clicked..."
                      value={starter.prompt}
                      onChange={(e) => {
                        const updated = [...starters];
                        updated[idx].prompt = e.target.value;
                        setStarters(updated);
                      }}
                      className="p-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: SYSTEM DIRECTIVES & BASE MODEL */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-200">Base AI Model</label>
                <select
                  value={baseModelId}
                  onChange={(e) => setBaseModelId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50 text-xs font-mono"
                >
                  <option value="gpt-5.6-sol">⚡ GPT-5.6 Sol (Flagship Code & Architecture)</option>
                  <option value="gpt-5.6-terra">🧠 GPT-5.6 Terra (Deep Multi-Step Logic)</option>
                  <option value="gpt-5.6-luna">🚀 GPT-5.6 Luna (Sub-Second Fast Velocity)</option>
                  <option value="openai-codex-v3">💻 OpenAI Codex V3 (Autonomous Engine)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-zinc-200">System Directives & Personality *</label>
                  <span className="text-[10px] font-mono text-zinc-500">{systemPrompt.length}/4000</span>
                </div>
                <textarea
                  rows={5}
                  maxLength={4000}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Define your character's backstory, technical expertise, speech mannerisms, and rules..."
                  className="w-full p-3 rounded-2xl bg-black/50 border border-white/10 text-white font-mono text-[11px] focus:outline-none focus:border-pink-500/50 resize-none leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 sm:p-6 border-t border-white/10 flex items-center justify-between bg-[#0e1220]">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 cursor-pointer transition-all"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 text-white font-black text-xs shadow-lg shadow-pink-500/25 cursor-pointer transition-all hover:scale-105 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Spawning Companion...' : 'Spawn AI Companion'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
