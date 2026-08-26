'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Laptop,
  Zap,
  Code2,
  Terminal,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Key,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Layers,
  Bot
} from 'lucide-react';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

interface SetupProfile {
  id: string;
  name: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  language: string;
  steps: [string, string, string];
  snippet: string;
}

const SETUP_PROFILES: SetupProfile[] = [
  {
    id: 'cli',
    name: 'Terminal CLI (Zero Install)',
    badge: 'Node.js 18+',
    icon: Terminal,
    description: 'Instant CLI streaming without installing packages or configuring local environments.',
    language: 'bash',
    steps: [
      'Open any terminal (macOS, Linux, Windows WSL)',
      'Run npx galxai with your prompt or start interactive REPL with npx galxai chat',
      'Optionally export GALX_API_KEY to unlock higher concurrency tiers'
    ],
    snippet: `# 1. Instant 1-off prompt completion in terminal:
npx galxai "Explain continuous token caching in 10 words"

# 2. Or start an interactive chat session:
npx galxai chat --model gpt-5.6-sol`
  },
  {
    id: 'cursor',
    name: 'Cursor & Windsurf IDE',
    badge: '1-Click Override',
    icon: Laptop,
    description: 'Connect Cursor, Windsurf, or Cline with sub-15ms router latency and 75% prompt cache savings.',
    language: 'json',
    steps: [
      'Open Settings → Models → Toggle "Override OpenAI Base URL"',
      'Set Base URL to: https://galx.ai/v1',
      'Paste your GALXAI live access key into the API Key field'
    ],
    snippet: `// Cursor / Windsurf Settings -> Models:
Override Base URL: https://galx.ai/v1
API Key:           galx_live_your_key_here
Models:            gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna`
  },
  {
    id: 'python',
    name: 'Python (openai & LangChain)',
    badge: 'Python 3.10+',
    icon: Code2,
    description: '100% drop-in replacement for OpenAI Python SDK with zero code refactoring.',
    language: 'python',
    steps: [
      'Keep standard pip install openai (no custom dependencies)',
      'Change base_url to "https://galx.ai/v1"',
      'Run inference with automatic 25%–40% wholesale discount'
    ],
    snippet: `from openai import OpenAI

# 1-Line Drop-in: Only point base_url to GALXAI
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_key_here"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Refactor this module with atomic error handling"}],
    stream=True
)

for chunk in response:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)`
  },
  {
    id: 'ts',
    name: 'TypeScript & Vercel AI SDK',
    badge: 'Node / Next.js',
    icon: Sparkles,
    description: 'Native streaming with OpenAI SDK, Vercel AI SDK (@ai-sdk/openai), or @galxai/sdk.',
    language: 'typescript',
    steps: [
      'Initialize OpenAI or @ai-sdk/openai client with baseURL: "https://galx.ai/v1"',
      'Pass process.env.GALX_API_KEY from your .env.local file',
      'Stream text directly to React components with zero rate limit stalls'
    ],
    snippet: `import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

// Point Vercel AI SDK to GALXAI Universal Gateway
const galxai = createOpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: process.env.GALX_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: galxai("gpt-5.6-sol"),
    messages,
  });
  return result.toDataStreamResponse();
}`
  },
  {
    id: 'claude_code',
    name: 'Claude Code CLI',
    badge: 'Anthropic SDK',
    icon: Bot,
    description: 'Route Claude Code agentic loops through GALXAI with wholesale pricing and zero rate limit stalls.',
    language: 'bash',
    steps: [
      'Export ANTHROPIC_BASE_URL="https://galx.ai/v1" in your shell',
      'Export ANTHROPIC_API_KEY="galx_live_your_key_here"',
      'Run claude in any project directory with instant savings'
    ],
    snippet: `# In your shell configuration (~/.zshrc or ~/.bashrc):
export ANTHROPIC_BASE_URL="https://galx.ai/v1"
export ANTHROPIC_API_KEY="galx_live_your_key_here"

# Execute Claude Code directly:
claude "Refactor auth pipeline and write unit tests"`
  },
  {
    id: 'curl',
    name: 'cURL / Direct HTTP',
    badge: 'REST API',
    icon: Terminal,
    description: 'Standard HTTP POST request to /v1/chat/completions with SSE streaming.',
    language: 'bash',
    steps: [
      'Target endpoint: https://galx.ai/v1/chat/completions',
      'Set header: Authorization: Bearer galx_live_your_key',
      'Receive standard OpenAI-compatible SSE JSON chunks'
    ],
    snippet: `curl https://galx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer galx_live_your_key_here" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Explain prompt caching"}],
    "stream": true
  }'`
  }
];

