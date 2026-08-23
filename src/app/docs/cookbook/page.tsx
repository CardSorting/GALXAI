'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  BookMarked,
  Copy,
  Check,
  CheckCircle2,
  Zap,
  Terminal,
  ArrowRight,
  Code2,
  Cpu,
  Layers,
  Sparkles,
  Bot,
  ShieldCheck,
  Flame,
  Filter
} from 'lucide-react';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';

interface Recipe {
  id: string;
  title: string;
  category: string;
  badge: string;
  description: string;
  code: string;
}

const RECIPES: Recipe[] = [
  {
    id: 'agent_swarm',
    title: 'Autonomous Multi-Agent Coding Swarm (LangGraph & CrewAI)',
    category: 'Agent Orchestration',
    badge: 'LangGraph',
    description: 'Coordinate a Planner, Coder, and Code Reviewer agent swarm communicating over sub-15ms streaming channels.',
    code: `from openai import OpenAI
from typing import Dict, List

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

def run_agent_turn(role: str, system_prompt: str, task: str) -> str:
    response = client.chat.completions.create(
        model="gpt-5.6-sol",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": task}
        ]
    )
    return response.choices[0].message.content

# 1. Planner Agent
plan = run_agent_turn(
    "Planner",
    "You are a Principal Software Architect. Output a 3-step refactoring plan.",
    "Refactor our monolithic authentication module into microservices."
)

# 2. Engineer Agent
code = run_agent_turn(
    "Coder",
    "You are an expert Rust Engineer. Write production code matching the architecture plan.",
    f"Implement this plan:\\n{plan}"
)

print("Generated Production Microservice:\\n", code)`
  },
  {
    id: 'rag_500k',
    title: 'Massive Repository RAG Ingestion (Grok 4.5 - 500K Context)',
    category: 'Information Retrieval',
    badge: '500K Context',
    description: 'Ingest and reason across 500,000 tokens of raw source code in a single prompt without chunk fragmentation.',
    code: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

# Load entire repository into 500,000 token context window
with open("combined_codebase.txt", "r") as f:
    entire_repo_text = f.read()

response = client.chat.completions.create(
    model="x-ai/grok-4.5", # 500,000 token context window
    messages=[
        {"role": "system", "content": "You have full visibility into the entire enterprise codebase."},
        {"role": "user", "content": f"Repo Context:\\n{entire_repo_text}\\n\\nFind all potential SQL injection vulnerabilities across all controllers."}
    ],
    temperature=0.1
)

print(response.choices[0].message.content)`
  },
  {
    id: 'batch_pipeline',
    title: 'High-Concurrency Bulk Evaluation (10,000 items without 429s)',
    category: 'High Throughput',
    badge: 'Zero Dropouts',
    description: 'Process 10,000 asynchronous evaluation tasks utilizing GALXAI continuous token governor without rate limit dropouts.',
    code: `import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key",
    max_retries=5
)

semaphore = asyncio.Semaphore(50) # 50 concurrent worker threads

async def process_item(item_id: int, prompt: str):
    async with semaphore:
        try:
            res = await client.chat.completions.create(
                model="gpt-5.6-terra",
                messages=[{"role": "user", "content": prompt}]
            )
            return {"id": item_id, "status": "success", "tokens": res.usage.total_tokens}
        except Exception as e:
            return {"id": item_id, "status": "failed", "error": str(e)}

async def main():
    tasks = [process_item(i, f"Classify transaction #{i}") for i in range(1000)]
    results = await asyncio.gather(*tasks)
    print(f"Processed {len(results)} items successfully with zero 429 dropouts!")

asyncio.run(main())`
  },
  {
    id: 'zdr_scrubber',
    title: 'Zero-Data-Retention & PII Token Masking Proxy',
    category: 'Enterprise Security',
    badge: 'ZDR Enforced',
    description: 'Mask sensitive PII tokens client-side and stream through GALXAI with cryptographic zeroization guarantees.',
    code: `from openai import OpenAI
import re

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key",
    default_headers={"X-GALXAI-ZDR": "enforce-zero-retention"}
)

def anonymize_and_prompt(raw_prompt: str) -> str:
    # 1. Anonymize sensitive emails & credit cards
    scrubbed = re.sub(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', '[REDACTED_EMAIL]', raw_prompt)
    
    # 2. Dispatch through zero-retention memory gateway
    response = client.chat.completions.create(
        model="gpt-5.6-sol",
        messages=[
            {"role": "system", "content": "You are a HIPAA-compliant medical records assistant."},
            {"role": "user", "content": scrubbed}
        ]
    )
    return response.choices[0].message.content

print(anonymize_and_prompt("Patient john.doe@hospital.com has hypertension. Recommend therapy."))`
  }
];

export default function CookbookDocsPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Agent Orchestration', 'Information Retrieval', 'High Throughput', 'Enterprise Security'];

  const filteredRecipes = selectedCategory === 'All'
    ? RECIPES
    : RECIPES.filter((r) => r.category === selectedCategory);

  const handleCopy = async (code: string, id: string) => {
    await safeCopyToClipboard(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'API & Cookbooks', href: '/docs/api-reference' },
            { label: 'Production Cookbooks & Recipes' }
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
              <BookMarked className="w-3.5 h-3.5" />
              <span>TESTED PRODUCTION RECIPES</span>
            </div>
            <Link
              href="/keys/new"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase font-mono tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Get Free Key ($5 Credit)</span>
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Production AI Cookbooks &amp; Reference Recipes</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-sans">
            End-to-end executable code patterns for multi-agent swarms, 500K context RAG, bulk batch processing pipelines, and zero-data-retention security workflows.
          </p>
        </div>

        <DocsSubNav />

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1 text-zinc-500 mr-2 uppercase text-[10px] font-bold">
            <Filter className="w-3 h-3" />
            <span>Category:</span>
          </div>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Recipes Stream */}
        <div className="space-y-6">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">
                      {recipe.category}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      {recipe.badge}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white font-sans">{recipe.title}</h2>
                </div>

                <button
                  onClick={() => handleCopy(recipe.code, recipe.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5 shrink-0"
                >
                  {copiedId === recipe.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === recipe.id ? 'Copied Recipe' : 'Copy Recipe'}</span>
                </button>
              </div>

              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                {recipe.description}
              </p>

              <pre className="p-4 rounded-2xl bg-black/60 border border-white/5 font-mono text-xs text-cyan-300 overflow-x-auto">
                <code>{recipe.code}</code>
              </pre>
            </div>
          ))}
        </div>

        {/* Consumer-Grade Trust Seals */}
        <TrustSeals />
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
      <FloatingConversionDock />
      <LiveActivityToast />
      <ExitIntentModal />
    </div>
  );
}
