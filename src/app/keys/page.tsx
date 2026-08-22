'use client';

import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { Key, Plus, Trash2, Copy, Check, ShieldAlert, Sparkles, X, Code2 } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

export default function GatewayKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdSecretKey, setCreatedSecretKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/keys');
      const data = await res.json();
      setKeys(data.keys || []);
    } catch {}
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() })
      });
      const data = await res.json();
      if (data.success && data.key?.apiKey) {
        setCreatedSecretKey(data.key.apiKey);
        setNewKeyName('');
        fetchKeys();
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      await fetch(`/api/keys?id=${keyId}`, { method: 'DELETE' });
      fetchKeys();
    } catch {}
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'Developer Gateway API Keys' }]} />

        {/* Page Hero */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
              <Key className="w-3.5 h-3.5" />
              <span>DEVELOPER BEARER AUTHENTICATION</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Developer Gateway API Keys</h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Generate <code className="text-cyan-300 font-mono">galx_live_...</code> client tokens to connect external agent frameworks, Cursor IDE, or backend servers to your pooled quota.
            </p>
          </div>
        </div>

        {/* Create Key Section */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            Create New Gateway API Key
          </h2>

          {createdSecretKey ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 uppercase">Save Your New Key</span>
                <span className="text-[10px] text-zinc-400">This secret key will not be shown again</span>
              </div>
              <div className="p-3 rounded-xl bg-black/60 font-mono text-xs text-emerald-300 flex items-center justify-between gap-2 break-all">
                <span>{createdSecretKey}</span>
                <button
                  onClick={() => handleCopy(createdSecretKey, 'banner')}
                  className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 shrink-0 transition-all cursor-pointer"
                >
                  {copiedKey === 'banner' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Production Backend, Local Agent, Cursor"
                className="flex-1 py-2.5 px-4 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Generating...' : 'Create Key'}
              </button>
            </form>
          )}
        </div>

        {/* Active Keys Table */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Active Gateway Keys ({keys.filter(k => !k.revoked).length})</h2>

          {keys.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-black/30 border border-dashed border-white/10 space-y-2">
              <Key className="w-8 h-8 text-zinc-500 mx-auto" />
              <p className="text-xs text-zinc-400">No gateway keys generated yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/20">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Name / Label</th>
                    <th className="py-3 px-4">Key Prefix</th>
                    <th className="py-3 px-4">Rate Limit</th>
                    <th className="py-3 px-4">Total Requests</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{k.name}</td>
                      <td className="py-3.5 px-4 font-mono text-zinc-300">{k.keyPrefix}...</td>
                      <td className="py-3.5 px-4 text-zinc-400">{k.rateLimitPerMinute} req/min</td>
                      <td className="py-3.5 px-4 text-zinc-400 font-mono">{k.totalRequests}</td>
                      <td className="py-3.5 px-4 text-zinc-500">{formatTimeAgo(k.createdAt)}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          k.revoked
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {k.revoked ? 'Revoked' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!k.revoked && (
                          <button
                            onClick={() => handleRevokeKey(k.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold cursor-pointer transition-all"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
