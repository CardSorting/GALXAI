'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal, Code2, Sparkles, Zap, Rocket } from 'lucide-react';

export function QuickstartDocs() {
  const [activeSnippet, setActiveSnippet] = useState<'curl' | 'python' | 'node' | 'cursor'>('curl');
  const [copied, setCopied] = useState(false);

  const snippets = {
    curl: `curl https://galx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer galx_live_your_gateway_key" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [
      { "role": "system", "content": "You are a coding assistant." },
      { "role": "user", "content": "Explain continuous token-bucket calculus." }
    ],
    "stream": true
  }'`,

    python: `from openai import OpenAI

# Initialize client pointing to GALXAI Universal Gateway
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Stream completion from pooled OpenAI Codex or xAI Grok shards
response = client.chat.completions.create(
    model="gpt-5.6-sol", # or "x-ai/grok-4.5", "gpt-5.6-terra", "gpt-5.6-luna"
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

// Initialize OpenAI SDK directed to local GALXAI Gateway
const openai = new OpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: "galx_live_your_gateway_key",
});

async function main() {
  const stream = await openai.chat.completions.create({
    model: "x-ai/grok-4.5", // or "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"
    messages: [{ role: "user", content: "Implement a circuit breaker state machine." }],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

main();`,

    cursor: `// Cursor / Cline / Roo-Code Custom OpenAI Provider Settings
{
  "openai.baseUrl": "https://galx.ai/v1",
  "openai.apiKey": "galx_live_your_gateway_key",
  "openai.model": "gpt-5.6-sol",
  "openai.customModels": [
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "x-ai/grok-4.5"
  ]
}`
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
            Developer Gateway Integration Quickstart
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Connect any standard OpenAI-compatible SDK, framework (LangChain, LlamaIndex), or agent IDE.
          </p>
        </div>

        {/* Snippet Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5 text-xs font-semibold">
          {(['curl', 'python', 'node', 'cursor'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSnippet(tab)}
              className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                activeSnippet === tab
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab === 'cursor' ? 'Cursor / IDE' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Code Block Container */}
      <div className="relative rounded-2xl bg-black/70 border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
          <span className="text-[11px] font-mono text-zinc-400">
            {activeSnippet === 'curl' && 'bash / terminal'}
            {activeSnippet === 'python' && 'Python 3.10+ (openai>=1.0.0)'}
            {activeSnippet === 'node' && 'Node.js / TypeScript (openai)'}
            {activeSnippet === 'cursor' && 'settings.json configuration'}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-amber-300 font-mono">POST /v1/chat/completions</div>
          <p className="text-[11px] text-zinc-400">Full streaming SSE and JSON completions for Sol, Terra, Luna & Grok 4.5.</p>
        </div>
        <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-cyan-300 font-mono">GET /v1/models</div>
          <p className="text-[11px] text-zinc-400">Lists all active online models in the pool with live context limits.</p>
        </div>
        <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-emerald-300 font-mono">POST /v1/images/generations</div>
          <p className="text-[11px] text-zinc-400">Visual synthesis routing for GPT-Image-2 (Ultra 4K), DALL-E 3, and Grok Imagine.</p>
        </div>
      </div>
    </div>
  );
}
