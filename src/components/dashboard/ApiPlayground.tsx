'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Key,
  Code2,
  ArrowRight,
  BookOpen,
  Lock,
  Cpu,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { EXCLUSIVE_MODEL_CATALOG } from '@/core/router/ModelCatalog';

export function ApiPlayground() {
  return (
    <div className="glass-panel rounded-3xl p-6 lg:p-10 space-y-8 max-w-4xl mx-auto border border-amber-500/20 bg-[#0c0e17]/80">
      {/* Security & Decommission Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Security Hardening Notice</span>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Interactive Playground Temporarily Offline
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl">
            To protect pooled upstream compute allocations and prevent unauthenticated abuse,
            the public browser sandbox has been temporarily decommissioned. All inference requests
            now require an authenticated API key or signed developer token.
          </p>
        </div>
      </div>

      {/* Action Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Generate Authenticated API Key</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Create a free developer API key with $5 compute credits to access all 12 frontier models.
            </p>
          </div>
          <Link
            href="/keys/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-amber-500/20"
          >
            <span>Create Developer Key</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </Link>
        </div>

        <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Integration & SDK Quickstart</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Drop-in OpenAI & Anthropic SDK compatibility. Connect Cursor, Windsurf, Python, or cURL.
            </p>
          </div>
          <Link
            href="/docs/quickstart"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider border border-white/10 transition-all cursor-pointer"
          >
            <span>Read 30s Quickstart</span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
          </Link>
        </div>
      </div>

      {/* Available Models Quick Reference */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Available Models via Gateway API
          </span>
          <Link href="/models" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
            View Pricing Matrix →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {EXCLUSIVE_MODEL_CATALOG.slice(0, 6).map((m) => (
            <Link
              key={m.id}
              href={`/models/${m.id}`}
              className="p-3 rounded-2xl bg-black/30 border border-white/5 hover:border-white/15 hover:bg-white/[0.02] transition-all text-left block"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-white font-mono truncate">{m.id}</span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-400">
                  {m.provider}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">{m.name}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Code Example Snippet */}
      <div className="space-y-2 pt-2">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          cURL Example (Authenticated)
        </span>
        <pre className="p-4 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono text-cyan-300 overflow-x-auto">
{`curl -X POST https://api.galxai.com/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_GALXAI_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Hello world"}]
  }'`}
        </pre>
      </div>
    </div>
  );
}
