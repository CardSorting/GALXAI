'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  UserPlus,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Globe,
  Sliders,
  Send,
  Shield,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { useOrganizationStore } from '@/lib/storage/organizationStore';
import { RoleType } from '@/lib/data/organizationData';

export function PendingInvitesClient() {
  const { org, invites, createInvites, revokeInvite } = useOrganizationStore();
  const [emailsInput, setEmailsInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleType>('developer');
  const [initialSpendCap, setInitialSpendCap] = useState(150);
  const [domainAutoJoin, setDomainAutoJoin] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleSendInvites = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailsInput.trim()) return;

    const parsedEmails = emailsInput
      .split(/[\n,]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0 && e.includes('@'));

    if (parsedEmails.length === 0) return;

    createInvites(parsedEmails, selectedRole, initialSpendCap);
    setEmailsInput('');
  };

  const handleResend = (id: string) => {
    setResendStatus(id);
    setTimeout(() => setResendStatus(null), 2000);
  };

  const handleCopyMagicLink = async () => {
    await safeCopyToClipboard(`https://galx.ai/join/${org.slug}?token=galx_inv_sec_99a8b7c6`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden bg-gradient-to-r from-amber-500/5 via-black/40 to-orange-500/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>Team Invitation Gateway</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Pending Team Invites &amp; Join Links
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl font-sans">
              Invite colleagues via email, configure their initial spend safety caps, and generate 1-click shareable magic links with automated expiration.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={handleCopyMagicLink}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold border border-white/15 flex items-center gap-2 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Magic Invite Link'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Send Invites Form */}
        <div className="lg:col-span-5 glass-panel rounded-3xl p-6 space-y-6 border border-white/10">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-amber-400" />
              Invite New Team Members
            </h2>
            <p className="text-xs text-zinc-400">
              Enter one or multiple corporate emails. Invites expire in 7 days.
            </p>
          </div>

          <form onSubmit={handleSendInvites} className="space-y-4 font-mono text-xs">
            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px] font-bold">Email Addresses</label>
              <textarea
                required
                rows={3}
                placeholder="dev1@acme.ai, dev2@acme.ai&#10;sarah.ml@acme.ai"
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                className="w-full p-3 rounded-xl bg-black/60 border border-white/10 text-white font-sans text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px] font-bold">Assigned RBAC Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white cursor-pointer"
              >
                <option value="developer">Developer (Inference + Personal Keys)</option>
                <option value="admin">Admin (Invite Members + View Keys)</option>
                <option value="billing">FinOps / Billing (Invoices &amp; Caps)</option>
                <option value="viewer">Viewer (Read-Only Metrics)</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400 uppercase text-[10px] font-bold">Monthly Spend Safety Cap:</span>
                <span className="text-amber-300 font-bold">${initialSpendCap} / mo</span>
              </div>
              <input
                type="range"
                min="25"
                max="500"
                step="25"
                value={initialSpendCap}
                onChange={(e) => setInitialSpendCap(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer font-mono"
            >
              <Send className="w-4 h-4 text-black" />
              <span>Dispatch Invitations</span>
            </button>
          </form>

          {/* Domain Auto-Join Toggle */}
          <div className="pt-4 border-t border-white/5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-white font-bold flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Domain Auto-Join</span>
                </div>
                <div className="text-[11px] text-zinc-400 font-sans">
                  Allow anyone with <strong>@{org.ssoConfig.domain}</strong> to auto-join.
                </div>
              </div>
              <button
                onClick={() => setDomainAutoJoin(!domainAutoJoin)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${domainAutoJoin ? 'bg-emerald-500' : 'bg-zinc-700'}`}
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${domainAutoJoin ? 'left-5' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Pending Invites Roster */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-6 space-y-4 border border-white/10 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-white font-sans">Active Pending Invitations</h3>
              <p className="text-[11px] text-zinc-400 font-sans">
                {invites.length} pending invitations awaiting acceptance.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-zinc-300 font-bold">
              {invites.length} Pending
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {invites.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-black/30 border border-white/5 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-zinc-300 font-sans">No pending invitations.</p>
                <p className="text-[11px] text-zinc-400 font-sans">All invited colleagues have accepted their seats.</p>
              </div>
            ) : (
              invites.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 font-sans">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{inv.email}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                        {inv.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono">
                      Cap: ${inv.spendCapUsd}/mo • Invited {inv.invitedAt} (Expires in {inv.expiresInDays}d)
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <button
                      onClick={() => handleResend(inv.id)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {resendStatus === inv.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Sent!</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Resend</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => revokeInvite(inv.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                      title="Revoke Invitation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
