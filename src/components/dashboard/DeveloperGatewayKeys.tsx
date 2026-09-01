'use client';

import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';
import { useDepositVerification } from '@/lib/hooks/useDepositVerification';
import { KeyActivationPaywallModal } from '@/components/keys/KeyActivationPaywallModal';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

function BaseDeveloperGatewayKeys() {
  const [keys, setKeys] = useState<any[]>([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdSecretKey, setCreatedSecretKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [snippetTab, setSnippetTab] = useState<'env' | 'python' | 'curl'>('env');
  const [isLoading, setIsLoading] = useState(false);

  const { hasVerifiedDeposit, walletBalance, depositAndUnlock } = useDepositVerification();

  const fetchKeys = async () => {
    try {
      const res = await resilientFetch<{ keys: any[] }>('/api/keys', {
        enableCacheFallback: true,
      });
      setKeys(res.data?.keys || []);
    } catch {
      // Ignored gracefully with cached fallback
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const createKeyDirectly = async (keyName: string, balance: number) => {
    setIsLoading(true);
    try {
      const res = await resilientFetch<{ success: boolean; key?: { apiKey: string } }>('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: keyName.trim() || 'Developer API Key',
          hasVerifiedDeposit: true,
          depositedAmount: balance
        })
      });
      if (res.data?.success && res.data.key?.apiKey) {
        setCreatedSecretKey(res.data.key.apiKey);
        setNewKeyName('');
        fetchKeys();
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    await createKeyDirectly(newKeyName, walletBalance);
  };

  const handlePaywallSuccess = async (depositAmt: number, totalCredit: number) => {
    const { totalCredited } = depositAndUnlock(depositAmt);
    setIsPaywallOpen(false);
    setIsOpenModal(true);
    await createKeyDirectly(newKeyName || 'Developer Gateway Key', walletBalance + totalCredited);
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      await resilientFetch(`/api/keys?id=${keyId}`, { method: 'DELETE' });
      fetchKeys();
    } catch {
      // Ignored gracefully
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await safeCopyToClipboard(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="glass-panel rounded-3xl p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-400" />
              Developer Universal Access Keys
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold border border-indigo-500/30">
              {keys.filter(k => k.is_active !== false).length} Active
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Use these keys as standard Bearer tokens in Cursor, Windsurf, Python, Claude Code, or agent runtimes pointing to <code className="text-cyan-300 font-mono">https://galx.ai/v1</code>.
          </p>
        </div>

        <button
          onClick={() => {
            setCreatedSecretKey(null);
            setIsOpenModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Access Key
        </button>
      </div>

      {/* Keys Table */}
      {keys.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-black/30 border border-dashed border-white/10 space-y-2">
          <Key className="w-8 h-8 text-zinc-500 mx-auto" />
          <p className="text-xs text-zinc-400">No gateway keys generated yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-white/10 text-zinc-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Secret Prefix</th>
                <th className="py-3 px-4">Usage (Tokens)</th>
                <th className="py-3 px-4">Spend ($)</th>
                <th className="py-3 px-4">Rate Limit</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-sans font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{key.name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400">
                    <span className="bg-black/50 px-2 py-1 rounded border border-white/5">
                      {key.prefix || key.keyPrefix}••••••••••••
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">
                    {(key.usage_tokens || key.totalRequests || 0).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">
                    ${(key.spend_usd || 0).toFixed(4)}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400">
                    {key.rate_limit_rpm || key.rateLimitPerMinute || 60} RPM
                  </td>
                  <td className="py-3.5 px-4">
                    {key.is_active !== false && !key.revoked ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Revoked
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleRevokeKey(key.id)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white hover:text-rose-400 transition-colors cursor-pointer"
                      title="Revoke Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Key Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#0d101c] border border-white/10 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <Key className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="text-sm font-bold text-white font-sans">Mint New Developer API Key</h3>
              </div>
              <button
                onClick={() => setIsOpenModal(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {createdSecretKey ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Save your API Key immediately!</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                    This key will never be displayed again. Store it in a secure environment variable.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-mono uppercase">API Key Token</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdSecretKey}
                      className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-emerald-300 text-xs font-mono select-all focus:outline-none"
                    />
                    <button
                      onClick={() => handleCopy(createdSecretKey, 'modal')}
                      className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {copiedKey === 'modal' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span className="text-xs font-bold">{copiedKey === 'modal' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Drop-in Code Snippet */}
                <div className="space-y-2 pt-1 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Quick Integration:</span>
                    <div className="flex gap-1">
                      {(['env', 'python', 'curl'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSnippetTab(t)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                            snippetTab === t ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30' : 'text-zinc-500 hover:text-white'
                          }`}
                        >
                          {t === 'env' ? '.env' : t === 'python' ? 'Python' : 'cURL'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/80 border border-white/10 font-mono text-[11px] text-zinc-300 overflow-x-auto relative">
                    <pre className="pr-16">
                      {snippetTab === 'env' && `OPENAI_API_BASE=https://galx.ai/v1\nOPENAI_API_KEY=${createdSecretKey}`}
                      {snippetTab === 'python' && `from openai import OpenAI\nclient = OpenAI(base_url="https://galx.ai/v1", api_key="${createdSecretKey}")`}
                      {snippetTab === 'curl' && `curl https://galx.ai/v1/chat/completions \\\n  -H "Authorization: Bearer ${createdSecretKey}" \\\n  -H "Content-Type: application/json"`}
                    </pre>
                    <button
                      onClick={() => {
                        const snippet = snippetTab === 'env'
                          ? `OPENAI_API_BASE=https://galx.ai/v1\nOPENAI_API_KEY=${createdSecretKey}`
                          : snippetTab === 'python'
                          ? `from openai import OpenAI\nclient = OpenAI(base_url="https://galx.ai/v1", api_key="${createdSecretKey}")`
                          : `curl https://galx.ai/v1/chat/completions -H "Authorization: Bearer ${createdSecretKey}"`;
                        handleCopy(snippet, 'snippet');
                      }}
                      className="absolute top-2.5 right-2.5 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'snippet' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'snippet' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpenModal(false)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black text-xs uppercase tracking-wider font-mono cursor-pointer transition-all shadow-md shadow-amber-500/20"
                >
                  Done &amp; Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-mono uppercase">Key Identifier Name</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production Backend, Local Agent, Cursor"
                    className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 font-sans"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase cursor-pointer transition-all disabled:opacity-50 font-mono"
                >
                  {isLoading ? 'Generating Key...' : 'Generate API Key'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Key Activation Paywall Modal */}
      <KeyActivationPaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onSuccess={handlePaywallSuccess}
        keyLabel={newKeyName || 'Developer API Key'}
      />
    </div>
  );
}

export const DeveloperGatewayKeys = withErrorBoundary(BaseDeveloperGatewayKeys, {
  name: 'Developer Gateway Key Manager'
});
