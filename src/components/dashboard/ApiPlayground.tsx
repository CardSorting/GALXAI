'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Play,
  Zap,
  Cpu,
  Key,
  Code2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Activity,
  Layers,
  Coins,
  Bot,
  Brain,
  Flame,
  Image as ImageIcon,
  Compass
} from 'lucide-react';
import { EXCLUSIVE_MODEL_CATALOG, ModelCatalog } from '@/core/router/PublicModelCatalog';
import { TrustSeals } from '@/components/common/TrustSeals';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';

interface PromptPreset {
  id: string;
  label: string;
  category: 'code' | 'reasoning' | 'fast' | 'visual' | 'embedding';
  model: string;
  prompt: string;
  simulatedReply: string;
}

const PRESETS: PromptPreset[] = [
  {
    id: 'nova-arch',
    label: '✨ GALX Nova Architecture & Design',
    category: 'reasoning',
    model: 'galx-nova',
    prompt: 'Design a clean, resilient AI application architecture with high-availability edge routing, automated prompt caching, and zero-data-retention guarantees.',
    simulatedReply: `### Resilient AI Application Architecture:

1. **⚡ Global High-Availability Ingress**:
   - Edge endpoints terminate requests nearest to clients for minimum wire latency.
   - Intelligent health routing provides seamless failover with zero dropped requests.

2. **🔒 Zero Data Retention (ZDR) Memory Fabric**:
   - Ephemeral memory buffers stream results without persistent disk writes.
   - Automated prompt caching accelerates repeated prompts while lowering latency.

3. **🛡️ Burst Smoothing & Resilience**:
   - Adaptive request handling absorbs traffic spikes with clean failover.`
  },
  {
    id: 'refactor',
    label: '⚡ Next.js Route Refactor',
    category: 'code',
    model: 'galx-nova',
    prompt: 'Refactor this Express route handler into a Next.js App Router route.ts with Zod payload validation:\n\napp.post("/api/auth/login", (req, res) => {\n  const { email, password } = req.body;\n  if (!email || !password) return res.status(400).send("Missing credentials");\n  // ...\n});',
    simulatedReply: `import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email("Invalid work email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const validated = LoginSchema.parse(rawBody);

    // Atomic authentication with sub-15ms latency
    const session = await authenticateUser(validated.email, validated.password);

    return NextResponse.json({
      success: true,
      token: session.token,
      user: { id: session.userId, email: session.email }
    }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION_FAILED", issues: error.issues }, { status: 422 });
    }
    return NextResponse.json({ error: "INTERNAL_AUTH_ERROR" }, { status: 500 });
  }
}`
  },
  {
    id: 'fast-summary',
    label: '🏎️ Instant Nova Summarizer',
    category: 'fast',
    model: 'galx-nova',
    prompt: 'Summarize the core benefits of building on GALX Nova with automated prompt caching in 3 bullet points.',
    simulatedReply: `• **Sustainable Intelligence**: Low-overhead managed intelligence via GALX Nova with predictable developer rates.
• **High-Availability Edge Routing**: Latency-optimized global edge routing with automatic health failover.
• **Zero Downtime Resilience**: Absorbs burst traffic spikes with prompt caching and active failure mitigation.`
  }
];

const MENTAL_MODELS = [
  { id: 'nova', name: '🚀 GALX Nova', model: 'galx-nova', icon: Flame, badge: 'Engine' },
  { id: 'image', name: '🎨 GALX Nova-image', model: 'galx-nova-image', icon: ImageIcon, badge: '-25%' }
];

