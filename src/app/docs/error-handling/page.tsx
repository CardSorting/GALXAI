'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import { DocsFeedback } from '@/components/dashboard/DocsFeedback';
import {
  AlertTriangle,
  ShieldAlert,
  Zap,
  RefreshCw,
  CheckCircle2,
  Code2,
  Server,
  Terminal,
  Copy,
  Check,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { RateLockRibbon } from '@/components/dashboard/RateLockRibbon';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { TrustSeals } from '@/components/common/TrustSeals';
import { FloatingConversionDock } from '@/components/dashboard/FloatingConversionDock';
import { LiveActivityToast } from '@/components/dashboard/LiveActivityToast';
import { ExitIntentModal } from '@/components/dashboard/ExitIntentModal';

const ERROR_CODES = [
  {
    code: '200 OK',
    meaning: 'Successful generation or streaming payload',
    action: 'Payload parsed normally by standard client SDKs.'
  },
  {
    code: '400 Bad Request',
    meaning: 'Invalid JSON body, parameter schema mismatch, or unrecognized model string',
    action: 'GALXAI Model Resolver auto-corrects shorthand model names. Check payload JSON.'
  },
  {
    code: '401 Unauthorized',
    meaning: 'Invalid, missing, or revoked Gateway API key',
    action: 'Verify Authorization Bearer header: Authorization: Bearer galx_live_...'
  },
  {
    code: '403 Forbidden',
    meaning: 'IP CIDR mismatch or model disallowed by key policy',
    action: 'Review allowed IP CIDR and model access rules in /keys/permissions.'
  },
  {
    code: '429 Rate Limit Exceeded',
    meaning: 'Per-key RPM or TPM capacity ceiling reached',
    action: 'Client SDKs with exponential backoff & full jitter automatically recover in <50ms.'
  },
  {
    code: '503 Service Unavailable',
    meaning: 'Upstream vendor outage during failover',
    action: 'GALXAI circuit breaker auto-routes traffic to healthy upstream in <15ms.'
  }
];

export default function ErrorHandlingDocsPage() {
  const [activeTab, setActiveTab] = useState<'python' | 'ts' | 'curl'>('python');
  const [copiedKey, setCopiedKey] = useState(false);

  const recipes = {
    python: {
      title: 'Python (Automatic Exponential Backoff + Jitter)',
      code: `from openai import OpenAI
import time
import random

# Built-in automatic retry handles transient 429 & 503 backoff seamlessly
client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key",
    max_retries=5,       # Automatic exponential retry on 429/500/503
    timeout=30.0         # 30-second failover safety window
)

try:
    response = client.chat.completions.create(
        model="gpt-5.6-sol",
        messages=[{"role": "user", "content": "Execute idempotent task."}]
    )
    print(response.choices[0].message.content)
except Exception as e:
    print(f"Handled error gracefully: {e}")`
    },
    ts: {
      title: 'TypeScript / Node.js Custom Retry Policy',
      code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.galx.ai/v1",
  apiKey: process.env.GALXAI_API_KEY || "galx_live_your_gateway_key",
  maxRetries: 5, // Built-in exponential backoff
  timeout: 30000,
});

try {
  const response = await client.chat.completions.create({
    model: "gpt-5.6-sol",
    messages: [{ role: "user", content: "Execute resilient TypeScript call." }],
  });
  console.log(response.choices[0].message.content);
} catch (error: any) {
  if (error instanceof OpenAI.APIError) {
    console.error(\`HTTP \${error.status}: \${error.message}\`);
  }
}`
    },
    curl: {
      title: 'cURL Retry Flags',
      code: `# Retry up to 5 times on 429 and 503 errors with exponential backoff
curl --retry 5 \\
     --retry-delay 1 \\
     --retry-max-time 60 \\
     --retry-all-errors \\
     -X POST https://api.galx.ai/v1/chat/completions \\
     -H "Authorization: Bearer galx_live_your_gateway_key" \\
     -H "Content-Type: application/json" \\
     -d '{
       "model": "gpt-5.6-sol",
       "messages": [{"role": "user", "content": "Resilient cURL request."}]
     }'`
    }
  };

  const handleCopy = async (code: string) => {
    await safeCopyToClipboard(code);
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
            { label: 'API & Model Reference', href: '/docs/api-reference' },
            { label: 'Errors & Retry Backoff' }
          ]}
        />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-4 border border-white/10 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>SUB-15MS AUTOMATED CIRCUIT BREAKER FAILOVER</span>
            </div>
            <Link
              href="/keys/new"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase font-mono tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Claim Key ($5 Credit)</span>
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Error Handling &amp; Sub-15ms Failover Guide</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl font-sans">
            Understand standard HTTP status codes, exponential backoff with full jitter, and automated multi-region circuit breaker recovery for resilient zero-stall execution.
          </p>
        </div>

        <DocsSubNav />

        {/* Founding Cohort Rate Lock Ribbon */}
        <RateLockRibbon />

        {/* Status Codes Table */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Standard Gateway HTTP Status Codes &amp; Resolution
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4 font-sans">HTTP Status Code</th>
                  <th className="py-3 px-4 font-sans">Description &amp; Reason</th>
                  <th className="py-3 px-4 font-sans">Recommended Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ERROR_CODES.map((err) => (
                  <tr key={err.code} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-amber-300">
                      {err.code}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300 font-sans text-xs">
                      {err.meaning}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 font-sans text-xs">
                      {err.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabbed Recipes Workbench */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4 font-mono text-xs">
            {(['python', 'ts', 'curl'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl font-bold uppercase transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab === 'python' ? '🐍 Python (max_retries)' : tab === 'ts' ? '▲ TypeScript / Node' : '💻 cURL (Retry Flags)'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>{recipes[activeTab].title}</span>
              </h3>

              <button
                onClick={() => handleCopy(recipes[activeTab].code)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all text-xs cursor-pointer font-sans"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'Copied Recipe!' : 'Copy Code'}</span>
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

        <DocsFeedback docTitle="Error Handling &amp; Sub-15ms Failover Guide" />
      </main>

      {/* Floating Conversion Dock, Live Activity Toast & Exit Intent Modal */}
      <FloatingConversionDock />
      <LiveActivityToast />
      <ExitIntentModal />
    </div>
  );
}
