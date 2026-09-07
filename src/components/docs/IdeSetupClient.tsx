'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Laptop,
  CheckCircle2,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';

export function IdeSetupClient() {
  const [activeTab, setActiveTab] = useState<'cursor' | 'windsurf' | 'claude_code' | 'continue' | 'cline'>('cursor');
  const [copiedKey, setCopiedKey] = useState(false);

  const configs = {
    cursor: {
      title: 'Cursor IDE Configuration',
      instructions: [
        'Open Cursor Settings (Cmd + Shift + J on Mac or Ctrl + Shift + J on Windows).',
        'Navigate to Models > OpenAI API Key.',
        'Toggle "Override OpenAI Base URL" and enter https://galx.ai/v1.',
        'Paste your API key (galx_live_...).',
        'Add model names: gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna.',
      ],
      snippet: `// In Cursor Settings -> Models:
Override Base URL: https://galx.ai/v1
API Key: galx_live_your_gateway_key

// In your project root as .cursorrules:
{
  "default_model": "gpt-5.6-sol",
  "base_url": "https://galx.ai/v1",
  "caching": true,
  "reasoning_effort": "high"
}`,
    },
    windsurf: {
      title: 'Windsurf / Cascade Configuration',
      instructions: [
        'Open Windsurf Settings > AI Providers.',
        'Select OpenAI Compatible Provider.',
        'Set Endpoint URL: https://galx.ai/v1/chat/completions.',
        'Set API Key: galx_live_your_gateway_key.',
        'Set Preferred Model: gpt-5.6-sol.',
      ],
      snippet: `// .windsurfrules in your project root:
{
  "provider": "openai-compatible",
  "api_base": "https://galx.ai/v1",
  "model": "gpt-5.6-sol",
  "temperature": 0.2,
  "max_tokens": 8192
}`,
    },
    claude_code: {
      title: 'Claude Code CLI / Terminal Agent',
      instructions: [
        'Set ANTHROPIC_BASE_URL to point to GALXAI Wholesale Clearinghouse.',
        'Set ANTHROPIC_API_KEY to your galx_live_... bearer key.',
        'Run Claude Code in a project and verify the selected model and endpoint.',
      ],
      snippet: `# In your shell (~/.zshrc or ~/.bashrc):
export ANTHROPIC_BASE_URL="https://galx.ai/v1"
export ANTHROPIC_API_KEY="galx_live_your_gateway_key"

# Run Claude Code CLI directly:
claude "Refactor this module with full test coverage"`,
    },
    continue: {
      title: 'Continue.dev Extension (~/.continue/config.json)',
      instructions: [
        'Open your ~/.continue/config.json configuration file.',
        'Add the GALXAI model definitions under the "models" array.',
        'Save the file and send a test request from Continue.',
      ],
      snippet: `{
  "models": [
    {
      "title": "GALXAI GPT-5.6 Sol (Flagship)",
      "provider": "openai",
      "model": "gpt-5.6-sol",
      "apiBase": "https://galx.ai/v1",
      "apiKey": "galx_live_your_gateway_key"
    },
    {
      "title": "GALXAI GPT-5.6 Terra (Balanced)",
      "provider": "openai",
      "model": "gpt-5.6-terra",
      "apiBase": "https://galx.ai/v1",
      "apiKey": "galx_live_your_gateway_key"
    }
  ]
}`,
    },
    cline: {
      title: 'Cline / Roo-Code VS Code Extension',
      instructions: [
        'Open Cline extension settings in VS Code.',
        'Select API Provider: "OpenAI Compatible".',
        'Enter Base URL: https://galx.ai/v1.',
        'Enter API Key: galx_live_your_gateway_key.',
        'Enter Model ID: gpt-5.6-sol.',
      ],
      snippet: `// Cline Provider Settings:
API Provider: OpenAI Compatible
Base URL: https://galx.ai/v1
API Key: galx_live_your_gateway_key
Model ID: gpt-5.6-sol
Context Window: 200000
Max Output: 16384`,
    },
  };

  const handleCopy = async (text: string) => {
    await safeCopyToClipboard(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'Cursor, Windsurf & IDE Setup' },
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <Laptop className="w-3.5 h-3.5" />
              <span>AI IDE &amp; AGENT CONFIGURATION</span>
            </div>
            <Link
              href="/keys/new"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase font-mono tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Create API Key</span>
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Cursor, Windsurf &amp; Continue.dev Setup</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-sans">
            Point supported coding tools at the GALXAI endpoint, select a current model ID, and verify one authenticated request.
          </p>
        </div>

        <DocsSubNav />

        {/* Founding Cohort Rate Lock Ribbon */}

        {/* Interactive IDE Tabs */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4 font-mono text-xs">
            {(['cursor', 'windsurf', 'claude_code', 'continue', 'cline'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl font-bold uppercase transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab === 'cursor' ? '💻 Cursor IDE' : tab === 'windsurf' ? '🌊 Windsurf' : tab === 'claude_code' ? '⚡ Claude Code CLI' : tab === 'continue' ? '⚡ Continue.dev' : '🤖 Cline / Roo-Code'}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-black text-white font-mono flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{configs[activeTab].title}</span>
            </h2>

            <div className="space-y-2 font-sans text-xs sm:text-sm text-zinc-300">
              <ol className="list-decimal list-inside space-y-2 pl-2">
                {configs[activeTab].instructions.map((inst, i) => (
                  <li key={i} className="leading-relaxed">{inst}</li>
                ))}
              </ol>
            </div>

            <div className="relative rounded-2xl bg-black/80 border border-white/10 p-5 font-mono text-xs overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 text-zinc-400">
                <span>Drop-in Configuration File</span>
                <button
                  onClick={() => handleCopy(configs[activeTab].snippet)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all text-xs cursor-pointer font-sans"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied Configuration!' : 'Copy Config'}</span>
                </button>
              </div>
              <pre className="text-amber-300 overflow-x-auto leading-relaxed">
                {configs[activeTab].snippet}
              </pre>
            </div>
          </div>
        </div>

        {/* Consumer-Grade Trust Seals */}
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
    </div>
  );
}
