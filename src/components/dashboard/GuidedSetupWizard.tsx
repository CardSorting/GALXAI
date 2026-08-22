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
  CheckCircle2
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
    id: 'cursor',
    name: 'Cursor / Windsurf IDE',
    category: 'AI Code Editors',
    icon: Laptop,
    stepTitle: 'Connect in Cursor / Windsurf Settings (20 Seconds)',
    instructions: [
      'Open Cursor Settings → Models → OpenAI API Key.',
      'Set Override OpenAI Base URL to: https://galx.ai/v1',
      'Paste your GALXAI key into the API Key field.'
    ],
    configSnippet: `// Cursor / Windsurf Configuration
Base URL: https://galx.ai/v1
API Key:  galx_live_your_key_here
Models:   gpt-5.6-sol, gpt-5.6-terra, grok-4.5`,
    copyLabel: 'Copy Cursor Settings'
  },
  {
    id: 'nocode',
    name: 'Zapier / Make / Dify',
    category: 'No-Code Workflows',
    icon: Zap,
    stepTitle: 'Connect to No-Code AI Workflows (30 Seconds)',
    instructions: [
      'In Zapier / Make.com / Dify, select "OpenAI Compatible" module.',
      'Set the Custom Base URL endpoint to: https://galx.ai/v1',
      'Save connection and select your preferred wholesale model.'
    ],
    configSnippet: `// No-Code Webhook / Custom Provider Config
Provider: Custom OpenAI Compatible
Endpoint: https://galx.ai/v1/chat/completions
Headers:  Authorization: Bearer galx_live_your_key_here`,
    copyLabel: 'Copy No-Code Headers'
  },
  {
    id: 'python',
    name: 'Python (1-Line Drop-in)',
    category: 'Standard Backend',
    icon: Code2,
    stepTitle: 'Drop into your existing OpenAI Python Code',
    instructions: [
      'Install or use the standard openai package (no new dependencies).',
      'Set base_url="https://galx.ai/v1" and api_key="galx_live_...".',
      'Run your inference with 25%–40% instant wholesale savings.'
    ],
    configSnippet: `from openai import OpenAI

# 100% Drop-in: Zero code rewrite required
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="galx_live_your_key_here"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Analyze quarterly financials"}]
)
print(response.choices[0].message.content)`,
    copyLabel: 'Copy Python Code'
  },
  {
    id: 'node',
    name: 'Node.js / TypeScript',
    category: 'Full-Stack Apps',
    icon: Bot,
    stepTitle: 'Drop into your Next.js or Node.js Backend',
    instructions: [
      'Use the standard npm install openai client.',
      'Initialize with baseURL: "https://galx.ai/v1".',
      'Execute completions with sub-15ms automated anycast routing.'
    ],
    configSnippet: `import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://galx.ai/v1',
  apiKey: process.env.GALX_API_KEY, // galx_live_...
});

const completion = await openai.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Generate executive summary' }],
});`,
    copyLabel: 'Copy TypeScript Code'
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
