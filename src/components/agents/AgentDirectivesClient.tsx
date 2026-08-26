'use client';

import React, { useState, useMemo } from 'react';
import { Copy, Check, Terminal, Sparkles, Shield, Cpu, Zap, Download, Layers, ArrowRight, BookOpen, AlertCircle, FileCode, CheckCircle2, Code2, Server, Laptop, ExternalLink } from 'lucide-react';

type Framework = 'nextjs' | 'react' | 'node' | 'python';
type AgentTool = 'cursor' | 'claude' | 'windsurf' | 'copilot' | 'universal';

export function AgentDirectivesClient() {
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<Framework>('nextjs');
  const [selectedAgent, setSelectedAgent] = useState<AgentTool>('cursor');
  const [activeCodeTab, setActiveCodeTab] = useState<'action' | 'ui' | 'patch' | 'hook' | 'rules'>('action');

  const generatedDirectives = useMemo(() => {
    const header = `# GALXAI Integration Directives for AI Coding Agents
# Protocol: Zero-Boilerplate Ambient Substrate (Deterministic Directives - No Fragile MCP)
# Target Environment: ${selectedFramework.toUpperCase()} | Agent Target: ${selectedAgent.toUpperCase()}

================================================================================
CRITICAL AGENT RULES:
================================================================================
1. ZERO USER-FACING API KEYS:
   - NEVER create UI forms, inputs, or modals asking the end-user for a GALXAI API key.
   - The application connects via backend environment variables ONLY: GALXAI_API_KEY=galx_live_... in .env.local.

2. ZERO BOILERPLATE ROUTING:
   ${selectedFramework === 'nextjs'
     ? '- Use React 19 / Next.js Server Actions: import { generateImageAction } from "galxai/actions" (Zero API routes needed).\n   - Or use ONE catch-all route: export { handleGalxAI as GET, handleGalxAI as POST } from "galxai/next" in app/api/galxai/[...action]/route.ts.'
     : selectedFramework === 'react'
     ? '- Use React hooks with automatic endpoint discovery: import { useImageGeneration } from "galxai/react".'
     : selectedFramework === 'python'
     ? '- Use OpenAI Python SDK drop-in: OpenAI(base_url="https://api.galx.ai/v1", api_key=os.environ["GALXAI_API_KEY"]).'
     : '- Use Express middleware: app.post("/api/generate", createExpressImageHandler()) from "galxai/express".'}

3. DECLARATIVE UI OVER IMPERATIVE CODE:
   - In React / Next.js views, use <GalxImage prompt="..." aspectRatio="16:9" /> from 'galxai/ui'.
   - In chat views, use <GalxChat model="gpt-5.6-sol" /> from 'galxai/ui'.

4. ZERO-MIGRATION LEGACY MIGRATION:
   - For existing OpenAI / Anthropic code, add import 'galxai/patch' to automatically reroute traffic to GALXAI Wholesale Gateway.

5. ASPECT RATIOS:
   - Pass human-readable aspect ratios: '16:9' | '9:16' | '1:1' | '4:3' | '3:2' | '4:5' | '21:9'.
`;

    if (selectedAgent === 'cursor') {
      return `---
description: GALXAI zero-boilerplate ambient AI integration directives
globs: **/*.{ts,tsx,js,jsx}
alwaysApply: true
---

${header}
`;
    }

    return header;
  }, [selectedFramework, selectedAgent]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    if (id === 'full') {
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2500);
    } else {
      setCopiedTab(id);
      setTimeout(() => setCopiedTab(null), 2500);
    }
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#060608] text-white pt-24 pb-32 px-4 sm:px-6 lg:px-8 selection:bg-cyan-500 selection:text-black font-sans">
      {/* Ambient Lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-cyan-500/10 via-purple-500/5 to-transparent blur-3xl opacity-70" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-cyan-600/5 blur-3xl rounded-full" />
      </div>

      <div className="relative max-w-5xl mx-auto space-y-12">
        {/* Header Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono tracking-wide backdrop-blur-md">
            <Cpu className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>AI CODING AGENTS DIRECTIVES & SKILLS STANDARD</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-display text-white">
            Agent Directives & Skills Hub
          </h1>

          <p className="max-w-2xl mx-auto text-zinc-400 text-base sm:text-lg leading-relaxed">
            Equip Claude Code, Cursor, Windsurf, Devin, Roo Code, and Copilot with <strong className="text-white">deterministic architectural directives</strong> to build zero-boilerplate, ambient GALXAI integrations.
          </p>

          {/* Big Action Bar */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => copyToClipboard(generatedDirectives, 'full')}
              className="group relative inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-all duration-200 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-95"
            >
              {copiedFull ? (
                <>
                  <Check className="w-4 h-4 text-black stroke-[3]" />
                  <span>Directives Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-black stroke-[2.5]" />
                  <span>Copy Tailored Directives to Clipboard</span>
                </>
              )}
            </button>

            <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-300 font-mono text-xs shadow-inner">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-zinc-500 select-none">$</span>
              <span className="text-white font-medium">npx galxai skills</span>
              <button
                onClick={() => copyToClipboard('npx galxai skills', 'cli')}
                className="ml-2 text-zinc-400 hover:text-white transition-colors"
                title="Copy Command"
              >
                {copiedTab === 'cli' ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Ultra-Simple 3-Step Developer Quickstart Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-cyan-500/30 shadow-2xl shadow-cyan-950/20 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">How It Works in 3 Simple Steps</h2>
              <p className="text-xs text-zinc-400">Zero backend wiring, zero API modals for users, zero guesswork for your agent.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Step 1 */}
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-mono font-bold">1</span>
                <span className="text-xs font-semibold text-white">Add Your Key to .env.local</span>
              </div>
              <div className="bg-black/60 p-2.5 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-300">
                GALXAI_API_KEY=galx_live_...
              </div>
              <p className="text-[11px] text-zinc-400">Server-only. Users are never asked for API keys in the app.</p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-mono font-bold">2</span>
                <span className="text-xs font-semibold text-white">Give Directives to Your Agent</span>
              </div>
              <div className="bg-black/60 p-2.5 rounded-lg border border-zinc-800 font-mono text-[11px] text-purple-300 flex items-center justify-between">
                <span>npx galxai skills</span>
                <button
                  onClick={() => copyToClipboard('npx galxai skills', 'step2')}
                  className="text-zinc-400 hover:text-white"
                >
                  {copiedTab === 'step2' ? <Check className="w-3 h-3 text-purple-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-400">Installs instructions for Cursor, Claude Code, Windsurf & Devin.</p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">3</span>
                <span className="text-xs font-semibold text-white">Tell Your Agent What to Build</span>
              </div>
              <div className="bg-black/60 p-2.5 rounded-lg border border-zinc-800 font-mono text-[11px] text-emerald-300">
                &quot;Add a banner using &lt;GalxImage /&gt;&quot;
              </div>
              <p className="text-[11px] text-zinc-400">Agent builds it cleanly using declarative JSX or Server Actions.</p>
            </div>
          </div>
        </div>

        {/* Stack & Agent Customizer Matrix */}
        <div className="p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 backdrop-blur-md space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Tailor Directives for Your Project</span>
              </h2>
              <p className="text-xs text-zinc-400">Select your project framework and target coding agent</p>
            </div>

            {/* Download Button */}
            <button
              onClick={() => {
                const fname = selectedAgent === 'cursor' ? 'galxai.mdc' : selectedAgent === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
                downloadFile(fname, generatedDirectives);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-cyan-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {selectedAgent === 'cursor' ? '.cursor/rules/galxai.mdc' : selectedAgent === 'claude' ? 'CLAUDE.md' : 'AGENTS.md'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Framework Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider">1. Select Target Stack</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'nextjs', label: 'Next.js 15 (App Router)' },
                  { id: 'react', label: 'React 19 / Vite' },
                  { id: 'node', label: 'Node / Express' },
                  { id: 'python', label: 'Python / FastAPI' },
                ].map(fw => (
                  <button
                    key={fw.id}
                    onClick={() => setSelectedFramework(fw.id as Framework)}
                    className={`p-3 rounded-xl text-left border text-xs font-medium transition-all ${selectedFramework === fw.id ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200' : 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700'}`}
                  >
                    {fw.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Agent Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider">2. Select Coding Agent</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cursor', label: 'Cursor (.cursor/rules)' },
                  { id: 'claude', label: 'Claude Code (CLAUDE.md)' },
                  { id: 'windsurf', label: 'Windsurf (.windsurfrules)' },
                  { id: 'universal', label: 'Universal (AGENTS.md)' },
                ].map(ag => (
                  <button
                    key={ag.id}
                    onClick={() => setSelectedAgent(ag.id as AgentTool)}
                    className={`p-3 rounded-xl text-left border text-xs font-medium transition-all ${selectedAgent === ag.id ? 'bg-purple-950/60 border-purple-500 text-purple-200' : 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700'}`}
                  >
                    {ag.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Anti-MCP Architectural Rationale Card */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/20 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">Why We Reject Fragile MCP in Favor of Deterministic Directives</h2>
              <p className="text-xs text-zinc-400 font-mono">Architectural Decision: Deterministic Direct Ingestion vs. Protocol Fragmentation</p>
            </div>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed">
            Model Context Protocol (MCP) tool servers introduce background socket daemon crashes, transport latency, and non-deterministic agent tool hallucination. Instead, world-class developer platforms rely on <strong>deterministic repository directives</strong> (<code className="text-amber-300 bg-black/40 px-1.5 py-0.5 rounded text-xs font-mono">.cursorrules</code>, <code className="text-amber-300 bg-black/40 px-1.5 py-0.5 rounded text-xs font-mono">CLAUDE.md</code>, <code className="text-amber-300 bg-black/40 px-1.5 py-0.5 rounded text-xs font-mono">AGENTS.md</code>) combined with <strong className="text-white">native declarative SDK primitives</strong>.
          </p>

          {/* Comparison Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-zinc-800 rounded-xl overflow-hidden">
              <thead className="bg-zinc-900/80 text-zinc-400 font-mono uppercase">
                <tr>
                  <th className="p-3">Dimension</th>
                  <th className="p-3 text-amber-400">Fragile MCP Architecture</th>
                  <th className="p-3 text-cyan-400">GALXAI Deterministic Directives</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 font-sans">
                <tr>
                  <td className="p-3 font-medium text-white">Execution Transport</td>
                  <td className="p-3 text-zinc-400">Local stdio / JSON-RPC socket daemon (prone to pipe disconnects)</td>
                  <td className="p-3 text-zinc-200 font-semibold">Direct React 19 Server Actions & native HTTP RPC</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-white">Security & API Keys</td>
                  <td className="p-3 text-zinc-400">Requires exposing admin keys or custom MCP configs</td>
                  <td className="p-3 text-zinc-200 font-semibold">Zero user keys; reads .env.local securely on backend</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-white">Code Delivery</td>
                  <td className="p-3 text-zinc-400">Forces agent into obscure tool execution loops</td>
                  <td className="p-3 text-zinc-200 font-semibold">Clean declarative JSX (&lt;GalxImage /&gt;) and 1-line helpers</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-white">Latency Overhead</td>
                  <td className="p-3 text-zinc-400">~200ms–800ms serialization & IPC socket tax</td>
                  <td className="p-3 text-zinc-200 font-semibold">0ms overhead (Direct TypeScript compilation)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Code Patterns Tabs */}
        <div className="rounded-2xl bg-zinc-950 border border-zinc-800/80 overflow-hidden shadow-2xl">
          <div className="flex border-b border-zinc-800/80 bg-zinc-900/50 overflow-x-auto p-1.5 gap-1">
            <button
              onClick={() => setActiveCodeTab('action')}
              className={`px-4 py-2 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${activeCodeTab === 'action' ? 'bg-zinc-800 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              React 19 Server Action
            </button>
            <button
              onClick={() => setActiveCodeTab('ui')}
              className={`px-4 py-2 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${activeCodeTab === 'ui' ? 'bg-zinc-800 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Declarative UI (&lt;GalxImage /&gt;)
            </button>
            <button
              onClick={() => setActiveCodeTab('patch')}
              className={`px-4 py-2 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${activeCodeTab === 'patch' ? 'bg-zinc-800 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              OpenAI Auto-Patcher
            </button>
            <button
              onClick={() => setActiveCodeTab('rules')}
              className={`px-4 py-2 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${activeCodeTab === 'rules' ? 'bg-zinc-800 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Agent Directive Prompt
            </button>
          </div>

          <div className="p-6 relative">
            <button
              onClick={() => copyToClipboard(
                activeCodeTab === 'action' ? `'use client';\nimport { generateImageAction } from 'galxai/actions';\n\nexport function Studio() {\n  return (\n    <button onClick={async () => {\n      const res = await generateImageAction('Cyberpunk Tokyo', { aspectRatio: '16:9' });\n      console.log(res.data[0].url);\n    }}>\n      Generate Image\n    </button>\n  );\n}` :
                activeCodeTab === 'ui' ? `import { GalxImage, GalxChat } from 'galxai/ui';\n\nexport function Studio() {\n  return (\n    <div className="space-y-6">\n      <GalxImage prompt="Cyberpunk metropolis" aspectRatio="16:9" interactive />\n      <GalxChat model="gpt-5.6-sol" placeholder="Ask anything..." />\n    </div>\n  );\n}` :
                activeCodeTab === 'patch' ? `// Put in your layout.tsx or index.ts:\nimport 'galxai/patch';\n\n// Existing OpenAI code is transparently rerouted to GALXAI with wholesale pricing:\nimport OpenAI from 'openai';\nconst openai = new OpenAI();` :
                generatedDirectives,
                activeCodeTab
              )}
              className="absolute top-8 right-8 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition-colors"
            >
              {copiedTab === activeCodeTab ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTab === activeCodeTab ? 'Copied' : 'Copy Snippet'}</span>
            </button>

            <pre className="text-xs sm:text-sm font-mono text-zinc-300 overflow-x-auto leading-relaxed max-h-[440px] pr-20">
              {activeCodeTab === 'action' && `// Direct React 19 / Next.js 15 Server Action (Zero API Routes Required)
'use client';
import { generateImageAction } from 'galxai/actions';

export function Studio() {
  return (
    <button onClick={async () => {
      const res = await generateImageAction('Cyberpunk Tokyo', { aspectRatio: '16:9' });
      console.log(res.data[0].url);
    }}>
      Generate Image
    </button>
  );
}`}
              {activeCodeTab === 'ui' && `// Declarative JSX UI Primitives (Zero State Management Code)
import { GalxImage, GalxChat } from 'galxai/ui';

export function Studio() {
  return (
    <div className="space-y-6">
      {/* Self-hydrating visual creation with hover remixing & progressive glowing placeholder */}
      <GalxImage
        prompt="Cyberpunk metropolis at dusk"
        aspectRatio="16:9"
        interactive
        className="w-full h-96 rounded-2xl shadow-2xl"
      />

      {/* Complete streaming multi-turn chat widget */}
      <GalxChat
        model="gpt-5.6-sol"
        placeholder="Ask questions or synthesize ideas..."
        className="h-[500px]"
      />
    </div>
  );
}`}
              {activeCodeTab === 'patch' && `// Zero-Migration OpenAI Drop-In (Zero Code Changes)
// Place at the top of your index.ts / layout.tsx / server.ts:
import 'galxai/patch';

// Existing OpenAI code is automatically rerouted to GALXAI Wholesale Gateway:
import OpenAI from 'openai';
const openai = new OpenAI();
const completion = await openai.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Audit distributed lock implementation' }]
});`}
              {activeCodeTab === 'rules' && generatedDirectives}
            </pre>
          </div>
        </div>

        {/* 3-Pill Quick Command Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400 uppercase">1. Directives</span>
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <p className="text-xs font-mono text-white select-all">npx galxai skills</p>
            <p className="text-[11px] text-zinc-500">Injects .cursorrules, CLAUDE.md & AGENTS.md</p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400 uppercase">2. Health Doctor</span>
              <Zap className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <p className="text-xs font-mono text-white select-all">npx galxai doctor</p>
            <p className="text-[11px] text-zinc-500">Audits keys, Next.js routes, and ping TTFT</p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400 uppercase">3. Component Eject</span>
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-xs font-mono text-white select-all">npx galxai add image</p>
            <p className="text-[11px] text-zinc-500">Ejects &lt;GalxImage /&gt; into src/components/ui</p>
          </div>
        </div>

        {/* Plaintext Direct Endpoint */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center space-y-3">
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Direct Endpoint for LLM Fetchers & Agent Tool Calls</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black border border-zinc-800 text-xs font-mono text-cyan-400">
            <span>https://galx.ai/agents.txt</span>
            <button
              onClick={() => copyToClipboard('https://galx.ai/agents.txt', 'url')}
              className="text-zinc-400 hover:text-white ml-1"
            >
              {copiedTab === 'url' ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-xs text-zinc-500">Optimized for token efficiency, prompt compaction, and instant ingestion by LLMs.</p>
        </div>
      </div>
    </div>
  );
}
