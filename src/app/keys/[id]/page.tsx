'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Key, Trash2, CheckCircle2, XCircle, Activity, Code2, ArrowLeft } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

export default function KeyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const keyId = params.id as string;

  const [keyData, setKeyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchKey = async () => {
    try {
      const res = await fetch('/api/keys');
      const data = await res.json();
      const found = data.keys?.find((k: any) => k.id === keyId);
      setKeyData(found || null);
    } catch {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKey();
  }, [keyId]);

  const handleRevoke = async () => {
    if (!keyData) return;
    try {
      await fetch(`/api/keys?id=${keyData.id}`, { method: 'DELETE' });
      fetchKey();
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 max-w-4xl w-full mx-auto p-8 animate-pulse space-y-6">
          <div className="h-8 w-48 bg-white/5 rounded-xl" />
          <div className="h-64 glass-panel rounded-3xl" />
        </main>
      </div>
    );
  }

  if (!keyData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 max-w-4xl w-full mx-auto p-8 text-center space-y-4 my-auto">
          <Key className="w-12 h-12 text-zinc-600 mx-auto" />
          <h1 className="text-xl font-bold text-white">Key Not Found</h1>
          <p className="text-xs text-zinc-400">The requested Gateway API key may have been deleted or invalid.</p>
          <Link
            href="/keys"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold inline-block"
          >
            Back to API Keys
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'API Keys', href: '/keys' },
            { label: keyData.name || keyData.id }
          ]}
        />

        {/* Key Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white">{keyData.name}</h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    keyData.revoked ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {keyData.revoked ? 'Revoked' : 'Active'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-mono">
                  Prefix: <code className="text-zinc-300">{keyData.keyPrefix}...</code> • Rate Limit: <code className="text-cyan-300">{keyData.rateLimitPerMinute} req/min</code>
                </p>
              </div>
            </div>

            {!keyData.revoked && (
              <button
                onClick={handleRevoke}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                Revoke Key
              </button>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10 font-mono">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase">Total Requests</span>
              <div className="text-base font-bold text-white">{keyData.totalRequests || 0}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase">Rate Ceiling</span>
              <div className="text-base font-bold text-cyan-300">{keyData.rateLimitPerMinute} req/min</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase">Created</span>
              <div className="text-xs font-bold text-zinc-300">{formatTimeAgo(keyData.createdAt)}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 text-[10px] uppercase">Last Used</span>
              <div className="text-xs font-bold text-emerald-300">
                {keyData.lastUsedAt ? formatTimeAgo(keyData.lastUsedAt) : 'Never'}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
