'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Code2,
  Copy,
  Check,
  CheckCircle2,
  Zap,
  Terminal,
  ArrowRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';

export default function PythonSdkDocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const snippets = {
    asyncio: `import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI(
    base_url="https://api.galxai.com/v1",
    api_key="galx_live_your_gateway_key"
)

async def generate_summary(prompt: str):
    response = await client.chat.completions.create(
        model="gpt-5.6-sol",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

async def main():
    prompts = ["Analyze system architecture", "Write unit tests", "Optimize query performance"]
    results = await asyncio.gather(*(generate_summary(p) for p in prompts))
    for r in results:
        print("--- SUMMARY ---")
        print(r)

asyncio.run(main())`,
    pydantic: `from openai import OpenAI
from pydantic import BaseModel, Field
from typing import List

class ArchitectureReview(BaseModel):
    summary: str = Field(description="Executive summary of the technical review")
    vulnerabilities: List[str] = Field(description="Identified bottlenecks or risks")
    score: int = Field(description="System health score from 1 to 100")

client = OpenAI(
    base_url="https://api.galxai.com/v1",
    api_key="galx_live_your_gateway_key"
)

completion = client.beta.chat.completions.parse(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Review this distributed KV-store design."}],
    response_format=ArchitectureReview
)

review: ArchitectureReview = completion.choices[0].message.parsed
print(f"Health Score: {review.score}/100")
print(f"Vulnerabilities: {review.vulnerabilities}")`,
    pooling: `from openai import OpenAI
import httpx

# High-concurrency connection pooling for high-throughput production backends
http_client = httpx.Client(
    limits=httpx.Limits(max_keepalive_connections=100, max_connections=500),
    timeout=httpx.Timeout(connect=5.0, read=60.0, write=5.0, pool=5.0)
)

client = OpenAI(
    base_url="https://api.galxai.com/v1",
    api_key="galx_live_your_gateway_key",
    http_client=http_client
)`
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'SDKs', href: '/docs/sdks' },
            { label: 'Python SDK Deep Dive' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Python SDK Deep Dive & Production Recipes</h1>
            <p className="text-xs text-zinc-400">
              High-concurrency asyncio, Pydantic structured output validation, and custom HTTPX connection pooling.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold">
              openai &gt;= 1.0.0 COMPATIBLE
            </span>
          </div>
        </div>

        <DocsSubNav />

        {/* Section 1: AsyncIO */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              1. Concurrent AsyncIO Inference Pipeline
            </h2>
            <button
              onClick={() => handleCopy(snippets.asyncio, 'asyncio')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5"
            >
              {copiedSection === 'asyncio' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'asyncio' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-cyan-300 border border-white/5 overflow-x-auto">
            <code>{snippets.asyncio}</code>
          </pre>
        </div>

        {/* Section 2: Pydantic Structured Outputs */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              2. Guaranteed Pydantic Structured Outputs
            </h2>
            <button
              onClick={() => handleCopy(snippets.pydantic, 'pydantic')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5"
            >
              {copiedSection === 'pydantic' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'pydantic' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-amber-300 border border-white/5 overflow-x-auto">
            <code>{snippets.pydantic}</code>
          </pre>
        </div>

        {/* Section 3: Connection Pooling */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              3. HTTPX Connection Pooling & Custom Timeouts
            </h2>
            <button
              onClick={() => handleCopy(snippets.pooling, 'pooling')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5"
            >
              {copiedSection === 'pooling' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'pooling' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-emerald-300 border border-white/5 overflow-x-auto">
            <code>{snippets.pooling}</code>
          </pre>
        </div>
      </main>
    </div>
  );
}
