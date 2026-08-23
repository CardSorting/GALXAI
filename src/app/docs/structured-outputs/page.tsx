'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  Sparkles,
  Code2,
  Copy,
  Check,
  CheckCircle2,
  Zap,
  Terminal,
  ArrowRight,
  ShieldCheck,
  Flame,
  Layers,
  FileCode2
} from 'lucide-react';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';

export default function StructuredOutputsDocsPage() {
  const [activeTab, setActiveTab] = useState<'pydantic' | 'zod' | 'vercel' | 'raw'>('pydantic');
  const [copiedKey, setCopiedKey] = useState(false);

  const recipes = {
    pydantic: {
      title: 'Python + Pydantic (openai>=1.50.0)',
      code: `from openai import OpenAI
from pydantic import BaseModel, Field
from typing import List

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)

class ProductCatalog(BaseModel):
    product_name: str = Field(description="Name of the software or hardware tool")
    pricing_tier: str = Field(description="Monthly or annual price string")
    key_features: List[str] = Field(description="Top 3 core capabilities")
    enterprise_ready: bool

# Guaranteed 100% Schema Compliance with 0 hallucinations
completion = client.beta.chat.completions.parse(
    model="gpt-5.6-sol",
    messages=[
        {"role": "system", "content": "Extract structured product catalog specifications."},
        {"role": "user", "content": "Acme AI Gateway costs $25/mo with sub-15ms TTFT, prompt caching, and zero data retention for enterprise scale."}
    ],
    response_format=ProductCatalog
)

product: ProductCatalog = completion.choices[0].message.parsed
print(f"Product: {product.product_name} | Enterprise: {product.enterprise_ready}")`
    },
    zod: {
      title: 'TypeScript + Zod (openai/helpers/zod)',
      code: `import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const client = new OpenAI({
  baseURL: "https://api.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY || "galx_live_your_gateway_key",
});

const ExtractionSchema = z.object({
  user_id: z.string(),
  intent: z.enum(["billing_inquiry", "bug_report", "feature_request"]),
  urgency_score: z.number().min(1).max(5),
  action_items: z.array(z.string()),
});

const completion = await client.beta.chat.completions.parse({
  model: "gpt-5.6-sol",
  messages: [
    { role: "system", content: "Extract support ticket classification." },
    { role: "user", content: "Our production cluster timed out on query #4492! We need this fixed ASAP." }
  ],
  response_format: zodResponseFormat(ExtractionSchema, "support_ticket"),
});

const ticket = completion.choices[0].message.parsed;
console.log("Classified Intent:", ticket?.intent);`
    },
    vercel: {
      title: 'Next.js & Vercel AI SDK (generateObject)',
      code: `import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const galxai = openai({
  baseURL: "https://api.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY,
});

export async function POST(req: Request) {
  const { resumeText } = await req.json();

  const { object: candidate } = await generateObject({
    model: galxai("gpt-5.6-sol"),
    schema: z.object({
      fullName: z.string(),
      yearsExperience: z.number(),
      skills: z.array(z.string()),
      verifiedMatches: z.array(z.string()),
    }),
    prompt: \`Extract candidate profile from resume:\\n\${resumeText}\`,
  });

  return Response.json({ candidate });
}`
    },
    raw: {
      title: 'Raw REST API JSON Schema (cURL)',
      code: `curl https://api.galx.ai/v1/chat/completions \\
  -H "Authorization: Bearer galx_live_your_gateway_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [
      {"role": "system", "content": "Extract entity data."},
      {"role": "user", "content": "Acme Corp is located in San Francisco with 450 employees."}
    ],
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "company_profile",
        "strict": true,
        "schema": {
          "type": "object",
          "properties": {
            "companyName": { "type": "string" },
            "headquarters": { "type": "string" },
            "employeeCount": { "type": "integer" }
          },
          "required": ["companyName", "headquarters", "employeeCount"],
          "additionalProperties": false
        }
      }
    }
  }'`
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
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
            { label: 'API & Cookbooks', href: '/docs/api-reference' },
            { label: 'Guaranteed Structured Outputs' }
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% SCHEMA ADHERENCE GUARANTEE</span>
            </div>
            <Link
              href="/keys/new"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase font-mono tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Get Live Key</span>
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Guaranteed Structured JSON Outputs Guide</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-sans">
            Enforce 100% adherence to complex JSON Schemas, Pydantic models, and Zod definitions with zero missing keys, zero syntax errors, and zero hallucinations.
          </p>
        </div>

        <DocsSubNav />

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-emerald-500/30 bg-emerald-500/5">
            <span className="text-emerald-400 text-[10px] uppercase font-sans font-semibold">Schema Adherence</span>
            <div className="text-2xl font-black text-emerald-300">100.0% Guaranteed</div>
            <div className="text-[11px] text-emerald-400 font-sans">Constrained decoding at token generation</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-cyan-500/30 bg-cyan-500/5">
            <span className="text-cyan-400 text-[10px] uppercase font-sans font-semibold">Parser Support</span>
            <div className="text-2xl font-black text-cyan-300">Zod &amp; Pydantic</div>
            <div className="text-[11px] text-cyan-400 font-sans">Native SDK client helper integration</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
            <span className="text-zinc-500 text-[10px] uppercase font-sans">Output Integrity</span>
            <div className="text-2xl font-black text-white">Zero Missing Keys</div>
            <div className="text-[11px] text-zinc-400 font-sans">Strict JSON syntax guaranteed</div>
          </div>
        </div>

        {/* Tabbed Recipes Workbench */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4 font-mono text-xs">
            {(['pydantic', 'zod', 'vercel', 'raw'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl font-bold uppercase transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab === 'pydantic' ? '🐍 Python (Pydantic)' : tab === 'zod' ? '▲ TypeScript (Zod)' : tab === 'vercel' ? '⚡ Vercel AI SDK' : '💻 Raw JSON Schema (cURL)'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>{recipes[activeTab].title}</span>
              </h2>

              <button
                onClick={() => handleCopy(recipes[activeTab].code)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all text-xs cursor-pointer font-sans"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'Copied Recipe!' : 'Copy Recipe'}</span>
              </button>
            </div>

            <div className="relative rounded-2xl bg-black/80 border border-white/10 p-5 font-mono text-xs overflow-hidden">
              <pre className="text-amber-300 overflow-x-auto leading-relaxed">
                {recipes[activeTab].code}
              </pre>
            </div>
          </div>
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
