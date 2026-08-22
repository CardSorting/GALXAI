'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  FileCode2,
  Copy,
  Check,
  CheckCircle2,
  Zap,
  Terminal,
  ArrowRight,
  ShieldCheck,
  Code2
} from 'lucide-react';

export default function TypeScriptSdkDocsPage() {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const snippets = {
    zod: `import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const BugReportSchema = z.object({
  title: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  rootCause: z.string(),
  reproductionSteps: z.array(z.string()),
  suggestedPatch: z.string()
});

const client = new OpenAI({
  baseURL: 'https://api.galxai.com/v1',
  apiKey: process.env.GALXAI_API_KEY
});

const completion = await client.beta.chat.completions.parse({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Analyze this stacktrace memory leak.' }],
  response_format: zodResponseFormat(BugReportSchema, 'bug_report')
});

const report = completion.choices[0].message.parsed;
console.log('Severity:', report?.severity);
console.log('Suggested Patch:', report?.suggestedPatch);`,
    vercelAi: `import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Vercel AI SDK Provider instance pointed at GALXAI
const galxai = createOpenAI({
  baseURL: 'https://api.galxai.com/v1',
  apiKey: process.env.GALXAI_API_KEY
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: galxai('gpt-5.6-sol'),
    messages
  });

  return result.toDataStreamResponse();
}`,
    bun: `import OpenAI from 'openai';

// 100% Native support in Node.js, Bun, Deno, and Cloudflare Workers
const client = new OpenAI({
  baseURL: 'https://api.galxai.com/v1',
  apiKey: Bun.env.GALXAI_API_KEY
});

const stream = await client.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Write a high-throughput HTTP server in Bun.' }],
  stream: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTab(id);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'SDKs', href: '/docs/sdks' },
            { label: 'TypeScript & Node.js SDK Deep Dive' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">TypeScript & Node.js SDK Deep Dive</h1>
            <p className="text-xs text-zinc-400">
              Type-safe Zod schema parsing, Vercel AI SDK integration, and zero-dependency Bun / Deno / Cloudflare Workers support.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold">
              TYPESCRIPT 5.0+ READY
            </span>
          </div>
        </div>

        <DocsSubNav />

        {/* Section 1: Zod Schema */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              1. Type-Safe Zod Structured Outputs (zodResponseFormat)
            </h2>
            <button
              onClick={() => handleCopy(snippets.zod, 'zod')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5"
            >
              {copiedTab === 'zod' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTab === 'zod' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-cyan-300 border border-white/5 overflow-x-auto">
            <code>{snippets.zod}</code>
          </pre>
        </div>

        {/* Section 2: Vercel AI SDK */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              2. Vercel AI SDK Integration (Next.js 15 App Router)
            </h2>
            <button
              onClick={() => handleCopy(snippets.vercelAi, 'vercelAi')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5"
            >
              {copiedTab === 'vercelAi' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTab === 'vercelAi' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-amber-300 border border-white/5 overflow-x-auto">
            <code>{snippets.vercelAi}</code>
          </pre>
        </div>

        {/* Section 3: Bun & Edge Runtimes */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              3. Bun, Deno & Edge Runtime Streaming
            </h2>
            <button
              onClick={() => handleCopy(snippets.bun, 'bun')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5"
            >
              {copiedTab === 'bun' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTab === 'bun' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-emerald-300 border border-white/5 overflow-x-auto">
            <code>{snippets.bun}</code>
          </pre>
        </div>
      </main>
    </div>
  );
}
