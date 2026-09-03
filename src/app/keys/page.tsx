'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { KeysSubNav } from '@/components/dashboard/KeysSubNav';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Wallet,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Code2,
  ExternalLink,
  Sliders,
  ShieldAlert
} from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';
import { useDepositVerification } from '@/lib/hooks/useDepositVerification';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { ErrorBoundary, withErrorBoundary } from '@/components/common/ErrorBoundary';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { useAuth } from '@/contexts/AuthContext';

type SnippetTab = 'curl' | 'python' | 'node' | 'cursor';

function BaseGatewayKeysPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [environmentFilter, setEnvironmentFilter] = useState<'all' | 'live' | 'test'>('all');

  // Key creation state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'live' | 'test'>('live');
  const [newKeyCompactionMode, setNewKeyCompactionMode] = useState<'auto' | 'raw'>('raw');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Key roll / rotation state
  const [rollingKey, setRollingKey] = useState<any | null>(null);
  const [rollingGraceHours, setRollingGraceHours] = useState<number>(24);
  const [isRolling, setIsRolling] = useState(false);
  const [rolledResultKey, setRolledResultKey] = useState<string | null>(null);

  // One-time secret key reveal notification
  const [createdSecretKey, setCreatedSecretKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Base URL copy state
  const [copiedBaseUrl, setCopiedBaseUrl] = useState(false);

  // Quickstart snippet state
  const [activeSnippetTab, setActiveSnippetTab] = useState<SnippetTab>('python');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const { walletBalance } = useDepositVerification();

  const fetchKeys = async () => {
    if (!user?.id) {
      setKeys([]);
      return;
    }
    try {
      const res = await resilientFetch<{ keys: any[] }>(`/api/keys?userId=${encodeURIComponent(user.id)}`, {
        enableCacheFallback: true,
      });
      setKeys(res.data?.keys || []);
    } catch {
      // Offline / cached fallback handled by resilientFetch
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchKeys();
    }
  }, [user?.id]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    const nameToSubmit = newKeyName.trim() || 'Default Developer Key';

    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await resilientFetch<{ success: boolean; key?: { apiKey: string }; error?: string }>('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameToSubmit,
          userId: user.id,
          environment: newKeyEnv,
          rateLimitPerMinute: newKeyEnv === 'live' ? 120 : 60,
          hasVerifiedDeposit: true,
          depositedAmount: walletBalance,
          defaultCompactionMode: newKeyCompactionMode,
        })
      });

      if (res.data?.success && res.data.key?.apiKey) {
        setCreatedSecretKey(res.data.key.apiKey);
        setNewKeyName('');
        setIsCreateModalOpen(false);
        fetchKeys();
      } else {
        setCreateError(res.data?.error || 'Failed to generate key.');
      }
    } catch (err: any) {
      setCreateError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string, keyName: string) => {
    if (!window.confirm(`Are you sure you want to revoke "${keyName}"? Any requests using this key will immediately fail.`)) {
      return;
    }
    try {
      await resilientFetch(`/api/keys?id=${keyId}&userId=${encodeURIComponent(user?.id || '')}`, { method: 'DELETE' });
      fetchKeys();
    } catch {}
  };

  const handleExecuteRollKey = async () => {
    if (!rollingKey) return;
    setIsRolling(true);
    try {
      const res = await resilientFetch<{ success: boolean; key?: { apiKey: string }; message?: string }>(
        `/api/keys/${rollingKey.id}/roll`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graceHours: rollingGraceHours, userId: user?.id })
        }
      );
      if (res.data?.success && res.data.key?.apiKey) {
        setRolledResultKey(res.data.key.apiKey);
        setRollingKey(null);
        fetchKeys();
      }
    } catch {} finally {
      setIsRolling(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    const success = await safeCopyToClipboard(text);
    if (success) {
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleCopyBaseUrl = async () => {
    const success = await safeCopyToClipboard('https://galx.ai/v1');
    if (success) {
      setCopiedBaseUrl(true);
      setTimeout(() => setCopiedBaseUrl(false), 2000);
    }
  };

  const handleCopySnippet = async (snippet: string) => {
    const success = await safeCopyToClipboard(snippet);
    if (success) {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  const activeDisplayKey = createdSecretKey || rolledResultKey || 'galx_live_your_key_here';

  const snippets: Record<SnippetTab, { title: string; lang: string; code: string }> = {
    curl: {
      title: 'cURL',
      lang: 'bash',
      code: `curl https://galx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${activeDisplayKey}" \\
  -d '{
    "model": "gpt-5.6-sol",
    "messages": [{"role": "user", "content": "Write a high-performance LRU cache in Rust."}]
  }'`
    },
    python: {
      title: 'Python (OpenAI SDK)',
      lang: 'python',
      code: `from openai import OpenAI

# Drop-in replacement: point base_url to GALX AI Gateway
client = OpenAI(
    base_url="https://galx.ai/v1",
    api_key="${activeDisplayKey}"
)

response = client.chat.completions.create(
    model="gpt-5.6-sol",
    messages=[{"role": "user", "content": "Write a high-performance LRU cache in Rust."}]
)
print(response.choices[0].message.content)`
    },
    node: {
      title: 'Node.js / TypeScript',
      lang: 'typescript',
      code: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://galx.ai/v1',
  apiKey: '${activeDisplayKey}'
});

const completion = await client.chat.completions.create({
  model: 'gpt-5.6-sol',
  messages: [{ role: 'user', content: 'Write a high-performance LRU cache in Rust.' }]
});
console.log(completion.choices[0].message.content);`
    },
    cursor: {
      title: 'Cursor / Windsurf (.cursorrules or Settings)',
      lang: 'json',
      code: `// Set in Cursor Settings -> Models -> OpenAI API Key:
// API Key: ${activeDisplayKey}
// Override OpenAI Base URL: https://galx.ai/v1
// Compatible Models: gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna`
    }
  };

  const filteredKeys = keys.filter(k => {
    if (environmentFilter === 'all') return true;
    const keyEnv = k.environment || (k.keyPrefix?.includes('test') || k.prefix?.includes('test') ? 'test' : 'live');
    return keyEnv === environmentFilter;
  });

  const activeKeysCount = keys.filter(k => !k.revoked && !k.isExpired).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-zinc-100">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Breadcrumbs items={[{ label: 'API Keys' }]} />

        <ErrorBoundary name="Keys Navigation">
          <KeysSubNav />
        </ErrorBoundary>

        <AuthRequiredGate
          title="Sign In to Access API Keys"
          description="Your dedicated API keys, rate limits, and gateway usage telemetry are private to your workspace."
        >
          {/* Flat Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">API Keys</h1>
              <p className="text-xs text-zinc-400 mt-1">
                Secret tokens to authenticate requests to the GALX AI Gateway (<code className="text-zinc-300 font-mono">https://galx.ai/v1</code>).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewKeyName('');
                  setCreateError(null);
                  setIsCreateModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Key</span>
              </button>
            </div>
          </div>

          {/* Single-Row Telemetry Context Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[#0d101c] border border-white/10 text-xs font-sans">
            <div className="flex items-center justify-between px-3 py-1.5 sm:border-r sm:border-white/10">
              <div className="flex items-center gap-2 text-zinc-400">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>Compute Balance</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white">${walletBalance.toFixed(2)}</span>
                <Link
                  href="/billing"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Manage
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-between px-3 py-1.5 sm:border-r sm:border-white/10">
              <div className="flex items-center gap-2 text-zinc-400">
                <Key className="w-4 h-4 text-indigo-400" />
                <span>Active Keys</span>
              </div>
              <span className="font-mono font-bold text-white">{activeKeysCount}</span>
            </div>

            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-2 text-zinc-400">
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <span>Gateway Base URL</span>
              </div>
              <button
                type="button"
                onClick={handleCopyBaseUrl}
                className="font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 text-[11px] bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded transition-colors cursor-pointer"
                title="Copy base URL to clipboard"
              >
                <span>https://galx.ai/v1</span>
                {copiedBaseUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
              </button>
            </div>
          </div>

          {/* Newly Created Secret Key Alert Banner (One-Time Reveal) */}
          {createdSecretKey && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Key Generated Successfully</span>
                </div>
                <span className="text-[11px] text-zinc-400">Save this key now. It will not be shown again.</span>
              </div>

              <div className="p-3 rounded-xl bg-black/60 font-mono text-xs text-emerald-300 flex items-center justify-between gap-3 border border-emerald-500/30">
                <span className="select-all break-all">{createdSecretKey}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(createdSecretKey, 'created')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'created' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'created' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setCreatedSecretKey(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Rolled Key Reveal Notification */}
          {rolledResultKey && (
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                  <span>Key Rotated (Zero-Downtime Roll)</span>
                </div>
                <span className="text-[11px] text-zinc-400">Copy now • Revealed once</span>
              </div>

              <div className="p-3 rounded-xl bg-black/60 font-mono text-xs text-cyan-300 flex items-center justify-between gap-3 border border-cyan-500/30">
                <span className="select-all break-all">{rolledResultKey}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(rolledResultKey, 'rolled')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'rolled' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'rolled' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Your previous key remains valid until the migration grace period expires.</span>
                <button
                  type="button"
                  onClick={() => setRolledResultKey(null)}
                  className="text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Active Keys Table Section (Front & Center) */}
          <div className="rounded-2xl border border-white/10 bg-[#0d101c] overflow-hidden">
            {/* Table Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">Your Keys</h2>
                <span className="text-xs text-zinc-500 font-mono">({filteredKeys.length})</span>
              </div>

              {/* Environment Filter */}
              <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setEnvironmentFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    environmentFilter === 'all'
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All ({keys.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEnvironmentFilter('live')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    environmentFilter === 'live'
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                      : 'text-zinc-400 hover:text-emerald-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Live</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEnvironmentFilter('test')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    environmentFilter === 'test'
                      ? 'bg-amber-500/20 text-amber-300 font-semibold'
                      : 'text-zinc-400 hover:text-amber-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Test</span>
                </button>
              </div>
            </div>

            {filteredKeys.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-3">
                <Key className="w-8 h-8 text-zinc-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-300">No API keys found</p>
                  <p className="text-xs text-zinc-500">
                    {environmentFilter !== 'all'
                      ? `No ${environmentFilter} keys generated yet.`
                      : 'Create your first secret key to begin sending requests.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewKeyName('');
                    setCreateError(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer border border-white/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create API Key</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-400 font-semibold text-[11px] bg-white/[0.02]">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Environment</th>
                      <th className="py-3 px-4 font-mono">Secret Key</th>
                      <th className="py-3 px-4">Rate Limit</th>
                      <th className="py-3 px-4">Total Requests</th>
                      <th className="py-3 px-4">Created</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {filteredKeys.map((k) => {
                      const isLive = (k.environment || (k.keyPrefix?.includes('live') || k.prefix?.includes('live') ? 'live' : 'test')) === 'live';
                      const prefixText = k.keyPrefix || k.prefix || 'galx_live_';

                      return (
                        <tr key={k.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-white">
                            <Link href={`/keys/${k.id}`} className="hover:text-indigo-300 transition-colors">
                              {k.name}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase ${
                              isLive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {isLive ? 'Live' : 'Test'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-zinc-300">
                            <div className="inline-flex items-center gap-1.5">
                              <span>{prefixText}...</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(`${prefixText}...`, k.id)}
                                className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                title="Copy key prefix"
                              >
                                {copiedKey === k.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-400 font-mono">
                            {k.rateLimitPerMinute || 120} RPM
                          </td>
                          <td className="py-3.5 px-4 text-zinc-400 font-mono">
                            {k.totalRequests || 0}
                          </td>
                          <td className="py-3.5 px-4 text-zinc-500">
                            {formatTimeAgo(k.createdAt)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                              k.revoked
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : k.isExpired
                                ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {k.revoked ? 'Revoked' : k.isExpired ? 'Expired' : 'Active'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!k.revoked && !k.isExpired && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setRollingKey(k)}
                                    className="px-2.5 py-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 text-xs font-semibold cursor-pointer transition-colors"
                                    title="Zero-downtime key rotation"
                                  >
                                    Roll
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeKey(k.id, k.name)}
                                    className="px-2.5 py-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer transition-colors"
                                    title="Revoke key"
                                  >
                                    Revoke
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quickstart Integration Drawer / Card */}
          <div className="rounded-2xl border border-white/10 bg-[#0d101c] p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <span>Integration Quickstart</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Point any OpenAI-compatible client to <code className="text-zinc-200 font-mono">https://galx.ai/v1</code>.
                </p>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-xs font-mono">
                {(
                  [
                    { id: 'python', label: 'Python' },
                    { id: 'node', label: 'Node.js' },
                    { id: 'curl', label: 'cURL' },
                    { id: 'cursor', label: 'Cursor IDE' }
                  ] as { id: SnippetTab; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSnippetTab(tab.id)}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeSnippetTab === tab.id
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Box */}
            <div className="relative rounded-xl bg-black/70 border border-white/10 font-mono text-xs overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/10 bg-white/[0.02]">
                <span className="text-[11px] text-zinc-400">{snippets[activeSnippetTab].title}</span>
                <button
                  type="button"
                  onClick={() => handleCopySnippet(snippets[activeSnippetTab].code)}
                  className="px-2.5 py-1 rounded text-zinc-300 hover:text-white hover:bg-white/10 text-[11px] font-sans font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                  <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 text-zinc-300 overflow-x-auto leading-relaxed">
                <code>{snippets[activeSnippetTab].code}</code>
              </pre>
            </div>
          </div>
        </AuthRequiredGate>
      </main>

      {/* Create Key Modal Dialog */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-2xl bg-[#0d101c] border border-white/15 p-6 space-y-4 shadow-2xl text-zinc-100 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h2 className="text-base font-bold text-white">Create New Secret Key</h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateKey} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Cursor IDE, Production Backend, Fleet Worker"
                  className="w-full py-2 px-3 rounded-xl bg-black/50 border border-white/15 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Environment</label>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setNewKeyEnv('live')}
                    className={`py-2 px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      newKeyEnv === 'live'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Live (Production)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewKeyEnv('test')}
                    className={`py-2 px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      newKeyEnv === 'test'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Test (Sandbox)</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Prompt Policy</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setNewKeyCompactionMode('raw')}
                    className={`py-2 px-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      newKeyCompactionMode === 'raw'
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white font-semibold'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div>Raw (Default)</div>
                    <div className="text-[10px] text-zinc-500 font-normal">100% byte fidelity</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewKeyCompactionMode('auto')}
                    className={`py-2 px-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      newKeyCompactionMode === 'auto'
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 font-semibold'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div>Compacted</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Auto-token deflation</div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreating ? 'Creating...' : 'Create Secret Key'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Key Roll / Zero-Downtime Rotation Modal */}
      {rollingKey && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-[#0d101c] border border-white/15 p-6 space-y-4 shadow-2xl text-zinc-100 font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span>Rotate API Key</span>
              </div>
              <button
                type="button"
                onClick={() => setRollingKey(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-zinc-300">
              <p>
                Rolling <strong>{rollingKey.name}</strong> (<code className="text-cyan-300 font-mono">{rollingKey.keyPrefix || rollingKey.prefix}...</code>).
              </p>
              <p className="text-zinc-400">
                A new key will be minted with identical scopes and rate limits. The current key will remain active during the migration grace period.
              </p>
            </div>

            {/* Grace Period Selector */}
            <div className="space-y-1.5 text-xs">
              <span className="text-zinc-400 font-semibold">Migration Grace Period:</span>
              <div className="grid grid-cols-2 gap-2 font-mono">
                {[
                  { hours: 0, label: 'Instant Revoke' },
                  { hours: 1, label: '1 Hour' },
                  { hours: 24, label: '24 Hours (Rec)' },
                  { hours: 168, label: '7 Days' }
                ].map((g) => (
                  <button
                    key={g.hours}
                    type="button"
                    onClick={() => setRollingGraceHours(g.hours)}
                    className={`py-2 px-3 rounded-xl border text-xs transition-colors cursor-pointer text-left ${
                      rollingGraceHours === g.hours
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 font-semibold'
                        : 'bg-black/30 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRollingKey(null)}
                className="px-3.5 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRollKey}
                disabled={isRolling}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRolling ? 'animate-spin' : ''}`} />
                <span>{isRolling ? 'Rotating...' : 'Confirm Roll'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withErrorBoundary(BaseGatewayKeysPage, {
  name: 'Gateway Keys Page'
});
