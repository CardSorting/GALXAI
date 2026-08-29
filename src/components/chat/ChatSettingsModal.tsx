'use client';

import React, { useState, useEffect } from 'react';
import { X, Sliders, Sparkles, RotateCcw, Check, Clock, Calendar, Gauge } from 'lucide-react';
import type { SeatTierPublicSummary } from '@/core/subscription/GalxSeatTierEngine';
import { GALX_DEFAULT_SYSTEM_PROMPT } from '@/core/prompt/GalxDefaultSystemPrompt';

export interface ChatSettings {
  temperature: number;
  maxTokens: number;
  reasoningEffort: 'low' | 'medium' | 'high';
  systemPrompt: string;
  customApiKey: string;
  enablePromptCaching: boolean;
  webSearchEnabled: boolean;
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  temperature: 0.7,
  maxTokens: 2048,
  reasoningEffort: 'high',
  systemPrompt: GALX_DEFAULT_SYSTEM_PROMPT,
  customApiKey: '',
  enablePromptCaching: true,
  webSearchEnabled: false,
};

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onSaveSettings: (settings: ChatSettings) => void;
}

export function ChatSettingsModal({ isOpen, onClose, settings, onSaveSettings }: ChatSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<ChatSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [tierData, setTierData] = useState<SeatTierPublicSummary | null>(null);
  const [loadingTier, setLoadingTier] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setLoadingTier(true);
      fetch('/api/chat/tier', { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setTierData(data);
        })
        .catch(() => {})
        .finally(() => setLoadingTier(false));
    }
  }, [isOpen, settings]);

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

  const handleSave = () => {
    onSaveSettings(localSettings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 500);
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_CHAT_SETTINGS);
  };

  const weeklyPercent = tierData?.weeklyWindow?.percentRemaining ?? 100;
  const fiveHourPercent = tierData?.fiveHourWindow?.percentRemaining ?? 100;
  const weeklyMsg = tierData?.weeklyWindow?.refreshMessage || 'You have used some of your weekly limit, it will fully refresh in 3 days.';
  const fiveHourMsg = tierData?.fiveHourWindow?.refreshMessage || 'You have used some of your 5-hour limit, it will fully refresh in 4 hours, 17 minutes.';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#090d16] border border-white/15 rounded-3xl p-6 shadow-2xl shadow-cyan-950/40 text-white font-sans overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Chat & Compute Preferences</h2>
              <p className="text-[11px] text-zinc-400 font-mono">Engine parameters & seat limit metrics</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 relative z-10">
          {/* Dual Rolling Window Seat Limits Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0e1424] via-[#090d16] to-[#120e24] border border-white/10 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-xs tracking-tight">Models Limit Remaining</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
                {tierData?.tierLabel || 'Solo Developer Seat'}
              </span>
            </div>

            {/* Weekly Limit Remaining */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-zinc-200 text-xs font-bold">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Weekly Limit Remaining</span>
                </div>
                <span className="text-xs font-mono font-black text-cyan-300">{weeklyPercent}%</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                {weeklyMsg}
              </p>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mt-1">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-cyan-300 transition-all duration-500"
                  style={{ width: `${weeklyPercent}%` }}
                />
              </div>
            </div>

            {/* Five Hour Limit Remaining */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-zinc-200 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Five Hour Limit Remaining</span>
                </div>
                <span className="text-xs font-mono font-black text-emerald-300">{fiveHourPercent}%</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                {fiveHourMsg}
              </p>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mt-1">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500"
                  style={{ width: `${fiveHourPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-zinc-400 font-mono">
              <span>Concurrency: {tierData?.activeConcurrentStreams ?? 0}/{tierData?.concurrencyLimit ?? 20} Active Streams</span>
              <a href="/billing/seats" className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline">
                Upgrade Seat Plan →
              </a>
            </div>
          </div>

          {/* Model Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-zinc-200">Creativity & Temperature</span>
              <span className="font-mono text-cyan-400">{localSettings.temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={localSettings.temperature}
              onChange={(e) => setLocalSettings({ ...localSettings, temperature: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>0.0 (Deterministic / Code)</span>
              <span>0.7 (Balanced)</span>
              <span>1.5 (Creative)</span>
            </div>
          </div>

          {/* Max Completion Tokens */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-zinc-200">Max Completion Tokens</span>
              <span className="font-mono text-amber-400">{localSettings.maxTokens}</span>
            </div>
            <input
              type="range"
              min="512"
              max="8192"
              step="256"
              value={localSettings.maxTokens}
              onChange={(e) => setLocalSettings({ ...localSettings, maxTokens: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* Reasoning Effort */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-200">
              Reasoning & Deep Thinking Intensity
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setLocalSettings({ ...localSettings, reasoningEffort: level })}
                  className={`py-2 px-3 rounded-xl text-xs font-mono capitalize transition-all border cursor-pointer ${
                    localSettings.reasoningEffort === level
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                      : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {level} {level === 'high' && '🔥'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-4">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{savedSuccess ? 'Saved' : 'Save Preferences'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