function BaseGuidedSetupWizard() {
  const [activeProfileId, setActiveProfileId] = useState<string>('cli');
  const [copied, setCopied] = useState(false);

  const currentProfile = SETUP_PROFILES.find(p => p.id === activeProfileId) || SETUP_PROFILES[0];

  const handleCopy = async () => {
    const success = await safeCopyToClipboard(currentProfile.snippet);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6 border border-white/10 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>UNIVERSAL 30-SECOND INTEGRATION</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Connect in 30 Seconds with Zero Code Changes
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300">
            Works out-of-the-box with all OpenAI-compatible editors, scripts, and agent frameworks.
          </p>
        </div>

        <Link
          href="/keys/new"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider font-mono shadow-md flex items-center gap-1.5 shrink-0 self-start md:self-auto cursor-pointer"
        >
          <Key className="w-3.5 h-3.5 text-black" />
          <span>Claim Key ($5 Credit)</span>
          <ArrowRight className="w-3.5 h-3.5 text-black" />
        </Link>
      </div>

      {/* Clean Stack Selector Segmented Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono text-xs">
        {SETUP_PROFILES.map((profile) => {
          const isSelected = profile.id === activeProfileId;
          const Icon = profile.icon;

          return (
            <button
              key={profile.id}
              onClick={() => setActiveProfileId(profile.id)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                isSelected
                  ? 'bg-amber-400/15 border-amber-400 text-white shadow-md shadow-amber-500/10 scale-[1.02] ring-1 ring-amber-400/40'
                  : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-amber-400 text-amber-950 font-bold' : 'bg-white/10 text-white/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">{profile.badge}</span>
              </div>
              <div className="font-bold text-xs truncate text-white">{profile.name}</div>
            </button>
          );
        })}
      </div>

      {/* Integration Card: Description, 3 Steps & Syntax Snippet */}
      <div className="p-6 rounded-3xl bg-black/70 border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{currentProfile.name}</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">{currentProfile.description}</p>
          </div>

          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Code Snippet'}</span>
          </button>
        </div>

        {/* 3 Step Visual Sequence */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          {currentProfile.steps.map((step, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 uppercase font-bold">
                  Step {idx + 1}
                </span>
                <span className="text-[10px] text-zinc-500 font-sans">Instant</span>
              </div>
              <p className="text-zinc-300 text-xs font-sans leading-relaxed">{step}</p>
            </div>
          ))}
        </div>

        {/* Formatted Code Box */}
        <div className="relative rounded-2xl bg-black/90 border border-white/10 p-4 font-mono text-xs overflow-x-auto text-zinc-300 leading-relaxed">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3 text-[10px] text-zinc-500 uppercase">
            <span>Language: {currentProfile.language}</span>
            <span className="text-emerald-400 font-bold">● Base URL: https://galx.ai/v1</span>
          </div>
          <pre className="text-amber-200/90 whitespace-pre-wrap">{currentProfile.snippet}</pre>
        </div>
      </div>
    </section>
  );
}

export const GuidedSetupWizard = withErrorBoundary(BaseGuidedSetupWizard, {
  name: 'Guided Setup Wizard'
});
