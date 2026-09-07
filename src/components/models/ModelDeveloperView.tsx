'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Code2,
  Boxes,
  Terminal,
  Check,
  Copy,
  Key,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileCode,
  Package,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import type { ModelSpecItem } from '@/core/contracts/GalxContracts';
import { getCodeRecipes } from './model-card-data';

interface ModelDeveloperViewProps {
  model: ModelSpecItem;
  triggerCopy: (text: string, identifier: string) => Promise<void>;
  copiedKey: string | null;
}

type RecipeKey =
  | 'curl'
  | 'python'
  | 'node'
  | 'vercel'
  | 'langchain'
  | 'cursor'
  | 'cli'
  | 'go'
  | 'rust';

const RECIPE_META: Record<
  RecipeKey,
  { label: string; installCmd?: string; lang: string; category: 'sdk' | 'framework' | 'tool' }
> = {
  curl: { label: 'cURL', lang: 'bash', category: 'sdk' },
  python: { label: 'Python', installCmd: 'pip install openai', lang: 'python', category: 'sdk' },
  node: { label: 'TypeScript / Node', installCmd: 'npm install openai', lang: 'typescript', category: 'sdk' },
  vercel: { label: 'Vercel AI SDK', installCmd: 'npm install @ai-sdk/openai ai', lang: 'typescript', category: 'framework' },
  langchain: { label: 'LangChain', installCmd: 'pip install langchain-openai', lang: 'python', category: 'framework' },
  cursor: { label: 'Cursor / Windsurf', lang: 'json', category: 'tool' },
  cli: { label: 'npx CLI', lang: 'bash', category: 'tool' },
  go: { label: 'Go', installCmd: 'go get github.com/sashabaranov/go-openai', lang: 'go', category: 'sdk' },
  rust: { label: 'Rust', installCmd: 'cargo add async-openai tokio futures', lang: 'rust', category: 'sdk' },
};

