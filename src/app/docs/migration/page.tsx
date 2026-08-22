'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { DocsSubNav } from '@/components/dashboard/DocsSubNav';
import {
  ArrowLeftRight,
  Code2,
  Copy,
  Check,
  CheckCircle2,
  Zap,
  Flame,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function MigrationGuidePage() {
  const [activeSource, setActiveSource] = useState<'openai' | 'openrouter' | 'litellm' | 'bedrock'>('openai');
  const [copiedDiff, setCopiedDiff] = useState(false);

  const migrationSnippets = {
    openai: {
      title: 'Migrating from Direct OpenAI SDK',
      before: `# Direct OpenAI (Standard Retail Pricing)
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY")
)`,
      after: `# GALXAI Universal Gateway (25%-40% Wholesale Discount + Sub-15ms Failover)
from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",  # <- ONLY CHANGE NEEDED!
    api_key="galx_live_your_gateway_key"
)`,
      env: `OPENAI_BASE_URL="https://api.galx.ai/v1"
OPENAI_API_KEY="galx_live_your_gateway_key"`
    },
    openrouter: {
      title: 'Migrating from OpenRouter',
      before: `# OpenRouter Client
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY")
)`,
      after: `# GALXAI Universal Gateway (Wholesale Pricing + Sub-15ms Dynamic TTFT)
from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)`,
      env: `OPENAI_BASE_URL="https://api.galx.ai/v1"
OPENAI_API_KEY="galx_live_your_gateway_key"`
    },
    litellm: {
      title: 'Migrating with LiteLLM Proxy',
      before: `# LiteLLM Direct Routing
import litellm

response = litellm.completion(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)`,
      after: `# LiteLLM Routed via GALXAI
import litellm

response = litellm.completion(
    model="openai/gpt-5.6-sol",
    api_base="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key",
    messages=[{"role": "user", "content": "Hello!"}]
)`,
      env: `LITELLM_API_BASE="https://api.galx.ai/v1"
LITELLM_API_KEY="galx_live_your_gateway_key"`
    },
    bedrock: {
      title: 'Migrating from AWS Bedrock',
      before: `# AWS Bedrock Boto3 Client (Complex AWS IAM Signature V4)
import boto3

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
# Requires complex JSON request formatting and AWS credentials`,
      after: `# Standard OpenAI SDK via GALXAI
from openai import OpenAI

client = OpenAI(
    base_url="https://api.galx.ai/v1",
    api_key="galx_live_your_gateway_key"
)`,
      env: `OPENAI_BASE_URL="https://api.galx.ai/v1"
OPENAI_API_KEY="galx_live_your_gateway_key"`
    }
  };

  const activeSnippet = migrationSnippets[activeSource];

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(activeSnippet.env);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Docs', href: '/docs' },
            { label: 'Getting Started', href: '/docs/quickstart' },
            { label: '1-Click Zero-Code Migration Guide' }
          ]}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">1-Click Zero-Code Migration Guide</h1>
            <p className="text-xs text-zinc-400">
              Switch from direct OpenAI, OpenRouter, LiteLLM, or AWS Bedrock in 30 seconds by updating 1 environment variable.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>0 CODE REFACTORING REQUIRED</span>
            </span>
          </div>
        </div>

        <DocsSubNav />

        {/* Source Selector Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10 overflow-x-auto font-mono text-xs">
          {[
            { id: 'openai', label: 'OpenAI Direct API' },
            { id: 'openrouter', label: 'OpenRouter' },
            { id: 'litellm', label: 'LiteLLM Proxy' },
            { id: 'bedrock', label: 'AWS Bedrock' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSource(tab.id as any)}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeSource === tab.id
                  ? 'bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Migration Diff Box */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Before */}
          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-rose-500/30 bg-rose-500/5 font-mono text-xs">
            <div className="flex items-center justify-between text-rose-400 font-bold">
              <span>BEFORE: Current Setup</span>
              <span className="text-[10px] uppercase font-sans">Full Retail Price</span>
            </div>
            <pre className="p-4 rounded-2xl bg-black/60 border border-white/5 text-zinc-300 overflow-x-auto">
              <code>{activeSnippet.before}</code>
            </pre>
          </div>

          {/* After */}
          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-emerald-500/30 bg-emerald-500/5 font-mono text-xs">
            <div className="flex items-center justify-between text-emerald-400 font-bold">
              <span>AFTER: Routed via GALXAI</span>
              <span className="text-[10px] uppercase font-sans">25%–40% Wholesale Margin</span>
            </div>
            <pre className="p-4 rounded-2xl bg-black/60 border border-white/5 text-cyan-300 overflow-x-auto">
              <code>{activeSnippet.after}</code>
            </pre>
          </div>
        </div>

        {/* 1-Click .env Config Export */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-400" />
                Environment Variable Configuration (.env)
              </h3>
              <p className="text-xs text-zinc-400">Paste this into your project's root <code>.env</code> file:</p>
            </div>

            <button
              onClick={handleCopyEnv}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              {copiedDiff ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedDiff ? 'Copied .env' : 'Copy .env snippet'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-amber-300 border border-white/5 overflow-x-auto">
            <code>{activeSnippet.env}</code>
          </pre>
        </div>
      </main>
    </div>
  );
}
