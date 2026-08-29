'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sliders,
  ArrowLeft,
  Key,
  Shield,
  Sparkles,
  Bot,
  RotateCcw,
  Check,
  Zap,
  Lock,
} from 'lucide-react';
import { ChatSettings, DEFAULT_CHAT_SETTINGS } from '@/components/chat/ChatSettingsModal';

const SETTINGS_STORAGE_KEY = 'galx_chat_settings_v1';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_CHAT_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch {}
  };

  const handleReset = () => {
    setSettings(DEFAULT_CHAT_SETTINGS);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-white font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#07090e]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Chat</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-white">Chat & Model Preferences</h1>
              <p className="text-[10px] text-zinc-400 font-mono">Inference Parameters • System Prompts • API Gateway</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-90 text-black font-black text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{savedSuccess ? 'Saved!' : 'Save Preferences'}</span>
          </button>
        </div>
      </header>

      {/* Main Settings Body */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Sampling Parameters Card */}
        <div className="bg-[#0c101c] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
            <Zap className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white">Model Sampling Parameters</h2>
              <p className="text-xs text-zinc-400">Control creativity, response length, and multi-step reasoning depth</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-zinc-200">Sampling Temperature</span>
                <span className="font-mono text-cyan-400 font-bold">{settings.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={settings.temperature}
                onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>0.0 (Deterministic / Code)</span>
                <span>0.7 (Balanced)</span>
                <span>1.5 (Creative / Roleplay)</span>
              </div>
            </div>

            {/* Max Output Tokens */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-zinc-200">Max Completion Tokens</span>
                <span className="font-mono text-cyan-400 font-bold">{settings.maxTokens}</span>
              </div>
              <input
                type="range"
                min="512"
                max="8192"
                step="256"
                value={settings.maxTokens}
                onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>512 tokens</span>
                <span>4096 tokens</span>
                <span>8192 tokens</span>
              </div>
            </div>

            {/* Reasoning Effort */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-200">Codex Reasoning Effort</span>
              <div className="grid grid-cols-3 gap-3">
                {(['low', 'medium', 'high'] as const).map((effort) => (
                  <button
                    key={effort}
                    type="button"
                    onClick={() => setSettings({ ...settings, reasoningEffort: effort })}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold capitalize transition-all cursor-pointer ${
                      settings.reasoningEffort === effort
                        ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300 shadow-md'
                        : 'border-white/10 bg-black/40 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {effort}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* System Prompt Directives Card */}
        <div className="bg-[#0c101c] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
            <Bot className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-white">Default System Directive</h2>
              <p className="text-xs text-zinc-400">Applied to new general conversations without a specialized anime persona</p>
            </div>
          </div>

          <textarea
            rows={5}
            value={settings.systemPrompt}
            onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
            className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500/50 leading-relaxed resize-none"
          />
        </div>

        {/* Sovereign Seat Tier Governance & Plan Entitlements Card */}
        <div className="bg-gradient-to-br from-[#0c101c] via-[#090d16] to-[#120f24] border border-cyan-500/20 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-cyan-400" />
              <div>
                <h2 className="text-base font-bold text-white">Sovereign Seat Tier Governance</h2>
                <p className="text-xs text-zinc-400">Compute routing, concurrency limits, and model allowances are governed by your team seat license.</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              Zero Key Leakage
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <p className="text-[11px] text-zinc-400 font-mono">Shard Queue Lane</p>
              <p className="text-sm font-bold text-emerald-400">Anycast Fast-Lane</p>
              <p className="text-[10px] text-zinc-500">Sub-15ms TTFB acceleration</p>
            </div>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <p className="text-[11px] text-zinc-400 font-mono">Prompt Cache Pass-Through</p>
              <p className="text-sm font-bold text-cyan-400">75% Continuous Rebate</p>
              <p className="text-[10px] text-zinc-500">Zero duplicate token charges</p>
            </div>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <p className="text-[11px] text-zinc-400 font-mono">Data Privacy Standard</p>
              <p className="text-sm font-bold text-purple-400">Zero Data Retention (ZDR)</p>
              <p className="text-[10px] text-zinc-500">Ephemerally scrubbed in RAM</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-zinc-400 font-sans">
              Need to add team seats, increase monthly spend caps, or unlock dedicated shard hardware?
            </p>
            <a
              href="/billing/seats"
              className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-mono font-bold transition-all cursor-pointer"
            >
              Manage Seat Plan →
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
