'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import {
  Key,
  Sparkles,
  Check,
  Copy,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Flame,
  Terminal,
  Code2,
  Laptop,
  ArrowRight,
  Zap
} from 'lucide-react';

export default function CreateKeyPage() {
  const router = useRouter();
  const [name, setName] = useState('Default Development Key');
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(120);
  const [createdSecretKey, setCreatedSecretKey] = useState<string | null>(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'python' | 'node' | 'cursor' | 'continue' | 'curl'>('python');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          rateLimitPerMinute: Number(rateLimitPerMinute)
        })
      });
      const data = await res.json();
      if (data.success && data.key?.apiKey) {
        setCreatedSecretKey(data.key.apiKey);
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (!createdSecretKey) return;
    navigator.clipboard.writeText(createdSecretKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getSnippets = (k: string) => ({
    python: `from openai import OpenAI

# Drop-in replacement for OpenAI SDK (25%-40% discount)
client = OpenAI(
    base_url="https://api.galxai.com/v1",
    api_key="${k}"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Explain algorithmic game theory."}]
)
print(response.choices[0].message.content)`,
    node: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://api.galxai.com/v1',
  apiKey: '${k}'
});

const response = await client.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Write a LRU cache in Rust.' }],
  stream: true
});`,
    cursor: `// In Cursor IDE / Windsurf Settings -> Models -> OpenAI API Key:
// 1. Set Override Base URL:
https://api.galxai.com/v1

// 2. Set API Key:
${k}

// 3. Available Models:
gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna, x-ai/grok-4.5`,
    continue: `{
  "models": [
    {
      "title": "GALXAI GPT-5.6 Sol",
      "provider": "openai",
      "model": "gpt-5.6-sol",
      "apiBase": "https://api.galxai.com/v1",
      "apiKey": "${k}"
    }
  ]
}`,
    curl: `curl https://api.galxai.com/v1/chat/completions \\
  -H "Authorization: Bearer ${k}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Hello GALXAI!"}]
  }'`
  });

  const handleCopySnippet = () => {
    if (!createdSecretKey) return;
    const snippets = getSnippets(createdSecretKey);
    navigator.clipboard.writeText(snippets[activeSnippetTab]);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'API Keys', href: '/keys' },
            { label: 'Create Gateway Key' }
          ]}
        />

        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold mb-2">
              <Flame className="w-3.5 h-3.5" />
              <span>INCLUDES $5 FREE INSTANT COMPUTE CREDIT • ZERO MINIMUMS</span>
            </div>
            <h1 className="text-2xl font-black text-white">Create Developer Gateway Key</h1>
            <p className="text-xs text-zinc-400">
              Generate a unified <code className="text-cyan-300 font-mono">galx_live_...</code> client token for use in OpenAI client SDKs, Cursor IDE, and agentic workflows.
            </p>
          </div>

          {createdSecretKey ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Key Box */}
              <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/40 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Your Key is Ready & Activated</h2>
                      <p className="text-xs text-emerald-300 font-mono">$5 free welcome credit loaded • Ready for requests</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                    Active
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-black/70 font-mono text-xs text-emerald-300 flex items-center justify-between gap-3 break-all border border-emerald-500/30">
                  <span className="select-all">{createdSecretKey}</span>
                  <button
                    onClick={handleCopyKey}
                    className="p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-sans font-bold"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>
              </div>

              {/* Pre-Populated 1-Click Code Snippet Generator */}
              <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-cyan-400" />
                      Instant Setup Snippet (Pre-Filled with Your Key)
                    </h3>
                    <p className="text-xs text-zinc-400">Select your tool or SDK to copy the drop-in configuration.</p>
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-xl bg-black/50 border border-white/10 text-xs font-mono">
                    {(['python', 'node', 'cursor', 'continue', 'curl'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveSnippetTab(tab)}
                        className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                          activeSnippetTab === tab
                            ? 'bg-amber-400 text-black font-bold shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {tab === 'cursor' ? 'Cursor IDE' : tab === 'continue' ? 'Continue.dev' : tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative rounded-2xl bg-black/80 border border-white/10 p-4 font-mono text-xs overflow-hidden">
                  <button
                    onClick={handleCopySnippet}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all text-[11px] cursor-pointer"
                  >
                    {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet ? 'Copied Snippet!' : 'Copy Snippet'}</span>
                  </button>
                  <pre className="text-zinc-300 overflow-x-auto pr-24 leading-relaxed font-mono">
                    {getSnippets(createdSecretKey)[activeSnippetTab]}
                  </pre>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                <Link
                  href="/keys"
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
                >
                  ← Back to All Keys
                </Link>

                <div className="flex items-center gap-3">
                  <Link
                    href="/playground"
                    className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Test in Playground</span>
                  </Link>

                  <Link
                    href="/docs/quickstart"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                  >
                    <span>View Quickstart Guide</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                  Key Label / Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cursor IDE, Production API, Agent Bot"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full py-3 px-4 rounded-2xl bg-black/40 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                  Rate Limit (Requests per Minute)
                </label>
                <select
                  value={rateLimitPerMinute}
                  onChange={(e) => setRateLimitPerMinute(Number(e.target.value))}
                  className="w-full py-3 px-4 rounded-2xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors font-mono"
                >
                  <option value={60} className="bg-zinc-900 text-white">60 RPM (Standard Prototyping)</option>
                  <option value={120} className="bg-zinc-900 text-white">120 RPM (Recommended Developer)</option>
                  <option value={300} className="bg-zinc-900 text-white">300 RPM (High-Throughput)</option>
                  <option value={600} className="bg-zinc-900 text-white">600 RPM (Production Fleet)</option>
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Includes $5 free compute credit automatically on creation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Drop-in OpenAI SDK and Cursor compatibility</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Instant 1-click revocation from dashboard at any time</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Link
                  href="/keys"
                  className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-semibold transition-all"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <span>Minting Key...</span>
                  ) : (
                    <>
                      <Key className="w-4 h-4 text-black" />
                      <span>Mint Live Key</span>
                      <ArrowRight className="w-4 h-4 text-black" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
