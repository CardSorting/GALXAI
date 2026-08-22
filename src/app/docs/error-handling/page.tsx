'use client';

import React from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  AlertTriangle,
  ShieldAlert,
  Zap,
  RefreshCw,
  CheckCircle2,
  Code2,
  Server
} from 'lucide-react';

const ERROR_CODES = [
  {
    code: '200 OK',
    meaning: 'Successful generation or streaming payload',
    action: 'Payload parsed normally by OpenAI SDK client.'
  },
  {
    code: '400 Bad Request',
    meaning: 'Invalid JSON body or unsupported parameter',
    action: 'Check request body parameters (e.g. valid messages array).'
  },
  {
    code: '401 Unauthorized',
    meaning: 'Invalid or revoked Gateway API key',
    action: 'Verify Authorization Bearer token header in request.'
  },
  {
    code: '403 Forbidden',
    meaning: 'IP CIDR mismatch or model disallowed by key policy',
    action: 'Check allowed IP CIDR and model whitelist in /keys/permissions.'
  },
  {
    code: '429 Rate Limit Exceeded',
    meaning: 'Exceeded per-key RPM / TPM limits',
    action: 'Automated exponential backoff with full jitter will recover in milliseconds.'
  },
  {
    code: '503 Service Unavailable',
    meaning: 'Upstream vendor outage during failover',
    action: 'GALXAI circuit breaker executes automatic sub-15ms failover.'
  }
];

export default function ErrorHandlingDocsPage() {
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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Error Handling & Sub-15ms Failover Guide</h1>
            <p className="text-xs text-zinc-400">
              Understand standard HTTP status codes, exponential backoff with full jitter, and automated circuit breaker recovery.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>SUB-15MS AUTO FAILOVER</span>
            </span>
          </div>
        </div>

        <DocsSubNav />

        {/* Status Codes Table */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Standard Gateway HTTP Status Codes
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4 font-sans">HTTP Status Code</th>
                  <th className="py-3 px-4 font-sans">Description & Reason</th>
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

        {/* Exponential Backoff Client Implementation */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
            <Code2 className="w-4 h-4 text-cyan-400" />
            Recommended Python Client Retry with Exponential Jitter
          </h3>

          <pre className="p-4 rounded-2xl bg-black/60 border border-white/5 font-mono text-xs text-cyan-300 overflow-x-auto">
            <code>{`from openai import OpenAI
import time
import random

client = OpenAI(
    base_url="https://api.galxai.com/v1",
    api_key="galx_live_your_key_here",
    max_retries=3,  # Built-in automatic exponential backoff
    timeout=30.0
)

# Client automatically handles transient 429 backoff seamlessly`}</code>
          </pre>
        </div>
      </main>
    </div>
  );
}
