'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Key, Sparkles, Check, Copy, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function CreateKeyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(120);
  const [createdSecretKey, setCreatedSecretKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          rateLimitPerMinute: Number(rateLimitPerMinute)
        })
      });
      const data = await res.json();
      if (data.success && data.key?.apiKey) {
        setCreatedSecretKey(data.key.apiKey);
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!createdSecretKey) return;
    navigator.clipboard.writeText(createdSecretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'API Keys', href: '/keys' },
            { label: 'Create Gateway Key' }
          ]}
        />

        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold mb-2">
              <Key className="w-3.5 h-3.5" />
              <span>NEW GATEWAY BEARER TOKEN</span>
            </div>
            <h1 className="text-2xl font-black text-white">Create Developer Gateway Key</h1>
            <p className="text-xs text-zinc-400">
              Generate a unified <code className="text-cyan-300 font-mono">galx_live_...</code> client token for use in OpenAI client SDKs, Cursor, and agent frameworks.
            </p>
          </div>

          {createdSecretKey ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/40 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Your Key is Ready</h2>
                    <p className="text-xs text-zinc-400">This key will only be shown once. Copy and store it securely.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/60 font-mono text-xs text-emerald-300 flex items-center justify-between gap-3 break-all border border-emerald-500/30">
                  <span>{createdSecretKey}</span>
                  <button
                    onClick={handleCopy}
                    className="p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-all cursor-pointer shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Link
                  href="/keys"
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold"
                >
                  Return to API Keys
                </Link>

                <Link
                  href="/docs"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  View Quickstart Guide
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">Key Name / Description</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production Backend, Local Agent, Cursor IDE"
                  className="w-full py-3 px-4 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 placeholder:text-zinc-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                  Rate Limit: {rateLimitPerMinute} requests / minute
                </label>
                <input
                  type="range"
                  min="30"
                  max="600"
                  step="30"
                  value={rateLimitPerMinute}
                  onChange={(e) => setRateLimitPerMinute(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Generating Key...' : 'Generate API Key'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
