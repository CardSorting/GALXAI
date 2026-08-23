'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Code2,
  Boxes,
  Terminal,
  Check,
  Copy
} from 'lucide-react';
import type { ModelSpecItem } from '@/core/contracts/GalxContracts';
import { getCodeRecipes } from './model-card-data';

interface ModelDeveloperViewProps {
  model: ModelSpecItem;
  triggerCopy: (text: string, identifier: string) => Promise<void>;
  copiedKey: string | null;
}

export function ModelDeveloperView({ model, triggerCopy, copiedKey }: ModelDeveloperViewProps) {
  const [activeRecipe, setActiveRecipe] = useState<
    'cli' | 'cursor' | 'python' | 'node' | 'curl' | 'vercel' | 'langchain' | 'go' | 'rust'
  >('cli');

  const codeRecipes = getCodeRecipes(model);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 3-Step Guided Onboarding Checklist */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-cyan-500/20">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl sm:text-2xl font-black text-white">
            30-Second Handheld Developer Quickstart
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 relative">
            <div className="w-6 h-6 rounded-full bg-cyan-400 text-black text-xs font-mono font-black flex items-center justify-center">
              1
            </div>
            <h3 className="text-sm font-bold text-white">Universal Base URL &amp; Model ID</h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Point your OpenAI SDK or HTTP client to <code className="text-cyan-300 font-mono">https://galx.ai/v1</code> with model <code className="text-amber-300 font-mono">{model.id}</code>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 relative">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-black text-xs font-mono font-black flex items-center justify-center">
              2
            </div>
            <h3 className="text-sm font-bold text-white">Generate Developer Key</h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Claim a free developer key with $5 in compute credits. Zero credit card required to start testing.
            </p>
            <Link
              href="/keys/new"
              className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-bold font-mono pt-1"
            >
              <span>Claim Key ($5 Credit) →</span>
            </Link>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 relative">
            <div className="w-6 h-6 rounded-full bg-emerald-400 text-black text-xs font-mono font-black flex items-center justify-center">
              3
            </div>
            <h3 className="text-sm font-bold text-white">1-Line Drop-in Client</h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Override the <code className="text-emerald-300 font-mono">base_url</code> parameter. Keep 100% of your existing codebase and libraries.
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Drop-in Migration Diff */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-400" />
              Visual Drop-in Code Diff (1 Line Switch)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Compare standard direct OpenAI initialization against GALXAI Universal Gateway.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 font-mono text-xs">
          {/* Standard OpenAI code */}
          <div className="rounded-2xl bg-rose-950/20 border border-rose-500/20 overflow-hidden">
            <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 font-bold flex items-center justify-between">
              <span>Direct Provider (Standard Retail)</span>
              <span className="text-[10px] uppercase text-rose-400">0% Discount</span>
            </div>
            <pre className="p-4 text-zinc-300 leading-relaxed overflow-x-auto">
{`from openai import OpenAI

# Direct retail connection (0% savings)
client = OpenAI(
    api_key=os.environ["OPENAI_API_KEY"]
)

response = client.chat.completions.create(
    model="${model.upstreamId}",
    messages=[{"role": "user", "content": "..."}]
)`}
            </pre>
          </div>

          {/* GALXAI code */}
          <div className="rounded-2xl bg-emerald-950/20 border border-emerald-500/30 overflow-hidden">
            <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-300 font-bold flex items-center justify-between">
              <span>GALXAI Universal Gateway</span>
              <span className="text-[10px] uppercase text-emerald-400 font-bold">
                -{model.discountPercentage ?? 25}% Wholesale + 75% Cache
              </span>
            </div>
            <pre className="p-4 text-zinc-200 leading-relaxed overflow-x-auto selection:bg-emerald-500 selection:text-black">
{`from openai import OpenAI

# GALXAI Wholesale Gateway (Sub-15ms Anycast)
client = OpenAI(
`}<span className="bg-emerald-500/30 text-emerald-200 px-1 py-0.5 rounded font-bold">{`    base_url="https://galx.ai/v1",  # 👈 ONLY CHANGE`}</span>{`
    api_key="galx_live_your_gateway_key"
)

response = client.chat.completions.create(
    model="${model.id}",
    messages=[{"role": "user", "content": "..."}]
)`}
            </pre>
          </div>
        </div>
      </div>

      {/* Tabbed SDK & Framework Recipes (8 Frameworks) */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              Drop-in Code Recipes Across 8 Frameworks
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select your preferred language or client library to copy pre-formatted code.
            </p>
          </div>

          {/* Recipe Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-black/50 border border-white/5 text-xs font-semibold">
            {(
              [
                { id: 'cli', label: 'npx CLI' },
                { id: 'cursor', label: 'Cursor / IDE' },
                { id: 'python', label: 'Python' },
                { id: 'node', label: 'TypeScript / Node' },
                { id: 'curl', label: 'cURL' },
                { id: 'vercel', label: 'Vercel AI' },
                { id: 'langchain', label: 'LangChain' },
                { id: 'go', label: 'Go' },
                { id: 'rust', label: 'Rust' }
              ] as const
            ).map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => setActiveRecipe(recipe.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-mono ${
                  activeRecipe === recipe.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {recipe.label}
              </button>
            ))}
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="relative rounded-2xl bg-black/70 border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
            <span className="text-[11px] font-mono text-zinc-400">
              {activeRecipe === 'cli' && 'Zero-install terminal execution (Node.js 18+)'}
              {activeRecipe === 'cursor' && 'Cursor / Windsurf Model Base URL override'}
              {activeRecipe === 'python' && 'Python 3.10+ (openai >= 1.0.0)'}
              {activeRecipe === 'node' && 'Node.js / TypeScript (openai)'}
              {activeRecipe === 'curl' && 'bash / terminal HTTP request'}
              {activeRecipe === 'vercel' && 'Next.js App Router (@ai-sdk/openai)'}
              {activeRecipe === 'langchain' && 'Python LangChain (langchain-openai)'}
              {activeRecipe === 'go' && 'Go (github.com/sashabaranov/go-openai)'}
              {activeRecipe === 'rust' && 'Rust (async-openai)'}
            </span>

            <button
              onClick={() => triggerCopy(codeRecipes[activeRecipe], `recipe-${activeRecipe}`)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              {copiedKey === `recipe-${activeRecipe}` ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === `recipe-${activeRecipe}` ? 'Copied Code!' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto selection:bg-cyan-500 selection:text-black">
            <code>{codeRecipes[activeRecipe]}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
