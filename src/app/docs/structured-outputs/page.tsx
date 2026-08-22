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
  ShieldCheck
} from 'lucide-react';

export default function StructuredOutputsDocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const rawJsonSnippet = `curl https://api.galxai.com/v1/chat/completions \\
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
  }'`;

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
            { label: 'API & Cookbooks', href: '/docs/api-reference' },
            { label: 'Guaranteed Structured Outputs' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Guaranteed Structured JSON Outputs Guide</h1>
            <p className="text-xs text-zinc-400">
              Enforce 100% adherence to complex JSON Schemas, Pydantic classes, and Zod types with zero hallucinations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% SCHEMA COMPLIANCE</span>
            </span>
          </div>
        </div>

        <DocsSubNav />

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-emerald-500/30 bg-emerald-500/5">
            <span className="text-emerald-400 text-[10px] uppercase font-sans font-semibold">Schema Adherence</span>
            <div className="text-2xl font-black text-emerald-300">100.0% Guaranteed</div>
            <div className="text-[11px] text-emerald-400 font-sans">Constrained decoding at token generation</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-cyan-500/30 bg-cyan-500/5">
            <span className="text-cyan-400 text-[10px] uppercase font-sans font-semibold">Parser Support</span>
            <div className="text-2xl font-black text-cyan-300">Zod & Pydantic</div>
            <div className="text-[11px] text-cyan-400 font-sans">Native SDK client helper integration</div>
          </div>

          <div className="glass-panel p-5 rounded-3xl space-y-1 border border-white/10">
            <span className="text-zinc-500 text-[10px] uppercase font-sans">Output Integrity</span>
            <div className="text-2xl font-black text-white">Zero Missing Keys</div>
            <div className="text-[11px] text-zinc-400 font-sans">Strict JSON syntax guaranteed</div>
          </div>
        </div>

        {/* OpenAPI Specification JSON Schema */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-400" />
              Raw REST API JSON Schema Specification
            </h2>
            <button
              onClick={() => handleCopy(rawJsonSnippet, 'raw')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5"
            >
              {copiedSection === 'raw' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'raw' ? 'Copied' : 'Copy cURL'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-cyan-300 border border-white/5 overflow-x-auto">
            <code>{rawJsonSnippet}</code>
          </pre>
        </div>
      </main>
    </div>
  );
}
