'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Zap,
  Rocket,
  Cpu,
  ArrowRight,
  Flame,
  Key,
  Smile,
  BookOpen
} from 'lucide-react';
import type { ModelSpecItem } from '@/core/contracts/GalxContracts';
import { ShareButton } from '@/components/common/ShareButton';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { TrustSeals } from '@/components/common/TrustSeals';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { ModelCreatorView } from './ModelCreatorView';
import { ModelDeveloperView } from './ModelDeveloperView';
import { ModelArchitectView } from './ModelArchitectView';
import { ModelSandboxSection } from './ModelSandboxSection';
import { ModelFaqSection } from './ModelFaqSection';

interface ModelCardClientProps {
  model: ModelSpecItem;
  siblingModels: ModelSpecItem[];
}

function BaseModelCardClient({ model, siblingModels }: ModelCardClientProps) {
  // Persona switcher: 'creator' (Explain Like I'm New), 'developer' (30s Quickstart), 'architect' (Deep Specs & Benchmarks)
  const [activePersona, setActivePersona] = useState<'creator' | 'developer' | 'architect'>('developer');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isGrok = model.provider === 'xai-grok';
  const isImage = model.category === 'image';

  const triggerCopy = async (text: string, identifier: string) => {
    const success = await safeCopyToClipboard(text);
    if (success) {
      setCopiedKey(identifier);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === identifier ? null : prev));
      }, 2000);
    }
  };

  return (
    <div className="space-y-12">
      {/* ========================================================================= */}
      {/* 1. HERO BANNER: MODEL IDENTITY, WHOLESALE PRICING & CALL-TO-ACTION        */}
      {/* ========================================================================= */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6 relative overflow-hidden border border-white/10 bg-gradient-to-b from-[#0d111c] via-[#080a12] to-[#05060a] shadow-2xl">
        {/* Glow ambient background */}
        <div
          className={`absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[140px] pointer-events-none ${
            isGrok ? 'bg-cyan-500/15' : isImage ? 'bg-purple-500/15' : 'bg-amber-500/15'
          }`}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border shadow-sm ${
                  isGrok
                    ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                    : isImage
                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
              >
                {model.provider === 'openai' ? 'OpenAI Codex Suite' : 'xAI Grok Fleet'}
              </span>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                <Flame className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                <span>-{model.discountPercentage ?? 25}% Wholesale Discount Pass</span>
              </div>

              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-xs font-mono">
                {model.category.toUpperCase()}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              {model.name}
            </h1>

            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-sans">
              {model.description}
            </p>
          </div>

          {/* Pricing Box & Quick CTA */}
          <div className="p-6 rounded-2xl bg-black/60 border border-white/10 space-y-4 font-mono min-w-[280px] shadow-inner lg:text-right">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                Wholesale Input Rate
              </span>
              <div className="flex items-baseline gap-2 lg:justify-end">
                <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                  ${model.inputPricePer1M.toFixed(2)}
                </span>
                <span className="text-xs text-zinc-400">/ 1M tokens</span>
              </div>
              <span className="text-xs text-zinc-400 line-through block">
                ${(model.listPricePer1MInput ?? model.inputPricePer1M).toFixed(2)} / 1M retail list
              </span>
            </div>

            <div className="pt-2 border-t border-white/5">
              <span className="text-[10px] text-cyan-400 font-bold block">
                75% Prompt Caching Pass: ${(model.cachedInputPricePer1M ?? model.inputPricePer1M * 0.25).toFixed(2)} / 1M
              </span>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/keys/new"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 font-mono cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 fill-black" />
                <span>Claim $5 Free API Key</span>
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </Link>

              <ShareButton
                variant="pill"
                label="Share Specs"
                title={`Check out ${model.name} on GALXAI - Save ${model.discountPercentage ?? 25}% wholesale!`}
                description={`Get ${model.name} at $${model.inputPricePer1M}/1M tokens with 75% prompt caching and zero code changes.`}
                className="w-full justify-center bg-white/5 border-white/10"
              />
            </div>
          </div>
        </div>

        {/* Real-time Telemetry strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/5 text-xs font-mono">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-zinc-500 text-[10px] uppercase block">Context Window</span>
            <span className="text-white font-bold text-sm">
              {(model.contextWindowTokens / 1000).toLocaleString()}K tokens
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-zinc-500 text-[10px] uppercase block">Max Output</span>
            <span className="text-white font-bold text-sm">
              {((model.maxOutputTokens ?? 128000) / 1000).toLocaleString()}K tokens
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-zinc-500 text-[10px] uppercase block">Edge Transit TTFT</span>
            <span className="text-cyan-300 font-bold text-sm">&lt; 14ms (300+ PoPs)</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-zinc-500 text-[10px] uppercase block">Data Retention</span>
            <span className="text-emerald-400 font-bold text-sm">0 Days (RAM Transit)</span>
          </div>
        </div>
      </div>


      {/* ========================================================================= */}
      {/* 2. PERSONA-BASED INTERACTIVE WORKSPACE                                    */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        {/* Persona Switcher Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 rounded-2xl bg-black/60 border border-white/10 shadow-lg">
          <span className="text-xs font-mono font-bold text-zinc-400 px-3 uppercase tracking-wider">
            Choose Your View:
          </span>

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <button
              onClick={() => setActivePersona('creator')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                activePersona === 'creator'
                  ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20'
                  : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Plain English (No Jargon)</span>
            </button>

            <button
              onClick={() => setActivePersona('developer')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                activePersona === 'developer'
                  ? 'bg-cyan-400 text-black font-bold shadow-md shadow-cyan-400/20'
                  : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10'
              }`}
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>30-Second Quickstart</span>
            </button>

            <button
              onClick={() => setActivePersona('architect')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                activePersona === 'architect'
                  ? 'bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/20'
                  : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Deep Specs &amp; Benchmarks</span>
            </button>
          </div>
        </div>

        {/* Subview Renders */}
        {activePersona === 'creator' && (
          <ModelCreatorView model={model} triggerCopy={triggerCopy} copiedKey={copiedKey} />
        )}

        {activePersona === 'developer' && (
          <ModelDeveloperView model={model} triggerCopy={triggerCopy} copiedKey={copiedKey} />
        )}

        {activePersona === 'architect' && (
          <ModelArchitectView model={model} />
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. FRICTIONLESS IN-BROWSER INTERACTIVE MODEL SANDBOX                      */}
      {/* ========================================================================= */}
      <ModelSandboxSection model={model} />

      {/* ========================================================================= */}
      {/* 4. SIBLING MODELS & 5. FAQ SECTION                                        */}
      {/* ========================================================================= */}
      <ModelFaqSection model={model} siblingModels={siblingModels} />

      {/* Founding Cohort Rate Lock Ribbon */}
      <RateLockRibbon />

      {/* Consumer Trust Seals */}
      <TrustSeals />
    </div>
  );
}

export const ModelCardClient = withErrorBoundary(BaseModelCardClient, {
  name: 'Model Detail Card Client'
});
