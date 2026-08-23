'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Laptop,
  Zap,
  Code2,
  Bot,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Key,
  ShieldCheck,
  CheckCircle2,
  Terminal
} from 'lucide-react';

interface SetupTab {
  id: string;
  name: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  stepTitle: string;
  instructions: string[];
  configSnippet: string;
  copyLabel: string;
}

const SETUP_TABS: SetupTab[] = [
  {
    id: 'sdk',
    name: '@galxai/sdk',
    category: 'Universal SDK',
    icon: Sparkles,
    stepTitle: 'Zero-Hesitation 1-Line Universal TypeScript / Node SDK',
    instructions: [
      'Install npm install @galxai/sdk.',
      'Import run, chat, batch, or galx directly with zero configuration.',
      'Auto-reads GALX_API_KEY from environment with sub-15ms edge streaming.'
    ],
    configSnippet: `import { run, galx, batch } from "@galxai/sdk";

// 1. Ultra-fast 1-liner:
const answer = await run("Explain continuous token caching in 10 words");

// 2. Tagged template literal:
const greeting = await galx\`Hello \${"GALXAI"}, explain zero-hesitation developer ergonomics\`;

// 3. 100x high-throughput batch mapper:
const summaries = await batch(["Article 1", "Article 2"], (doc) => \`Summarize: \${doc}\`);`,
    copyLabel: 'Copy @galxai/sdk Code'
  },
  {
    id: 'cursor',
    name: 'Cursor & Windsurf',
    category: 'AI Code Editors',
    icon: Laptop,
    stepTitle: 'Connect Cursor / Windsurf in 20 Seconds',
    instructions: [
      'Open Cursor Settings → Models → Add Model: gpt-5.6-sol (or grok-4.6).',
      'Enable Override OpenAI Base URL: https://galx.ai/v1',
      'Paste your GALXAI key into the API Key field.'
    ],
    configSnippet: `// Cursor / Windsurf / Cline Settings Override:
Base URL: https://galx.ai/v1
API Key:  galx_live_your_key_here
Models:   gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna, x-ai/grok-4.6`,
    copyLabel: 'Copy Cursor Settings'
  },
  {
    id: 'anthropic',
    name: 'Anthropic / Claude Code',
    category: 'Anthropic SDK',
    icon: Bot,
    stepTitle: 'Drop into Claude Code CLI or @anthropic-ai/sdk',
    instructions: [
      'Set ANTHROPIC_BASE_URL="https://galx.ai".',
      'Set ANTHROPIC_API_KEY="galx_live_...".',
      'Seamlessly supports /v1/messages and prompt caching.'
    ],
    configSnippet: `import Anthropic from "@anthropic-ai/sdk";

// 100% Drop-in: Only point baseURL to GALXAI
const anthropic = new Anthropic({
  baseURL: "https://galx.ai",
  apiKey: process.env.GALX_API_KEY || "galx_live_your_key_here",
});

const message = await anthropic.messages.create({
  model: "gpt-5.6-sol", // or claude-3-7-sonnet alias
  max_tokens: 2048,
  messages: [{ role: "user", content: "Write a high-performance LRU cache in TypeScript." }],
});

console.log(message.content[0].text);`,
    copyLabel: 'Copy Anthropic Code'
  },
  {
    id: 'ollama',
    name: 'Ollama / Local AI',
    category: 'Local Dev & WebUI',
    icon: Terminal,
    stepTitle: 'Point OpenWebUI, Continue.dev, or Ollama CLI to GALXAI',
    instructions: [
      'Export OLLAMA_HOST="https://galx.ai".',
      'Works with native /api/generate, /api/chat, and /api/tags.',
      'Seamless streaming NDJSON responses with 0ms configuration.'
    ],
    configSnippet: `# Point Ollama CLI or OpenWebUI to GALXAI:
export OLLAMA_HOST="https://galx.ai"
export OLLAMA_API_KEY="galx_live_your_key_here"

# Native Ollama API call:
curl https://galx.ai/api/generate \\
  -H "Authorization: Bearer galx_live_your_key_here" \\
  -d '{
    "model": "sol",
    "prompt": "Hello GALXAI from Ollama!",
    "stream": true
  }'`,
    copyLabel: 'Copy Ollama Command'
  },
  {
    id: 'python',
    name: 'Python (openai)',
    category: 'Standard Backend',
    icon: Code2,
    stepTitle: 'Drop into your existing OpenAI Python Code (1 Line Change)',
    instructions: [
      'Keep standard openai>=1.0.0 (no new dependencies).',
      'Set base_url="https://galx.ai/v1" and api_key="galx_live_...".',
      'Run inference with 25%–40% wholesale savings and 75% prompt caching.'
    ],
    configSnippet: `from openai import OpenAI

# 100% Drop-in: Only change base_url
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_key_here"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Explain continuous token caching."}],
    stream=True
)

for chunk in response:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)`,
    copyLabel: 'Copy Python Code'
  },
  {
    id: 'vercel',
    name: 'Vercel AI SDK',
    category: 'Next.js App Router',
    icon: Sparkles,
    stepTitle: 'Stream with @ai-sdk/openai & Vercel AI SDK',
    instructions: [
      'Install npm i ai @ai-sdk/openai.',
      'Initialize createOpenAI with baseURL: "https://galx.ai/v1".',
      'Stream text directly to your frontend React components.'
    ],
    configSnippet: `import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const galxai = createOpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: galxai("gpt-5.6-sol"),
    messages,
  });
  return result.toDataStreamResponse();
}`,
    copyLabel: 'Copy Vercel AI Code'
  },
  {
    id: 'node',
    name: 'TypeScript / Node',
    category: 'Full-Stack Apps',
    icon: Bot,
    stepTitle: 'Drop into your Next.js or Node.js Backend',
    instructions: [
      'Use standard npm i openai package.',
      'Initialize with baseURL: "https://galx.ai/v1".',
      'Completions stream with sub-15ms Anycast routing.'
    ],
    configSnippet: `import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

const stream = await openai.chat.completions.create({
  model: "gpt-5.6-sol",
  messages: [{ role: "user", content: "Implement atomic distributed lock." }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}`,
    copyLabel: 'Copy TypeScript Code'
  },
  {
    id: 'curl',
    name: 'cURL / REST',
    category: 'Terminal & CLI',
    icon: Terminal,
    stepTitle: 'Direct HTTP REST API Ingestion',
    instructions: [
      'POST to https://galx.ai/v1/chat/completions.',
      'Send Bearer Authorization header with your live key.',
      'Supports full streaming Server-Sent Events (SSE).'
    ],
    configSnippet: `curl https://galx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer galx_live_your_key_here" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Hello GALXAI!"}],
    "stream": true
  }'`,
    copyLabel: 'Copy cURL Command'
  },
  {
    id: 'langchain',
    name: 'LangChain / Agents',
    category: 'Autonomous Swarms',
    icon: Bot,
    stepTitle: 'Orchestrate Autonomous Agents in LangChain',
    instructions: [
      'Use standard ChatOpenAI in langchain_openai.',
      'Set openai_api_base="https://galx.ai/v1".',
      'Enjoy 75% prompt caching on multi-turn agent scratchpads.'
    ],
    configSnippet: `from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

llm = ChatOpenAI(
    model="gpt-5.6-sol",
    openai_api_base="https://galx.ai/v1",
    openai_api_key="galx_live_your_key_here",
    streaming=True
)

for chunk in llm.stream([HumanMessage(content="Audit smart contract")]):
    print(chunk.content, end="", flush=True)`,
    copyLabel: 'Copy LangChain Code'
  }
];

