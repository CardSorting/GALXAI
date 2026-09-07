'use client';

import React, { useState } from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Code2,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

export function MigrationClient() {
  const [activeSource, setActiveSource] = useState<
    'openai' | 'cursor' | 'openrouter' | 'vercel' | 'langchain' | 'litellm' | 'llamaindex' | 'make'
  >('openai');
  const [copiedDiff, setCopiedDiff] = useState(false);

  const migrationSnippets = {
    openai: {
      title: 'Migrating from Direct OpenAI SDK',
      before: `# Direct OpenAI (Retail List Pricing)
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY")
)`,
      after: `# GALXAI OpenAI-compatible gateway
from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",  # <- ONLY 1 LINE CHANGE NEEDED!
    api_key="galx_live_your_gateway_key"
)`,
      env: `OPENAI_BASE_URL="https://galx.ai/v1"
OPENAI_API_KEY="galx_live_your_gateway_key"`,
    },
    cursor: {
      title: 'Migrating Cursor IDE / Windsurf',
      before: `// Standard Cursor Settings:
Override Base URL: [empty / default]
API Key: sk-proj-...
Models: gpt-4o, claude-3-5-sonnet`,
      after: `// GALXAI Cursor settings override:
Override Base URL: https://galx.ai/v1
API Key: galx_live_your_gateway_key
Models: gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna`,
      env: `// In .cursorrules or .vscode/settings.json:
{
  "openai.baseUrl": "https://galx.ai/v1",
  "openai.apiKey": "galx_live_your_gateway_key",
  "openai.model": "gpt-5.6-sol"
}`,
    },
    openrouter: {
      title: 'Migrating from OpenRouter (0% Markup)',
      before: `# OpenRouter Client (+5% Routing Markup Fee)
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY")
)`,
      after: `# GALXAI Universal Gateway (0% Surcharge + Wholesale Margins)
from openai import OpenAI

client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)`,
      env: `OPENAI_BASE_URL="https://galx.ai/v1"
OPENAI_API_KEY="galx_live_your_gateway_key"`,
    },
    vercel: {
      title: 'Migrating Vercel AI SDK (@ai-sdk/openai)',
      before: `// Standard Vercel AI SDK
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

const result = streamText({
  model: openai("gpt-4o"),
  prompt: "Build a responsive header",
});`,
      after: `// GALXAI provider instance
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const galxai = createOpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

const result = streamText({
  model: galxai("gpt-5.6-sol"),
  prompt: "Build a responsive header",
});`,
      env: `GALXAI_API_KEY="galx_live_your_gateway_key"`,
    },
    langchain: {
      title: 'Migrating LangChain & LangGraph',
      before: `# Direct LangChain OpenAI Client
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-4o",
    api_key="sk-proj-..."
)`,
      after: `# LangChain via GALXAI
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-5.6-sol",
    openai_api_base="https://galx.ai/v1",
    openai_api_key="galx_live_your_gateway_key"
)`,
      env: `OPENAI_API_BASE="https://galx.ai/v1"
OPENAI_API_KEY="galx_live_your_gateway_key"`,
    },
    litellm: {
      title: 'Migrating with LiteLLM Proxy',
      before: `# LiteLLM Standard Endpoint
import litellm

response = litellm.completion(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)`,
      after: `# LiteLLM Routed via GALXAI Gateway
import litellm

response = litellm.completion(
    model="openai/gpt-5.6-sol",
    api_base="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key",
    messages=[{"role": "user", "content": "Hello!"}]
)`,
      env: `LITELLM_API_BASE="https://galx.ai/v1"
LITELLM_API_KEY="galx_live_your_gateway_key"`,
    },
    llamaindex: {
      title: 'Migrating LlamaIndex RAG Pipelines',
      before: `# LlamaIndex Default Provider
from llama_index.llms.openai import OpenAI

llm = OpenAI(model="gpt-4o")`,
      after: `# LlamaIndex routed via GALXAI
from llama_index.llms.openai import OpenAI

llm = OpenAI(
    model="gpt-5.6-sol",
    api_base="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)`,
      env: `OPENAI_API_BASE="https://galx.ai/v1"
OPENAI_API_KEY="galx_live_your_gateway_key"`,
    },
    make: {
      title: 'Migrating Make.com, Zapier & n8n',
      before: `// Standard HTTP Webhook Module
Endpoint: https://api.openai.com/v1/chat/completions
Headers:  Authorization: Bearer sk-proj-...`,
      after: `// GALXAI High-Throughput Wholesale Endpoint
Endpoint: https://galx.ai/v1/chat/completions
Headers:  Authorization: Bearer galx_live_your_gateway_key
Payload:  { "model": "gpt-5.6-sol", "messages": [...] }`,
      env: `URL: https://galx.ai/v1/chat/completions
HEADER: Authorization: Bearer galx_live_your_gateway_key`,
    },
  };

  const activeSnippet = migrationSnippets[activeSource];

  const handleCopyEnv = async () => {
    await safeCopyToClipboard(activeSnippet.env);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'Getting Started', href: '/docs/quickstart' },
            { label: '1-Click Zero-Code Migration Guide' },
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">1-Click Zero-Code Migration Guide</h1>
            <p className="text-xs text-zinc-400">
              Switch from direct OpenAI, Cursor, OpenRouter, Vercel AI SDK, LangChain, or LiteLLM in 30 seconds with 1 line of configuration.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>0 CODE REFACTORING REQUIRED</span>
            </span>
          </div>
        </div>

        <DocsSubNav />

        {/* Source Selector Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10 overflow-x-auto font-mono text-xs">
          {[
            { id: 'openai', label: 'OpenAI SDK' },
            { id: 'cursor', label: 'Cursor / Windsurf' },
            { id: 'openrouter', label: 'OpenRouter' },
            { id: 'vercel', label: 'Vercel AI SDK' },
            { id: 'langchain', label: 'LangChain' },
            { id: 'litellm', label: 'LiteLLM Proxy' },
            { id: 'llamaindex', label: 'LlamaIndex' },
            { id: 'make', label: 'Make / Zapier / n8n' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSource(tab.id as any)}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeSource === tab.id
                  ? 'bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Migration Diff Box */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Before */}
          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-rose-500/30 bg-rose-500/5 font-mono text-xs">
            <div className="flex items-center justify-between text-rose-400 font-bold">
              <span>BEFORE: Current Setup</span>
              <span className="text-[10px] uppercase font-sans">Full Retail Price</span>
            </div>
            <pre className="p-4 rounded-2xl bg-black/60 border border-white/5 text-zinc-300 overflow-x-auto">
              <code>{activeSnippet.before}</code>
            </pre>
          </div>

          {/* After */}
          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-emerald-500/30 bg-emerald-500/5 font-mono text-xs">
            <div className="flex items-center justify-between text-emerald-400 font-bold">
              <span>AFTER: Routed via GALXAI</span>
              <span className="text-[10px] uppercase font-sans">OpenAI-compatible endpoint</span>
            </div>
            <pre className="p-4 rounded-2xl bg-black/60 border border-white/5 text-cyan-300 overflow-x-auto">
              <code>{activeSnippet.after}</code>
            </pre>
          </div>
        </div>

        {/* 1-Click .env Config Export */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-400" />
                Environment Variable Configuration (.env)
              </h3>
              <p className="text-xs text-zinc-400">Paste this into your project&apos;s root <code>.env</code> file:</p>
            </div>

            <button
              onClick={handleCopyEnv}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              {copiedDiff ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedDiff ? 'Copied .env' : 'Copy .env snippet'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-amber-300 border border-white/5 overflow-x-auto">
            <code>{activeSnippet.env}</code>
          </pre>
        </div>
      </main>
    </div>
  );
}
