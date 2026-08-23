'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal, Code2, Sparkles, Zap, Rocket, Globe, Bot, Layers } from 'lucide-react';

export function QuickstartDocs() {
  const [activeSnippet, setActiveSnippet] = useState<
    'curl' | 'python' | 'node' | 'anthropic' | 'ollama' | 'sdk' | 'cursor' | 'litellm'
  >('curl');
  const [copied, setCopied] = useState(false);

  const snippets = {
    curl: `curl https://galx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer galx_live_your_gateway_key" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [
      { "role": "system", "content": "You are an elite coding architect." },
      { "role": "user", "content": "Explain zero-downtime database migrations." }
    ],
    "stream": true
  }'`,

    python: `from openai import OpenAI

# Universal Drop-in for Python OpenAI SDK (openai>=1.0.0)
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Stream from pooled SOTA flagship shards with automatic failover
response = client.chat.completions.create(
    model="gpt-5.6-sol",  # or "x-ai/grok-4.6", "gpt-5.6-terra", "gpt-5.6-luna"
    messages=[
        {"role": "system", "content": "You are a software architect."},
        {"role": "user", "content": "Write an atomic lease manager in Python."}
    ],
    stream=True
)

for chunk in response:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)`,

    node: `import OpenAI from "openai";

// 1-Line Drop-in for Node.js / TypeScript OpenAI SDK
const openai = new OpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: process.env.GALX_API_KEY || "galx_live_your_gateway_key",
});

async function main() {
  const stream = await openai.chat.completions.create({
    model: "gpt-5.6-sol", // Accepts aliases: 'gpt-5', 'sol', 'terra', 'grok', 'fast'
    messages: [{ role: "user", content: "Implement a distributed circuit breaker." }],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

main();`,

    anthropic: `import Anthropic from "@anthropic-ai/sdk";

// Direct Drop-in for Anthropic SDK / Claude Code / Cursor Anthropic provider
const anthropic = new Anthropic({
  baseURL: "https://galx.ai",
  apiKey: process.env.GALX_API_KEY || "galx_live_your_gateway_key",
});

const message = await anthropic.messages.create({
  model: "claude-3-7-sonnet", // Automatically mapped to flagship SOTA engine
  max_tokens: 2048,
  messages: [{ role: "user", content: "Analyze high-throughput Kafka partitions." }],
});

console.log(message.content[0].text);`,

    ollama: `# Point OpenWebUI, Continue.dev, Aider, or Ollama CLI to GALXAI:
# In ~/.ollama or environment: OLLAMA_HOST=https://galx.ai

# Test raw Ollama Generate API:
curl https://galx.ai/api/generate \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer galx_live_your_gateway_key" \\
  -d '{
    "model": "sol",
    "prompt": "Write a high-performance LRU cache in Rust",
    "stream": true
  }'

# List models formatted as Ollama tags:
curl https://galx.ai/api/tags`,

    sdk: `import { GalxAI, run, stream } from "@galxai/sdk";

// 1. Ultra-effortless 1-line execution:
const answer = await run("Explain quantum entanglement in 10 words");

// 2. Ultra-effortless token streaming:
for await (const token of stream("Write a haiku about high velocity")) {
  process.stdout.write(token);
}

// 3. Multi-modal and background agent jobs:
const galx = new GalxAI("galx_live_your_gateway_key");
const res = await galx.chat.completions.create({
  model: "gpt-5.6-sol",
  messages: [{ role: "user", content: "Implement token bucket rate limiter." }]
});`,

    cursor: `// In Cursor IDE / Windsurf / Cline / Roo-Code Settings -> Custom OpenAI Provider:
{
  "openai.baseUrl": "https://galx.ai/v1",
  "openai.apiKey": "galx_live_your_gateway_key",
  "openai.model": "gpt-5.6-sol",
  "openai.customModels": [
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "x-ai/grok-4.6",
    "text-embedding-3-small"
  ]
}`,

    litellm: `# LiteLLM Proxy / LangChain / LlamaIndex Configuration (config.yaml)
model_list:
  - model_name: galx-flagship
    litellm_params:
      model: openai/gpt-5.6-sol
      api_base: https://galx.ai/v1
      api_key: os.environ/GALX_API_KEY
  - model_name: galx-grok
    litellm_params:
      model: openai/x-ai/grok-4.6
      api_base: https://galx.ai/v1
      api_key: os.environ/GALX_API_KEY`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeSnippet]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel rounded-3xl p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-amber-400" />
            Universal Multi-Mental-Model Developer Quickstart
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Zero-hesitation drop-in compatibility for OpenAI SDK, Anthropic SDK, Ollama, LangChain, and IDE agent extensions.
          </p>
        </div>

        {/* Snippet Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold">
          {(
            [
              ['curl', 'cURL'],
              ['python', 'Python'],
              ['node', 'Node.js'],
              ['anthropic', 'Anthropic'],
              ['ollama', 'Ollama'],
              ['sdk', '@galxai/sdk'],
              ['cursor', 'Cursor / IDE'],
              ['litellm', 'LiteLLM']
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveSnippet(key as any)}
              className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                activeSnippet === key
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Code Block Container */}
      <div className="relative rounded-2xl bg-black/70 border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
          <span className="text-[11px] font-mono text-zinc-400">
            {activeSnippet === 'curl' && 'bash / terminal cURL'}
            {activeSnippet === 'python' && 'Python 3.10+ (openai>=1.0.0)'}
            {activeSnippet === 'node' && 'Node.js / TypeScript (openai)'}
            {activeSnippet === 'anthropic' && '@anthropic-ai/sdk / Claude Code'}
            {activeSnippet === 'ollama' && 'Ollama CLI & Local AI Clients'}
            {activeSnippet === 'sdk' && 'Official @galxai/sdk Universal Client'}
            {activeSnippet === 'cursor' && 'Cursor / Windsurf settings.json'}
            {activeSnippet === 'litellm' && 'LiteLLM / LangChain Proxy YAML'}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto selection:bg-amber-500 selection:text-black">
          <code>{snippets[activeSnippet]}</code>
        </pre>
      </div>

      {/* Endpoint Mapping Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-amber-300 font-mono">POST /v1/chat/completions</div>
          <p className="text-[11px] text-zinc-400">Streaming SSE &amp; JSON completions for Sol, Terra, Luna &amp; Grok 4.6.</p>
        </div>
        <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-violet-300 font-mono">POST /v1/messages</div>
          <p className="text-[11px] text-zinc-400">Full Anthropic protocol SSE streaming for Claude Code &amp; Cursor.</p>
        </div>
        <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-cyan-300 font-mono">POST /api/generate &amp; /chat</div>
          <p className="text-[11px] text-zinc-400">Native Ollama NDJSON streaming for OpenWebUI, Continue &amp; Aider.</p>
        </div>
        <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-emerald-300 font-mono">POST /v1/embeddings &amp; /images</div>
          <p className="text-[11px] text-zinc-400">Vector embeddings (1536d/3072d) and 4K visual synthesis.</p>
        </div>
      </div>
    </div>
  );
}