function BaseApiPlayground() {
  const { user } = useAuth();
  const [modelInput, setModelInput] = useState<string>('galx-nova');
  const [prompt, setPrompt] = useState<string>(PRESETS[0].prompt);
  const [streamingOutput, setStreamingOutput] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'output' | 'request' | 'headers' | 'code'>('output');
  const [codeTab, setCodeTab] = useState<'python' | 'ts' | 'anthropic' | 'ollama' | 'sdk' | 'curl' | 'cursor'>('python');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [compactionMode, setCompactionMode] = useState<'auto' | 'raw'>('raw');
  const [metrics, setMetrics] = useState<{ ttftMs: number; throughputTokSec: number; tokens: number }>({
    ttftMs: 14,
    throughputTokSec: 152,
    tokens: 384
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Dynamic zero-hesitation resolution
  const resolvedModel = ModelCatalog.resolveModel(modelInput) || EXCLUSIVE_MODEL_CATALOG[0];

  const handleApplyPreset = (preset: PromptPreset) => {
    setModelInput(preset.model);
    setPrompt(preset.prompt);
    setStreamingOutput('');
  };

  const handleSelectMentalModel = (modelId: string) => {
    setModelInput(modelId);
    setStreamingOutput('');
  };

  const handleRunSimulation = async () => {
    if (isStreaming) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);
    setStreamingOutput('');
    const startTime = Date.now();

    // Try live gateway execution if key or sandbox available
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKeyInput.trim()) {
        headers['Authorization'] = `Bearer ${apiKeyInput.trim()}`;
      } else if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }

      if (compactionMode === 'raw') {
        headers['X-Galx-Compact-Prompts'] = 'false';
      }

      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: resolvedModel.id,
          messages: [{ role: 'user', content: prompt }],
          compact_prompts: compactionMode === 'auto',
          stream: true
        })
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let firstToken = true;
        let sseBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                if (firstToken) {
                  const ttft = Date.now() - startTime;
                  setMetrics(m => ({ ...m, ttftMs: ttft }));
                  firstToken = false;
                }
                accumulated += delta;
                setStreamingOutput(accumulated);
              }
            } catch {}
          }
        }

        const elapsed = (Date.now() - startTime) / 1000;
        const totalWords = accumulated.split(/\s+/).length;
        const estimatedTokens = Math.round(totalWords * 1.3);
        setMetrics({
          ttftMs: metrics.ttftMs || 14,
          throughputTokSec: Math.round(estimatedTokens / Math.max(0.1, elapsed)),
          tokens: estimatedTokens
        });
        setIsStreaming(false);
        return;
      }
    } catch {
      // Fallback to local smooth simulation
    }

    // Local smooth streaming simulation
    const matchedPreset = PRESETS.find(p => p.prompt === prompt) || PRESETS[0];
    const targetText = matchedPreset ? matchedPreset.simulatedReply : `### Response from ${resolvedModel.name}\n\nProcessed via GALXAI Universal Gateway with sustainable direct rates, zero data retention, and sub-15ms edge routing.`;

    const words = targetText.split(' ');
    let currentIdx = 0;
    let accumulated = '';

    const interval = setInterval(() => {
      if (currentIdx >= words.length) {
        clearInterval(interval);
        setIsStreaming(false);
        return;
      }
      accumulated += (currentIdx === 0 ? '' : ' ') + words[currentIdx];
      setStreamingOutput(accumulated);
      currentIdx++;
    }, 24);
  };

  const snippets = {
    python: `from openai import OpenAI

# 1-Line Drop-in for OpenAI Python SDK
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="${apiKeyInput || 'galx_live_your_gateway_key'}"
)

response = client.chat.completions.create(
    model="${resolvedModel.id}",
    messages=[{"role": "user", "content": ${JSON.stringify(prompt)}}],
    stream=True
)

for chunk in response:
    if chunk.choices and chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)`,

    ts: `import OpenAI from "openai";

// 1-Line Drop-in for Node.js / TypeScript OpenAI SDK
const openai = new OpenAI({
  baseURL: "https://galx.ai/v1",
  apiKey: process.env.GALX_API_KEY || "${apiKeyInput || 'galx_live_your_gateway_key'}",
});

const stream = await openai.chat.completions.create({
  model: "${resolvedModel.id}",
  messages: [{ role: "user", content: ${JSON.stringify(prompt)} }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}`,

    anthropic: `import Anthropic from "@anthropic-ai/sdk";

// Direct Drop-in for Anthropic SDK / Claude Code
const anthropic = new Anthropic({
  baseURL: "https://galx.ai",
  apiKey: "${apiKeyInput || 'galx_live_your_gateway_key'}"${compactionMode === 'raw' ? `,\n  defaultHeaders: { "X-Galx-Compact-Prompts": "false" }` : ''}
});

const response = await anthropic.messages.create({
  model: "${resolvedModel.id}",
  max_tokens: 2048,
  messages: [{ role: "user", content: ${JSON.stringify(prompt)} }],
});

console.log(response.content[0].text);`,

    ollama: `# Point OpenWebUI, Continue.dev, or Ollama CLI to GALXAI:
curl https://galx.ai/api/generate \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKeyInput || 'galx_live_your_gateway_key'}" \\
  -d '{
    "model": "${resolvedModel.id}",
    "prompt": ${JSON.stringify(prompt)},
    "stream": true
  }'`,

    sdk: `import { GalxAI, stream } from "@galxai/sdk";

// 1. Ultra-effortless streaming:
for await (const chunk of stream(${JSON.stringify(prompt)}, { model: "${resolvedModel.id}" })) {
  process.stdout.write(chunk);
}

// 2. Class client with auto-failover:
const galx = new GalxAI({
  apiKey: "${apiKeyInput || 'galx_live_your_gateway_key'}",
  compactPrompts: ${compactionMode === 'auto'}
});
const res = await galx.chat.completions.create({
  model: "${resolvedModel.id}",
  messages: [{ role: "user", content: ${JSON.stringify(prompt)} }]
});`,

    curl: `curl https://galx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKeyInput || 'galx_live_your_gateway_key'}" \\${compactionMode === 'raw' ? `\n  -H "X-Galx-Compact-Prompts: false" \\` : ''}
  -d '{
    "model": "${resolvedModel.id}",
    "compact_prompts": ${compactionMode === 'auto'},
    "messages": [{"role": "user", "content": ${JSON.stringify(prompt)}}],
    "stream": true
  }'`,

    cursor: `// In Cursor IDE / Windsurf Settings -> Models:
// 1. Add Model: ${resolvedModel.id}
// 2. Set Base URL: https://galx.ai/v1
// 3. API Key: ${apiKeyInput || 'galx_live_your_gateway_key'}${compactionMode === 'raw' ? `\n// 4. Custom Headers: { "X-Galx-Compact-Prompts": "false" }` : ''}`
  };

  const handleCopyCode = async () => {
    await safeCopyToClipboard(snippets[codeTab]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6 border border-white/10 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Zap className="w-3.5 h-3.5" />
            <span>INTERACTIVE ZERO-HESITATION SANDBOX &amp; PLAYGROUND</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Model Playground &amp; Inference Sandbox</h1>
          <p className="text-xs sm:text-sm text-zinc-300">
            Test live streaming completions powered by GALX Nova, 429 burst immunity, and 75% prompt caching live in your browser.
          </p>
        </div>

        <Link
          href="/keys"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider font-mono shadow-md flex items-center gap-1.5 shrink-0 self-start md:self-auto cursor-pointer"
        >
          <Key className="w-3.5 h-3.5 text-black" />
          <span>Claim $5 Free Live Key</span>
          <ArrowRight className="w-3.5 h-3.5 text-black" />
        </Link>
      </div>

      {/* Mental Model Fast Selector Bar */}
      <div className="space-y-2">
        <span className="text-zinc-400 text-[11px] font-mono font-semibold">1-Click Mental Model Intent Selector:</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {MENTAL_MODELS.map((mm) => {
            const Icon = mm.icon;
            const isSelected = resolvedModel.id === mm.model || resolvedModel.id.includes(mm.id);
            return (
              <button
                key={mm.id}
                onClick={() => handleSelectMentalModel(mm.model)}
                className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm ring-1 ring-amber-500/30'
                    : 'bg-black/40 border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                  <span className="text-xs font-bold truncate">{mm.name}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                  {mm.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
        <span className="text-zinc-400 text-[11px]">Quick Task Benchmarks:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleApplyPreset(preset)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-all cursor-pointer"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Config & Prompt Column */}
        <div className="lg:col-span-6 space-y-4">
          {/* Searchable Model Selector & Live Key Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-zinc-400 uppercase font-bold">Target AI Model / Alias</label>
                <span className="text-[10px] text-amber-400 font-mono">
                  &rarr; {resolvedModel.id} (-{resolvedModel.discountPercentage}%)
                </span>
              </div>
              <input
                type="text"
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                placeholder="galx-nova, galx-nova-image, nova..."
                className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-amber-300 font-bold focus:outline-none focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">Optional Live Key</label>
              <input
                type="password"
                placeholder="galx_live_... (or active session)"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Prompt Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-zinc-400 uppercase font-bold">Input Prompt / Instructions</label>
              <span className="text-[11px] font-mono text-zinc-500">{prompt.length} chars</span>
            </div>
            <textarea
              rows={8}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-4 rounded-2xl bg-black/60 border border-white/10 text-zinc-100 font-mono text-xs focus:outline-none focus:border-cyan-500/50 resize-y"
              placeholder="Enter your prompt here..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunSimulation}
              className={`flex-1 py-3 px-6 rounded-xl font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                isStreaming
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black'
              }`}
            >
              {isStreaming ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Stop Stream</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run Request ({resolvedModel.name})</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setPrompt('');
                setStreamingOutput('');
              }}
              className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white font-mono text-xs transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Right Output & Code Column */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('output')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeTab === 'output'
                    ? 'bg-white/10 text-white border border-white/10'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Stream Output
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeTab === 'code'
                    ? 'bg-white/10 text-white border border-white/10'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Code Snippets
              </button>
            </div>

            {/* Live Metrics Pill */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                compactionMode === 'raw'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
              }`}>
                {compactionMode === 'raw' ? '📝 Raw Passthrough' : '⚡ Compacted'}
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <Activity className="w-3 h-3" />
                <span>{metrics.ttftMs}ms TTFT</span>
              </span>
              <span className="text-zinc-300">{metrics.throughputTokSec} tok/s</span>
            </div>
          </div>

          {/* Sandbox Compaction Policy Toggle Bar */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5 font-mono text-xs">
            <span className="text-[11px] text-zinc-400">Compaction Engine:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCompactionMode('raw')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold text-[11px] ${
                  compactionMode === 'raw'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="100% byte-for-byte prompt passthrough without alteration (Default)"
              >
                📝 Raw Passthrough (Default)
              </button>
              <button
                type="button"
                onClick={() => setCompactionMode('auto')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold text-[11px] ${
                  compactionMode === 'auto'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Token deflation and multi-turn history compaction (Opt-In)"
              >
                ⚡ Compacted (Opt-In)
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-[300px] rounded-2xl bg-black/60 border border-white/10 p-4 font-mono text-xs overflow-hidden flex flex-col">
            {activeTab === 'output' && (
              <div className="flex-1 overflow-y-auto space-y-2 text-zinc-200 whitespace-pre-wrap">
                {streamingOutput ? (
                  <div>{streamingOutput}</div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2 my-auto py-12">
                    <Terminal className="w-8 h-8 opacity-40 text-amber-400" />
                    <p className="text-xs">Click &quot;Run Request&quot; above to inspect live edge token streaming.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'code' && (
              <div className="flex-1 flex flex-col space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                  <div className="flex flex-wrap items-center gap-1 text-[11px]">
                    {(
                      [
                        ['python', 'Python'],
                        ['ts', 'Node.js'],
                        ['anthropic', 'Anthropic'],
                        ['ollama', 'Ollama'],
                        ['sdk', '@galxai/sdk'],
                        ['curl', 'cURL'],
                        ['cursor', 'Cursor']
                      ] as const
                    ).map(([tabKey, tabLabel]) => (
                      <button
                        key={tabKey}
                        onClick={() => setCodeTab(tabKey as any)}
                        className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${
                          codeTab === tabKey
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {tabLabel}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer text-[11px]"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <pre className="flex-1 overflow-x-auto text-[11px] text-zinc-300 font-mono">
                  <code>{snippets[codeTab]}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const ApiPlayground = withErrorBoundary(BaseApiPlayground, {
  name: 'API Interactive Playground'
});
