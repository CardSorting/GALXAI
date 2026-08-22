'use client';

import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Check, ShieldAlert, Sparkles, X, Gift } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';
import { useDepositVerification } from '@/lib/hooks/useDepositVerification';
import { KeyActivationPaywallModal } from '@/components/keys/KeyActivationPaywallModal';

export function DeveloperGatewayKeys() {
  const [keys, setKeys] = useState<any[]>([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdSecretKey, setCreatedSecretKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { hasVerifiedDeposit, walletBalance, depositAndUnlock } = useDepositVerification();

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/keys');
      const data = await res.json();
      setKeys(data.keys || []);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const createKeyDirectly = async (keyName: string, balance: number) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: keyName.trim() || 'Developer API Key',
          hasVerifiedDeposit: true,
          depositedAmount: balance
        })
      });
      const data = await res.json();
      if (data.success && data.key?.apiKey) {
        setCreatedSecretKey(data.key.apiKey);
        setNewKeyName('');
        fetchKeys();
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasVerifiedDeposit) {
      setIsOpenModal(false);
      setIsPaywallOpen(true);
      return;
    }
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
      await fetch(`/api/keys?id=${keyId}`, { method: 'DELETE' });
      fetchKeys();
    } catch {
      // Ignore
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
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
              Developer Gateway Bearer Keys
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold border border-indigo-500/30">
              {keys.filter(k => !k.revoked).length} Active
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Use these keys as standard Bearer tokens in any OpenAI SDK or agent runtime pointing to <code className="text-cyan-300">https://galx.ai/v1</code>.
          </p>
        </div>

        <button
          onClick={() => {
            setCreatedSecretKey(null);
            setIsOpenModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Gateway Key
        </button>
      </div>

      {/* Keys Table */}
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
                <th className="py-3 px-4">Requests</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-white/[0.02]">
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

      {/* Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md glass-panel border border-indigo-500/30 rounded-3xl p-6 shadow-2xl">
            <button
              onClick={() => setIsOpenModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {createdSecretKey ? (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                    <Key className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black text-white">Save Your Gateway API Key</h3>
                  <p className="text-xs text-zinc-400">
                    This key will only be displayed once. Copy and store it securely.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/60 border border-emerald-500/40 font-mono text-xs text-emerald-300 break-all flex items-center justify-between gap-2">
                  <span>{createdSecretKey}</span>
                  <button
                    onClick={() => handleCopy(createdSecretKey, 'modal')}
                    className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-all cursor-pointer shrink-0"
                  >
                    {copiedKey === 'modal' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={() => setIsOpenModal(false)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black text-white">Create Developer Gateway Key</h3>
                  <p className="text-xs text-zinc-400">Generates a <code className="text-cyan-300 font-mono">galx_live_...</code> bearer token.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">Key Name / Description</label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production Backend, Local Agent, Cursor"
                    className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs uppercase cursor-pointer transition-all disabled:opacity-50"
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