export function ModelDeveloperView({ model, triggerCopy, copiedKey }: ModelDeveloperViewProps) {
  const [activeRecipe, setActiveRecipe] = useState<RecipeKey>('curl');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showWireResponse, setShowWireResponse] = useState<boolean>(false);

  const effectiveKey = apiKeyInput.trim() || 'galx_live_your_gateway_key';
  const isImage = model.category === 'image';
  const codeRecipes = getCodeRecipes(model, effectiveKey);

  const dropInDiffCode = isImage
    ? `from openai import OpenAI

# GALXAI Universal Gateway (Sub-15ms Anycast)
client = OpenAI(
    base_url="https://galx.ai/v1",  # 👈 ONLY CHANGE
    api_key="${effectiveKey}"
)

response = client.images.generate(
    model="${model.id}",
    prompt="Cyberpunk futuristic architecture, isometric blueprint, 8k",
    size="1024x1024"
)`
    : `from openai import OpenAI

# GALXAI Universal Gateway (Sub-15ms Anycast)
client = OpenAI(
    base_url="https://galx.ai/v1",  # 👈 ONLY CHANGE
    api_key="${effectiveKey}"
)

response = client.chat.completions.create(
    model="${model.id}",
    messages=[{"role": "user", "content": "Hello world"}]
)`;

  const wireResponseJson = isImage
    ? JSON.stringify(
        {
          created: 1725540000,
          data: [
            {
              url: 'https://galx.ai/v1/artifacts/img_sample_9842.png',
              revised_prompt: 'Cyberpunk futuristic architecture, isometric blueprint, 8k',
            },
          ],
        },
        null,
        2
      )
    : JSON.stringify(
        {
          id: 'chatcmpl-galx_live_' + model.id.replace(/[^a-zA-Z0-9]/g, '_') + '_9a2b8',
          object: 'chat.completion',
          created: 1725540000,
          model: model.id,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Execution completed with sub-15ms Anycast edge routing.',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 142,
            completion_tokens: 48,
            total_tokens: 190,
            prompt_tokens_details: {
              cached_tokens: 128,
            },
          },
        },
        null,
        2
      );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. DEVELOPER QUICKSTART (Interactive 3-Card Guided Integration)          */}
      {/* ========================================================================= */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-cyan-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Developer Integration Quickstart
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>OpenAI Wire Compatible (v1 REST)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Base URL & Model ID */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 relative flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-6 h-6 rounded-full bg-cyan-400 text-black text-xs font-mono font-black flex items-center justify-center">
                  1
                </div>
                <span className="text-[10px] font-mono text-cyan-300/80 uppercase">
                  &lt;15ms Anycast
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">Base URL &amp; Model ID</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Point any standard OpenAI SDK or HTTP client to our universal Anycast gateway.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-black/70 border border-white/10 text-xs font-mono">
                <span className="text-cyan-300 truncate">https://galx.ai/v1</span>
                <button
                  type="button"
                  onClick={() => triggerCopy('https://galx.ai/v1', 'step-base-url')}
                  title="Copy Base URL"
                  className="ml-2 p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                >
                  {copiedKey === 'step-base-url' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-black/70 border border-white/10 text-xs font-mono">
                <span className="text-amber-300 truncate">{model.id}</span>
                <button
                  type="button"
                  onClick={() => triggerCopy(model.id, 'step-model-id')}
                  title="Copy Model ID"
                  className="ml-2 p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                >
                  {copiedKey === 'step-model-id' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: API Key & Live Key Injection */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 relative flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-6 h-6 rounded-full bg-amber-400 text-black text-xs font-mono font-black flex items-center justify-center">
                  2
                </div>
                <Link
                  href="/keys/new"
                  className="text-[10px] font-mono text-amber-400 hover:text-amber-300 uppercase flex items-center gap-1 font-bold"
                >
                  <span>New Key ($5)</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <h3 className="text-sm font-bold text-white">Authenticate Requests</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Pass as standard <code className="text-zinc-300 font-mono">Bearer &lt;KEY&gt;</code> token. Paste your key below to live-inject into code recipes.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="relative">
                <input
                  type="text"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste your key to live-inject..."
                  className="w-full px-2.5 py-1.5 rounded-xl bg-black/70 border border-white/15 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400"
                />
                {apiKeyInput && (
                  <button
                    type="button"
                    onClick={() => setApiKeyInput('')}
                    className="absolute right-2 top-2 text-[10px] text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <span className="text-[10px] font-mono text-zinc-500 block">
                {apiKeyInput
                  ? '✓ Key injected into all code blocks below'
                  : 'Using sample key: galx_live_...'}
              </span>
            </div>
          </div>

          {/* Step 3: 1-Line Drop-in Client */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 relative flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-6 h-6 rounded-full bg-emerald-400 text-black text-xs font-mono font-black flex items-center justify-center">
                  3
                </div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase">
                  1 Line Switch
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">1-Line Client Switch</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Override only the <code className="text-emerald-300 font-mono">baseURL</code> parameter in your existing codebase.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <button
                type="button"
                onClick={() => triggerCopy('baseURL="https://galx.ai/v1"', 'step-baseurl-param')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono text-emerald-200 hover:bg-emerald-900/40 transition-colors cursor-pointer text-left"
              >
                <span className="truncate">baseURL=&quot;https://galx.ai/v1&quot;</span>
                {copiedKey === 'step-baseurl-param' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-emerald-300 shrink-0 ml-1" />
                )}
              </button>
              <span className="text-[10px] font-mono text-zinc-500 block">
                Keep 100% of your tool calling and prompts
              </span>
            </div>
          </div>
        </div>

        {/* Shell Quick Export Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-400">
            <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-[11px] text-zinc-300 truncate">
              export OPENAI_BASE_URL=&quot;https://galx.ai/v1&quot; &amp;&amp; export OPENAI_API_KEY=&quot;{effectiveKey}&quot;
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              triggerCopy(
                `export OPENAI_BASE_URL="https://galx.ai/v1"\nexport OPENAI_API_KEY="${effectiveKey}"`,
                'shell-export'
              )
            }
            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 text-xs"
          >
            {copiedKey === 'shell-export' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Shell Export</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. VISUAL DROP-IN CODE DIFF (Zero Refactoring Verification)                */}
      {/* ========================================================================= */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-400" />
              Visual Drop-in Code Diff (1-Line Switch)
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
              <span className="text-[10px] uppercase text-rose-300 font-mono">
                No Cache Optimization
              </span>
            </div>
            <pre className="p-4 text-zinc-300 leading-relaxed overflow-x-auto">
{isImage
  ? `from openai import OpenAI

# Direct retail connection (no edge routing)
client = OpenAI(
    api_key=os.environ["OPENAI_API_KEY"]
)

response = client.images.generate(
    model="dall-e-3",
    prompt="Cyberpunk futuristic architecture...",
    size="1024x1024"
)`
  : `from openai import OpenAI

# Direct retail connection (no cache pass-through)
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
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase text-emerald-400 font-bold">
                  Up to 90% Prompt Cache
                </span>
                <button
                  type="button"
                  onClick={() => triggerCopy(dropInDiffCode, 'diff-galxai-code')}
                  className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 cursor-pointer"
                  title="Copy Drop-in Code"
                >
                  {copiedKey === 'diff-galxai-code' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
            <pre className="p-4 text-zinc-100 leading-relaxed overflow-x-auto selection:bg-white/20 selection:text-white">
{`from openai import OpenAI

# GALXAI Wholesale Gateway (Sub-15ms Anycast)
client = OpenAI(
`}<span className="bg-emerald-500/30 text-emerald-200 px-1 py-0.5 rounded font-bold">{`    base_url="https://galx.ai/v1",  # 👈 ONLY CHANGE`}</span>{`
    api_key="${effectiveKey}"
)

`}{isImage
  ? `response = client.images.generate(
    model="${model.id}",
    prompt="Cyberpunk futuristic architecture...",
    size="1024x1024"
)`
  : `response = client.chat.completions.create(
    model="${model.id}",
    messages=[{"role": "user", "content": "..."}]
)`}
            </pre>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MULTI-FRAMEWORK CODE RECIPES (9 Frameworks, Live Key Injected)         */}
      {/* ========================================================================= */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              Drop-in Code Recipes Across 9 Frameworks
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select your preferred language or client library. Code updates dynamically with your key.
            </p>
          </div>

          {/* Recipe Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-black/50 border border-white/5 text-xs font-semibold">
            {(Object.keys(RECIPE_META) as RecipeKey[]).map((recipeId) => {
              const meta = RECIPE_META[recipeId];
              const isSelected = activeRecipe === recipeId;
              return (
                <button
                  key={recipeId}
                  type="button"
                  onClick={() => setActiveRecipe(recipeId)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-mono ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="relative rounded-2xl bg-black/70 border border-white/10 overflow-hidden font-mono text-xs">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02] gap-2">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-zinc-400">
                {RECIPE_META[activeRecipe].lang.toUpperCase()}
              </span>

              {RECIPE_META[activeRecipe].installCmd && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/60 border border-white/10 text-[10px] text-zinc-300">
                  <Package className="w-3 h-3 text-cyan-400" />
                  <code>{RECIPE_META[activeRecipe].installCmd}</code>
                  <button
                    type="button"
                    onClick={() =>
                      triggerCopy(RECIPE_META[activeRecipe].installCmd!, `install-${activeRecipe}`)
                    }
                    title="Copy Install Command"
                    className="ml-1 p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {copiedKey === `install-${activeRecipe}` ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowWireResponse(!showWireResponse)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer text-[11px]"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{showWireResponse ? 'Hide Wire JSON' : 'Inspect Wire JSON'}</span>
                {showWireResponse ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>

              <button
                type="button"
                onClick={() => triggerCopy(codeRecipes[activeRecipe], `recipe-${activeRecipe}`)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 transition-all cursor-pointer"
              >
                {copiedKey === `recipe-${activeRecipe}` ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedKey === `recipe-${activeRecipe}` ? 'Copied Snippet!' : 'Copy Snippet'}</span>
              </button>
            </div>
          </div>

          <pre className="p-4 text-zinc-100 overflow-x-auto selection:bg-white/20 selection:text-white leading-relaxed">
            <code>{codeRecipes[activeRecipe]}</code>
          </pre>

          {/* Wire Response Inspector Drawer */}
          {showWireResponse && (
            <div className="border-t border-white/10 bg-[#05070e] p-4 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5" />
                  Expected HTTP 200 Wire Response JSON (OpenAI Wire Compatible)
                </span>
                <button
                  type="button"
                  onClick={() => triggerCopy(wireResponseJson, 'wire-response-json')}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer text-[10px]"
                >
                  {copiedKey === 'wire-response-json' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="text-emerald-300/90 overflow-x-auto p-3 rounded-xl bg-black/60 border border-white/5 leading-relaxed text-[11px]">
                <code>{wireResponseJson}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
