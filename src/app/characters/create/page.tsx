'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
  Zap,
  Coins,
  Flame,
  Brain,
  Code2,
  Bot,
  Heart,
  Layers,
  Wand2,
  Cpu,
} from 'lucide-react';
import { CustomPersona } from '@/components/chat/PersonaContracts';
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

export default function CreateCharacterPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

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

  const handleHandleChange = (val: string) => {
    let clean = val.replace(/[^a-zA-Z0-9_@]/g, '').toLowerCase();
    if (!clean.startsWith('@')) clean = `@${clean}`;
    setHandle(clean);
  };

  const handleCreate = async () => {
    if (!name.trim() || !greetingMessage.trim() || !systemPrompt.trim()) return;

    setIsSubmitting(true);
    const personaId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const rawClean = handle.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 32);
    const cleanHandle = `@${rawClean || name.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32) || 'companion'}`;

    const newPersona: CustomPersona = {
      id: personaId,
      userId: user?.id,
      name: name.trim().slice(0, 64),
      japaneseName: japaneseName.trim() ? japaneseName.trim().slice(0, 32) : undefined,
      nickname: name.trim().slice(0, 64),
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
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save companion');
      }
    } catch {}

    setIsSubmitting(false);
    // Redirect directly into active chat session with the created persona!
    router.push(`/?persona=${encodeURIComponent(personaId)}`);
  };

  const SelectedIcon = ICON_OPTIONS.find((i) => i.id === avatarIcon)?.icon || Sparkles;

  return (
    <div className="min-h-screen bg-[#07090e] text-white font-sans selection:bg-pink-500 selection:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#07090e]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/characters"
            className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Character Hub</span>
          </Link>
          <div>
            <h1 className="text-sm sm:text-base font-black text-white">Create AI Companion</h1>
            <p className="text-[10px] text-zinc-400 font-mono">
              Step {step} of 4 — {step === 1 ? 'Identity & Archetype' : step === 2 ? 'Visual Aesthetic' : step === 3 ? 'Greeting & Dialogue' : 'System Directives'}
            </p>
          </div>
        </div>

        {/* Wizard Step Pills */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-6 bg-gradient-to-r from-pink-500 to-purple-500'
                  : s < step
                  ? 'w-2 bg-pink-500/50'
                  : 'w-2 bg-white/10'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left / Center Form Wizard (7 cols) */}
          <div className="lg:col-span-7 bg-[#0c101c] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* STEP 1: IDENTITY & ARCHETYPE */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-400" />
                  <span>Character Identity & Archetype</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-200">Character Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Asuka, Kage, Hikari"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (handle === '@') {
                          setHandle(`@${e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')}`);
                        }
                      }}
                      className="w-full p-3 rounded-2xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-200">Japanese Kanji (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 飛鳥, 影, 光"
                      value={japaneseName}
                      onChange={(e) => setJapaneseName(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-200">Handle (@) *</label>
                    <input
                      type="text"
                      placeholder="@asuka"
                      value={handle}
                      onChange={(e) => handleHandleChange(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-black/40 border border-white/10 text-xs sm:text-sm text-pink-400 font-mono font-bold focus:outline-none focus:border-pink-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-200">Anime Archetype</label>
                    <select
                      value={animeArchetype}
                      onChange={(e) => setAnimeArchetype(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-black/60 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500/50"
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
                  <label className="text-xs font-bold text-zinc-200">Tagline *</label>
                  <input
                    type="text"
                    placeholder="Punchy one-line description of your character's personality & specialty..."
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: VISUAL AESTHETIC */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  <span>Visual Aesthetic & Theme</span>
                </h2>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-200">Avatar Gradient Preset</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {GRADIENT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAvatarGradient(preset.gradient)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                          avatarGradient === preset.gradient
                            ? 'border-pink-500 bg-pink-500/10 shadow-lg'
                            : 'border-white/10 bg-black/30 hover:border-white/20'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-lg bg-gradient-to-tr ${preset.gradient} shrink-0`} />
                        <span className="text-[11px] font-bold text-zinc-200 truncate">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-200">Avatar Emblem Icon</label>
                  <div className="grid grid-cols-4 gap-2">
                    {ICON_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = avatarIcon === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setAvatarIcon(opt.id)}
                          className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-pink-500 bg-pink-500/20 text-pink-300'
                              : 'border-white/10 bg-black/30 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-[10px] font-mono">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200">Profile Badge Title</label>
                  <input
                    type="text"
                    placeholder="e.g. SOTA AGENT, TSUNTARO, VOID MASTER"
                    value={avatarBadge}
                    onChange={(e) => setAvatarBadge(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50 uppercase font-mono"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: GREETING & STARTERS */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-cyan-400" />
                  <span>Opening Greeting & Dialogue Starters</span>
                </h2>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200">Opening Greeting Message *</label>
                  <textarea
                    rows={4}
                    placeholder='*Crosses arms and scoffs.* "Took you long enough! What do you need me to code?"'
                    value={greetingMessage}
                    onChange={(e) => setGreetingMessage(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50 font-sans resize-none"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-zinc-200">Conversation Starters (Chips)</label>
                  {starters.map((starter, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                      <input
                        type="text"
                        placeholder="Starter title (e.g. Code Review)"
                        value={starter.title}
                        onChange={(e) => {
                          const copy = [...starters];
                          copy[idx].title = e.target.value;
                          setStarters(copy);
                        }}
                        className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50 font-semibold"
                      />
                      <input
                        type="text"
                        placeholder="Full user prompt sent to character"
                        value={starter.prompt}
                        onChange={(e) => {
                          const copy = [...starters];
                          copy[idx].prompt = e.target.value;
                          setStarters(copy);
                        }}
                        className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-pink-500/50 font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: SYSTEM DIRECTIVES */}
            {step === 4 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-indigo-400" />
                  <span>System Prompt & Base Model</span>
                </h2>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200">Base Inference Model</label>
                  <select
                    value={baseModelId}
                    onChange={(e) => setBaseModelId(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-black/60 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500/50 font-mono"
                  >
                    <option value="gpt-5.6-sol">GPT-5.6 Sol (Flagship SOTA)</option>
                    <option value="gpt-5.6-terra">GPT-5.6 Terra (Low-Latency Code)</option>
                    <option value="openai-codex-v3">OpenAI Codex V3 (Full-Stack Agent)</option>
                    <option value="deepseek-r1-distill">DeepSeek R1 Distill (CoT Reasoning)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200">System Directives *</label>
                  <textarea
                    rows={6}
                    placeholder="You are an anime AI companion and expert software architect. Maintain your anime persona mannerisms (*actions*) while generating bug-free, clean code."
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50 font-mono leading-relaxed resize-none"
                  />
                </div>
              </div>
            )}

            {/* Form Wizard Navigation Buttons */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((step - 1) as any)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep((step + 1) as any)}
                  disabled={step === 1 && !name.trim()}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isSubmitting || !name.trim() || !greetingMessage.trim() || !systemPrompt.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 disabled:opacity-40 text-white text-xs font-black shadow-xl shadow-purple-500/30 transition-all cursor-pointer hover:scale-105"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Creating...' : 'Launch Companion'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Live Interactive Preview Card (5 cols) */}
          <div className="lg:col-span-5 space-y-4 sticky top-24">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Live Companion Card Preview</span>
            </div>

            <div className="rounded-3xl bg-[#0c101c] border border-pink-500/30 p-6 shadow-2xl space-y-5">
              {/* Header Preview */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${avatarGradient} flex items-center justify-center text-white shadow-xl shadow-pink-500/20 shrink-0`}
                  >
                    <SelectedIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-black text-white">{name || 'Character Name'}</h3>
                      {japaneseName && (
                        <span className="text-xs text-zinc-400 font-mono">({japaneseName})</span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-pink-400 font-bold">{handle || '@handle'}</p>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-pink-500/20 border border-pink-500/30 text-pink-300">
                  {avatarBadge || animeArchetype}
                </span>
              </div>

              {/* Tagline Preview */}
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {tagline || 'Punchy one-line description of your character personality & specialty...'}
              </p>

              {/* Greeting Bubble Preview */}
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-pink-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Opening Greeting</span>
                </span>
                <p className="text-xs text-zinc-300 italic font-sans leading-relaxed">
                  {greetingMessage}
                </p>
              </div>

              {/* Starters Chips Preview */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-zinc-500">Quick Starters:</span>
                <div className="flex flex-wrap gap-1.5">
                  {starters
                    .filter((s) => s.title.trim())
                    .map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] text-zinc-300 font-sans"
                      >
                        {s.title}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