export function GuidedSetupWizard() {
  const [activeTabId, setActiveTabId] = useState<string>('cursor');
  const [copied, setCopied] = useState(false);

  const currentTab = SETUP_TABS.find(t => t.id === activeTabId) || SETUP_TABS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentTab.configSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6 border border-white/10 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>UNIVERSAL 30-SECOND SETUP</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Connect in 30 Seconds with Zero Code Changes
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300">
            Works out-of-the-box with all OpenAI-compatible tools, editors, and backend frameworks.
          </p>
        </div>

        <Link
          href="/keys/new"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider font-mono shadow-md flex items-center gap-1.5 shrink-0 self-start md:self-auto cursor-pointer"
        >
          <Key className="w-3.5 h-3.5 text-black" />
          <span>Get Free Key ($5 Credit)</span>
          <ArrowRight className="w-3.5 h-3.5 text-black" />
        </Link>
      </div>

      {/* Environment Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
        {SETUP_TABS.map((tab) => {
          const isSelected = tab.id === activeTabId;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                isSelected
                  ? 'bg-amber-400/15 border-amber-400 text-white shadow-md shadow-amber-500/10 scale-[1.02]'
                  : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-amber-400 text-black font-bold' : 'bg-white/10 text-zinc-300'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-xs font-bold truncate text-white">{tab.name}</div>
                <div className="text-[10px] text-zinc-400 truncate">{tab.category}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Instruction Steps & Code Card */}
      <div className="p-6 rounded-3xl bg-black/70 border border-white/10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{currentTab.stepTitle}</span>
          </h3>

          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : currentTab.copyLabel}</span>
          </button>
        </div>

        {/* 3 Step Visual Bullets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          {currentTab.instructions.map((step, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
              <span className="text-[10px] text-amber-300 uppercase font-bold">Step {idx + 1}</span>
              <p className="text-zinc-300 text-xs font-sans leading-relaxed">{step}</p>
            </div>
          ))}
        </div>

        {/* Code Box */}
        <div className="relative rounded-2xl bg-black/90 border border-white/10 p-4 font-mono text-xs overflow-x-auto text-zinc-300 leading-relaxed">
          <pre>{currentTab.configSnippet}</pre>
        </div>
      </div>
    </section>
  );
}
