'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';
import {
  Zap,
  Rocket,
  Shield,
  Key,
  Terminal,
  Code2,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Activity,
  CreditCard,
  Lock,
  GitCompare,
  Swords,
  Server,
  Globe,
  Coins,
  Copy,
  Check,
  Flame,
  Award,
  Clock,
  Laptop,
  TrendingDown,
  Building2,
  DollarSign,
  Star
} from 'lucide-react';
import { ShareButton } from '@/components/common/ShareButton';

export default function HomePage() {
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'python' | 'node' | 'cursor' | 'continue' | 'curl'>('python');
  const [copied, setCopied] = useState(false);
  const [monthlySpendInput, setMonthlySpendInput] = useState(1500);

  useEffect(() => {
    fetch('/api/pool/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {});
  }, []);

  const featuredModels = EXCLUSIVE_MODEL_CATALOG.filter(m => m.category === 'llm');
  const imageModels = EXCLUSIVE_MODEL_CATALOG.filter(m => m.category === 'image');

  const estimatedSavings = Math.round(monthlySpendInput * 0.32);
  const annualizedSavings = estimatedSavings * 12;

  const codeSnippets: Record<string, string> = {
    python: `from openai import OpenAI

# 1-Line Drop-in Switch (Saves 25%-40% on every token)
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_..."  # Claim your $5 free key
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Explain quantum computing."}]
)
print(response.choices[0].message.content)`,
    node: `import OpenAI from 'openai';

// 100% Drop-in replacement for standard OpenAI SDK
const client = new OpenAI({
  baseURL: 'https://api.galx.ai/v1',
  apiKey: process.env.GALXAI_API_KEY
});

const completion = await client.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Write a quicksort in Rust.' }],
  stream: true
});`,
    cursor: `// In Cursor IDE / Windsurf Settings -> Models -> OpenAI API Key:
// 1. Set Override Base URL:
https://api.galx.ai/v1

// 2. Set API Key:
galx_live_your_key_here

// 3. Add Custom Models:
gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna, x-ai/grok-4.5`,
    continue: `{
  "models": [
    {
      "title": "GALXAI GPT-5.6 Sol",
      "provider": "openai",
      "model": "gpt-5.6-sol",
      "apiBase": "https://api.galx.ai/v1",
      "apiKey": "galx_live_..."
    }
  ]
}`,
    curl: `curl https://api.galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer galx_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Hello GALXAI!"}],
    "stream": true
  }'`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-16">
        {/* Hero Section with Aggressive GTM Value Hook */}
        <section className="glass-panel rounded-3xl p-6 sm:p-14 relative overflow-hidden text-center space-y-6 border border-amber-500/20 shadow-2xl">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

          {/* Live GTM Free Credit Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-xs font-mono font-bold text-emerald-300 shadow-lg shadow-emerald-500/10">
            <Flame className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            <span>CLAIM $5 FREE COMPUTE CREDIT • NO CREDIT CARD REQUIRED • 25%–40% INSTANT SAVINGS</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Cut Your AI Token Bills by <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">25% to 40%</span>. Guaranteed.
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mx-auto">
              Stop paying retail prices or aggregator markup fees. GALXAI delivers enterprise-grade inference with <strong className="text-amber-300 font-bold">sub-15ms automated failover</strong>, <strong className="text-cyan-300 font-bold">75% prompt caching</strong>, and zero code changes.
            </p>
          </div>

          {/* Aggressive High-Converting CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/keys/new"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 flex items-center gap-2 hover:scale-[1.03] active:scale-98 transition-all cursor-pointer"
            >
              <Key className="w-4 h-4 text-black" />
              <span>Claim Your $5 Free API Key Now</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>

            <Link
              href="/playground"
              className="px-6 py-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/15 text-white font-bold text-xs uppercase tracking-wider shadow-md flex items-center gap-2 transition-all hover:border-white/30 cursor-pointer"
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Try in Sandbox (No Auth Needed)</span>
            </Link>

            <ShareButton
              variant="pill"
              label="Share GALXAI"
              className="py-3.5 px-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold"
            />
          </div>

          {/* Social Proof & Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 max-w-3xl mx-auto border-t border-white/10 font-mono text-xs">
            <div className="space-y-0.5">
              <span className="text-zinc-400 text-[10px] uppercase">Routing Latency</span>
              <div className="text-white font-bold text-sm">&lt; 1ms Gateway Overhead</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-zinc-400 text-[10px] uppercase">Service Uptime</span>
              <div className="text-emerald-400 font-bold text-sm">99.99% Enterprise SLA</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-zinc-400 text-[10px] uppercase">Prompt Caching</span>
              <div className="text-cyan-400 font-bold text-sm">75% Automatic Rebate</div>
            </div>
            <div className="space-y-0.5">
              <span className="text-zinc-400 text-[10px] uppercase">Guaranteed Savings</span>
              <div className="text-amber-400 font-bold text-sm">25% to 40% OFF Retail</div>
            </div>
          </div>
        </section>

        {/* Aggressive Competitor Comparison Ribbon */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-emerald-500/30">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <div className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center justify-center md:justify-start gap-1.5">
                <TrendingDown className="w-4 h-4" />
                <span>Market Disruptor Pricing vs. Competitors</span>
              </div>
              <h2 className="text-lg font-bold text-white">Why Pay Full Retail or Aggregator Surcharges?</h2>
            </div>
            <Link
              href="/pricing"
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all font-mono"
            >
              <span>View Full Pricing Matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs pt-2">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase">Direct OpenAI List</span>
              <div className="text-base font-bold text-zinc-400 line-through">$5.00 / 1M tokens</div>
              <span className="text-[10px] text-zinc-500">Retail rate • Single key rate limits</span>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[10px] text-red-400 uppercase">Standard Gateways (OpenRouter)</span>
              <div className="text-base font-bold text-zinc-400 line-through">$5.25 / 1M tokens</div>
              <span className="text-[10px] text-red-400">+5% Extra routing fee markup</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 space-y-1">
              <span className="text-[10px] text-emerald-400 uppercase font-bold">GALXAI Universal Gateway</span>
              <div className="text-lg font-black text-emerald-300">$3.75 / 1M tokens</div>
              <span className="text-[10px] text-emerald-400 font-bold">Save 25% Instant • 0% Markup</span>
            </div>
          </div>
        </section>

        {/* 1-Line Drop-in Interactive Migration Widget */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                <Code2 className="w-3 h-3" />
                <span>100% OPENAI SDK COMPATIBLE</span>
              </div>
              <h2 className="text-xl font-bold text-white">Switch in 30 Seconds with Zero Code Changes</h2>
              <p className="text-xs text-zinc-400">Simply update your `baseURL` and API key to start saving 25%–40% on every completion.</p>
            </div>

            {/* Language / IDE Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/50 border border-white/10 text-xs font-mono">
              {(['python', 'node', 'cursor', 'continue', 'curl'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'bg-amber-400 text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab === 'cursor' ? 'Cursor / Windsurf' : tab === 'continue' ? 'Continue.dev' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Code Viewer Box */}
          <div className="relative rounded-2xl bg-black/80 border border-white/10 p-5 font-mono text-xs overflow-hidden">
            <button
              onClick={handleCopy}
              className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all text-[11px] cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>
            <pre className="text-zinc-300 overflow-x-auto pr-24 leading-relaxed font-mono">
              {codeSnippets[activeTab]}
            </pre>
          </div>
        </section>

        {/* Interactive Monthly Savings Estimator */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-amber-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                Estimate Your Team's Monthly Savings
              </h2>
              <p className="text-xs text-zinc-400">See how many thousands of dollars you keep by routing traffic through GALXAI.</p>
            </div>
            <div className="text-right font-mono">
              <span className="text-[10px] text-zinc-500 uppercase">Estimated Annualized ROI</span>
              <div className="text-xl font-black text-emerald-400">+${annualizedSavings.toLocaleString()} / yr Saved</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">Your Current Monthly OpenAI / LLM Spend:</span>
                <span className="text-amber-300 font-bold text-sm">${monthlySpendInput.toLocaleString()} / month</span>
              </div>
              <input
                type="range"
                min="100"
                max="25000"
                step="100"
                value={monthlySpendInput}
                onChange={(e) => setMonthlySpendInput(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>$100 / mo</span>
                <span>$5,000 / mo</span>
                <span>$10,000 / mo</span>
                <span>$25,000+ / mo</span>
              </div>
            </div>

            <div className="lg:col-span-5 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold">You Keep in Pocket</span>
                <div className="text-2xl font-black text-emerald-300 font-mono">
                  ${estimatedSavings.toLocaleString()} <span className="text-xs text-emerald-400">/ mo</span>
                </div>
                <p className="text-[10px] text-zinc-400">Based on 32% blended wholesale arbitrage + prompt cache rebate.</p>
              </div>

              <Link
                href="/keys/new"
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider shrink-0 transition-all font-mono"
              >
                Claim Key →
              </Link>
            </div>
          </div>
        </section>

        {/* 3 Simple Visual Steps for Non-Technical & Technical Users */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-white">How GALXAI Works in 3 Simple Steps</h2>
            <p className="text-xs text-zinc-400">No complex cloud architecture to manage. Get started in under 1 minute.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-mono font-bold text-sm">
                01
              </div>
              <h3 className="text-base font-bold text-white">Generate Your Gateway Key</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Sign up in 1 click and receive an instant live developer key (`galx_live_...`) pre-loaded with $5 in free compute credits.
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm">
                02
              </div>
              <h3 className="text-base font-bold text-white">Paste into Your App or IDE</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Point your existing OpenAI Python/Node client or Cursor IDE to `https://api.galx.ai/v1`. Zero syntax refactoring required.
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
                03
              </div>
              <h3 className="text-base font-bold text-white">Enjoy Sub-15ms Failover & Savings</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Your requests are automatically routed with enterprise-grade reliability, saving 25%–40% on every token with 99.99% uptime.
              </p>
            </div>
          </div>
        </section>

        {/* Featured Flagship Reasoning Suite */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                Flagship Reasoning & LLM Fleet
              </h2>
              <p className="text-xs text-zinc-400">Direct wholesale rates across OpenAI and xAI Grok flagship engines.</p>
            </div>
            <Link href="/models" className="text-xs text-cyan-400 hover:text-cyan-300 font-mono font-semibold flex items-center gap-1">
              <span>View All 12 Models</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredModels.map((m) => {
              const isGrok = m.provider === 'xai-grok';
              return (
                <div key={m.id} className="glass-panel rounded-3xl p-6 flex flex-col justify-between space-y-4 border border-white/10 hover:border-indigo-500/30 transition-all group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isGrok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {isGrok ? <Rocket className="w-4 h-4" /> : <Zap className="w-4 h-4 fill-amber-400" />}
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                        -{m.discountPercentage}% OFF
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white font-mono group-hover:text-cyan-300 transition-colors">{m.id}</h3>
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{m.description}</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5 font-mono text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Context:</span>
                      <span className="text-white font-bold">{(m.contextWindowTokens / 1000).toLocaleString()}K tokens</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>GALXAI Rate:</span>
                      <span className="text-emerald-300 font-bold">${m.inputPricePer1M.toFixed(2)} in / ${m.outputPricePer1M.toFixed(2)} out</span>
                    </div>
                    <Link
                      href={`/playground?model=${m.id}`}
                      className="w-full mt-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span>Test in Playground</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Visual Synthesis Suite Preview */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Visual Synthesis & Diffusion Fleet
              </h2>
              <p className="text-xs text-zinc-400">High-resolution image generation powered by OpenAI GPT-Image-2, DALL-E 3, and xAI Grok Imagine.</p>
            </div>
            <Link href="/models" className="text-xs text-cyan-400 hover:text-cyan-300 font-mono font-semibold flex items-center gap-1">
              <span>View All 8 Image Engines</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {imageModels.slice(0, 4).map((m) => (
              <div key={m.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 hover:border-white/15 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono line-clamp-1">{m.id}</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">-{m.discountPercentage}%</span>
                </div>
                <div className="text-xs text-zinc-400 font-mono">
                  ${m.inputPricePer1M.toFixed(3)} <span className="text-[10px] text-zinc-500">/ image</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
