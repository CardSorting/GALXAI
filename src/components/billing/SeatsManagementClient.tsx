'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users2,
  Shield,
  ShieldCheck,
  UserPlus,
  Sliders,
  DollarSign,
  Key,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Lock,
  ArrowRight,
  MoreVertical,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Zap,
  Building2,
  CreditCard,
  Download,
  X
} from 'lucide-react';
import { SEAT_TIERS, ROLE_PERMISSIONS, type RolePermission } from '@/lib/data/pricingData';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { useOrganizationStore } from '@/lib/storage/organizationStore';
import { RoleType } from '@/lib/data/organizationData';
import { useAuth } from '@/contexts/AuthContext';

export function SeatsManagementClient() {
  const { user } = useAuth();
  const {
    org,
    members,
    updateMemberRole,
    updateMemberSpendCap,
    removeMember,
    setSeatCapacity,
    createInvites
  } = useOrganizationStore();

  const workspaceName = user?.company || org.name || 'Acme AI Corp';
  const tierName = user?.role === 'enterprise' ? 'Enterprise Fleet' : 'Small Business Tier';
  const totalSeats = org.seatCapacity;
  const [activeTab, setActiveTab] = useState<'roster' | 'permissions' | 'sso'>('roster');
  
  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAdjustSeatsModalOpen, setIsAdjustSeatsModalOpen] = useState(false);
  const [selectedMemberForCap, setSelectedMemberForCap] = useState<any | null>(null);

  // Invite Form State
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState<RoleType>('developer');
  const [inviteDepartment, setInviteDepartment] = useState('Engineering');
  const [inviteSpendCap, setInviteSpendCap] = useState(250);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState(false);

  // Adjust Seats Slider State
  const [newSeatCount, setNewSeatCount] = useState(totalSeats);
  const [copiedCsv, setCopiedCsv] = useState(false);

  // Computed metrics
  const activeMembersCount = members.filter(m => m.status === 'active').length;
  const invitedMembersCount = members.filter(m => m.status === 'invited').length;
  const usedSeatsCount = members.length;
  const availableSeatsCount = Math.max(0, totalSeats - usedSeatsCount);
  const totalIncurredSpend = members.reduce((acc, m) => acc + m.monthlySpendUsd, 0);
  const totalAllocatedCap = members.reduce((acc, m) => acc + m.monthlySpendCapUsd, 0);

  // Seat pricing computations
  const smallBusinessTier = SEAT_TIERS.find(t => t.id === 'small-business')!;
  const includedSeats = smallBusinessTier.includedSeats; // 5
  const extraSeats = Math.max(0, totalSeats - includedSeats);
  const monthlySeatSubscriptionUsd = smallBusinessTier.basePriceUsd + (extraSeats * smallBusinessTier.perSeatPriceUsd);

  // Handlers
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmails.trim()) return;

    const emailList = inviteEmails.split(/[,;\n]+/).map(e => e.trim()).filter(Boolean);
    if (emailList.length === 0) return;

    createInvites(emailList, inviteRole, inviteSpendCap);
    setInviteEmails('');
    setInviteSuccessMsg(true);
    setTimeout(() => {
      setInviteSuccessMsg(false);
      setIsInviteModalOpen(false);
    }, 1500);
  };

  const handleRoleChange = (memberId: string, newRole: RoleType) => {
    updateMemberRole(memberId, newRole);
  };

  const handleUpdateCap = (memberId: string, newCap: number) => {
    updateMemberSpendCap(memberId, newCap);
    setSelectedMemberForCap(null);
  };

  const handleRevokeMember = (memberId: string) => {
    if (confirm('Are you sure you want to revoke this seat? The member will immediately lose access to all API keys.')) {
      removeMember(memberId);
    }
  };

  const handleSaveSeatCount = () => {
    setSeatCapacity(newSeatCount);
    setIsAdjustSeatsModalOpen(false);
  };

  const handleCopyInviteLink = async () => {
    const slug = (user?.company || org.name || 'acme-ai').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const inviteUrl = `https://galx.ai/auth/join?team=${slug}&ref=${Date.now()}`;
    await safeCopyToClipboard(inviteUrl);
    setInviteLinkCopied(true);
    setTimeout(() => setInviteLinkCopied(false), 2000);
  };

  const handleExportCsv = () => {
    const csvRows = [
      ['Name', 'Email', 'Role', 'Department', 'Status', 'Assigned Keys', 'Current Spend USD', 'Monthly Cap USD', 'SSO Active', '2FA Active'].join(','),
      ...members.map(m => [
        `"${m.name}"`,
        `"${m.email}"`,
        m.role,
        `"${m.department}"`,
        m.status,
        m.assignedKeysCount || 1,
        m.monthlySpendUsd.toFixed(2),
        m.monthlySpendCapUsd.toFixed(2),
        m.ssoEnabled ? 'Yes' : 'No',
        m.twoFactorEnabled ? 'Yes' : 'No',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `galxai_seats_roster_${Date.now()}.csv`;
    a.click();
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Workspace Identity Strip */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden bg-gradient-to-r from-amber-500/5 via-black/40 to-cyan-500/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{workspaceName} • {tierName}</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold">
                ● 100% Active Sovereign Governance
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Seats &amp; Team Member Governance
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
              Provision seats, allocate monthly compute caps, assign role-based permissions (RBAC), and monitor individual inference spend in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-mono font-bold flex items-center gap-2 border border-white/10 transition-all cursor-pointer"
            >
              {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              <span>{copiedCsv ? 'Exported!' : 'Export Roster CSV'}</span>
            </button>

            <button
              onClick={() => {
                setNewSeatCount(totalSeats);
                setIsAdjustSeatsModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-bold flex items-center gap-2 border border-white/20 transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Modify Seats ({totalSeats})</span>
            </button>

            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider font-mono flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-black" />
              <span>Invite Members</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Executive Seat KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* Seat Utilization */}
        <div className="glass-panel p-5 rounded-3xl space-y-2 border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center justify-between text-xs text-amber-400">
            <span className="font-sans font-semibold uppercase text-[10px]">Seat Capacity</span>
            <Users2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-white">
            {usedSeatsCount} <span className="text-zinc-500 text-sm font-normal">/ {totalSeats} Seats</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${(usedSeatsCount / totalSeats) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-zinc-400 pt-0.5">
            <span>{availableSeatsCount} seats available</span>
            <span className="text-amber-400 font-bold">{((usedSeatsCount / totalSeats) * 100).toFixed(0)}% utilized</span>
          </div>
        </div>

        {/* Monthly Plan & Credits */}
        <div className="glass-panel p-5 rounded-3xl space-y-2 border border-cyan-500/30 bg-cyan-500/5">
          <div className="flex items-center justify-between text-xs text-cyan-400">
            <span className="font-sans font-semibold uppercase text-[10px]">Seat Subscription</span>
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-cyan-300">
            ${monthlySeatSubscriptionUsd} <span className="text-zinc-500 text-sm font-normal">/ mo</span>
          </div>
          <p className="text-[11px] text-zinc-400 font-sans">
            Includes <strong>$100.00/mo</strong> free pooled compute credits
          </p>
          <div className="text-[11px] text-cyan-400 font-bold pt-0.5">
            +{extraSeats * 15 > 0 ? `$${extraSeats * 15} for ${extraSeats} extra seats` : '5 base seats active'}
          </div>
        </div>

        {/* Team Incurred Spend */}
        <div className="glass-panel p-5 rounded-3xl space-y-2 border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span className="font-sans font-semibold uppercase text-[10px]">Active Token Spend</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-300">
            ${totalIncurredSpend.toFixed(2)} <span className="text-zinc-500 text-sm font-normal">USD</span>
          </div>
          <p className="text-[11px] text-zinc-400 font-sans">
            Total Cap: <strong>${totalAllocatedCap.toFixed(2)}</strong> across team
          </p>
          <div className="text-[11px] text-emerald-400 font-bold pt-0.5">
            {((totalIncurredSpend / Math.max(1, totalAllocatedCap)) * 100).toFixed(1)}% of safety limit used
          </div>
        </div>

        {/* Security & SSO Status */}
        <div className="glass-panel p-5 rounded-3xl space-y-2 border border-white/10">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-sans font-semibold uppercase text-[10px]">Security Posture</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {members.filter(m => m.twoFactorEnabled).length} / {members.length}
          </div>
          <p className="text-[11px] text-zinc-400 font-sans">
            Enforced 2FA &amp; Role-based isolation
          </p>
          <div className="text-[11px] text-zinc-400 pt-0.5 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Zero Data Retention Active</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs: Roster | Role Matrix | SSO Config */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 font-mono text-xs">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'roster'
              ? 'bg-amber-400 text-black shadow-lg shadow-amber-500/10'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users2 className="w-3.5 h-3.5" />
          <span>Team Roster ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'permissions'
              ? 'bg-amber-400 text-black shadow-lg shadow-amber-500/10'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Role Permissions Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('sso')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'sso'
              ? 'bg-amber-400 text-black shadow-lg shadow-amber-500/10'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Enterprise SSO &amp; SCIM</span>
        </button>
      </div>

      {/* TAB 1: TEAM ROSTER */}
      {activeTab === 'roster' && (
        <div className="glass-panel rounded-3xl p-6 overflow-x-auto space-y-4 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users2 className="w-4 h-4 text-amber-400" />
                Active Seat Roster ({members.length} of {totalSeats} Seats)
              </h2>
              <p className="text-xs text-zinc-400">
                Manage roles, modify individual monthly spend caps, or re-invite team members.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400">
                Available Seats: <strong className="text-emerald-400">{availableSeatsCount}</strong>
              </span>
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4 font-sans">Team Member</th>
                <th className="py-3 px-4 font-sans">Role</th>
                <th className="py-3 px-4 font-sans">Department</th>
                <th className="py-3 px-4 font-sans">API Keys</th>
                <th className="py-3 px-4 font-sans">Monthly Spend / Cap</th>
                <th className="py-3 px-4 font-sans">Status</th>
                <th className="py-3 px-4 font-sans text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members.map((member) => {
                const isOwner = member.role === 'owner';
                const utilPct = Math.min(100, (member.monthlySpendUsd / Math.max(1, member.monthlySpendCapUsd)) * 100);

                return (
                  <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Member Name & Email */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl ${member.avatarBg} flex items-center justify-center font-bold text-xs shrink-0 shadow-sm`}>
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white font-sans flex items-center gap-1.5">
                            <span>{member.name}</span>
                            {isOwner && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono font-bold">
                                Owner
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400">{member.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role Dropdown */}
                    <td className="py-3.5 px-4">
                      {isOwner ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-[10px]">
                          Workspace Owner
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as any)}
                          aria-label={`Role for ${member.name}`}
                          className="py-1 px-2.5 rounded-lg bg-black/60 border border-white/10 text-white font-mono text-[11px] focus:outline-none focus:border-amber-500 cursor-pointer"
                        >
                          <option value="admin">Admin</option>
                          <option value="developer">Developer</option>
                          <option value="billing">FinOps / Billing</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 text-zinc-300 font-sans text-xs">
                      {member.department}
                    </td>

                    {/* Keys count */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10 text-[11px]">
                        {member.assignedKeysCount || 1} keys
                      </span>
                    </td>

                    {/* Monthly Spend & Cap */}
                    <td className="py-3.5 px-4 space-y-1 min-w-[140px]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-white font-bold">${member.monthlySpendUsd.toFixed(2)}</span>
                        <span className="text-zinc-400">/ ${member.monthlySpendCapUsd}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            utilPct > 85 ? 'bg-rose-400' : utilPct > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${utilPct}%` }}
                        />
                      </div>
                    </td>

                    {/* Status & Last Active */}
                    <td className="py-3.5 px-4">
                      {member.status === 'active' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                          <div className="text-[10px] text-zinc-400">{member.lastActiveAt || 'Active'}</div>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-amber-400 text-[11px] font-bold">
                            <Clock className="w-3 h-3" />
                            <span>Invited</span>
                          </span>
                          <div className="text-[10px] text-zinc-400">Pending accept</div>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedMemberForCap(member)}
                          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[10px] transition-colors cursor-pointer"
                          title="Modify Spend Cap"
                        >
                          Edit Cap
                        </button>

                        {!isOwner && (
                          <button
                            onClick={() => handleRevokeMember(member.id)}
                            className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                            title="Revoke Seat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* TAB 2: ROLE PERMISSIONS MATRIX */}
      {activeTab === 'permissions' && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              Role-Based Access Control (RBAC) Permissions Matrix
            </h2>
            <p className="text-xs text-zinc-400">
              Each team member assigned to a seat is restricted to deterministic, zero-trust permissions based on their role.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLE_PERMISSIONS.map((perm) => (
              <div key={perm.role} className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white font-sans">{perm.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${perm.color}`}>
                      {perm.role.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">{perm.description}</p>
                </div>

                <ul className="space-y-1.5 pt-2 border-t border-white/5 font-mono text-[11px]">
                  <li className="flex items-center gap-2">
                    {perm.canExecuteInference ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-zinc-600" />}
                    <span className={perm.canExecuteInference ? 'text-zinc-200' : 'text-zinc-500 line-through'}>Execute API Inference</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {perm.canCreateKeys ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-zinc-600" />}
                    <span className={perm.canCreateKeys ? 'text-zinc-200' : 'text-zinc-500 line-through'}>Mint &amp; Revoke API Keys</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {perm.canManageMembers ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-zinc-600" />}
                    <span className={perm.canManageMembers ? 'text-zinc-200' : 'text-zinc-500 line-through'}>Invite &amp; Manage Seats</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {perm.canViewBilling ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-zinc-600" />}
                    <span className={perm.canViewBilling ? 'text-zinc-200' : 'text-zinc-500 line-through'}>Manage Wallet &amp; Invoices</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {perm.canConfigureSSO ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-zinc-600" />}
                    <span className={perm.canConfigureSSO ? 'text-zinc-200' : 'text-zinc-500 line-through'}>Configure SAML SSO &amp; SCIM</span>
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ENTERPRISE SSO & SCIM DIRECTORY */}
      {activeTab === 'sso' && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-cyan-400" />
                Enterprise SAML 2.0 Single Sign-On &amp; SCIM Directory Sync
              </h2>
              <p className="text-xs text-zinc-400">
                Automate employee onboarding, enforce corporate identity providers, and prevent credential sprawl.
              </p>
            </div>

            <Link
              href="/solutions/enterprise"
              className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
            >
              <span>Enterprise Fleet Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Domain Capture</span>
              <div className="text-sm font-bold text-white">@acme.ai</div>
              <p className="text-[11px] text-zinc-400 font-sans">
                Automatically routes any engineer signing up with an @acme.ai email directly to this workspace.
              </p>
              <div className="pt-2 text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Domain</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Identity Provider (IdP)</span>
              <div className="text-sm font-bold text-white">Okta / Google Workspace</div>
              <p className="text-[11px] text-zinc-400 font-sans">
                SAML 2.0 assertion certificate configured with mandatory 2-Factor Authentication.
              </p>
              <div className="pt-2 text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>SAML Connected</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">SCIM Directory Sync</span>
              <div className="text-sm font-bold text-white">Automated Offboarding</div>
              <p className="text-[11px] text-zinc-400 font-sans">
                Instantly revokes gateway API keys and deletes seats when an employee is removed in Okta.
              </p>
              <div className="pt-2 text-cyan-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Real-Time Sync Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: INVITE MEMBERS MODAL */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 border border-amber-500/30 bg-[#0d101c] shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Invite Colleagues to Workspace</h3>
                  <p className="text-[11px] text-zinc-400">{availableSeatsCount} seats available in current plan</p>
                </div>
              </div>

              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Invitations sent successfully! Team members will receive an email activation link.</span>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 uppercase text-[10px] font-bold">Email Addresses (Comma or newline separated)</label>
                <textarea
                  required
                  rows={3}
                  placeholder="engineer1@acme.ai, designer@acme.ai"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white font-sans text-xs focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase text-[10px] font-bold">Role Assignment</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="developer">Developer</option>
                    <option value="admin">Administrator</option>
                    <option value="billing">FinOps / Billing</option>
                    <option value="viewer">Viewer (Read-Only)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 uppercase text-[10px] font-bold">Department / Cost Center</label>
                  <input
                    type="text"
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-white font-sans text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-zinc-400 uppercase text-[10px] font-bold">Monthly Spend Safety Cap</label>
                  <span className="text-amber-400 font-bold">${inviteSpendCap} / mo</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="50"
                  value={inviteSpendCap}
                  onChange={(e) => setInviteSpendCap(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Quick Shareable Invite Link */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2">
                <div className="text-[11px] text-zinc-400 truncate">
                  Or copy unique team invite link: <span className="text-zinc-200">galx.ai/auth/join?team=acme-ai</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-zinc-200 text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {inviteLinkCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{inviteLinkCopied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-bold font-mono transition-all cursor-pointer"
                >
                  Send Invitations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUST TOTAL SEATS MODAL */}
      {isAdjustSeatsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 border border-cyan-500/30 bg-[#0d101c] shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Adjust Workspace Seat Capacity</h3>
                  <p className="text-[11px] text-zinc-400">Scale seats dynamically with instant proration</p>
                </div>
              </div>

              <button
                onClick={() => setIsAdjustSeatsModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 font-mono text-xs">
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-400 uppercase text-[10px] font-bold">Total Provisioned Seats:</span>
                  <span className="text-2xl font-black text-cyan-300">{newSeatCount} Seats</span>
                </div>

                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={newSeatCount}
                  onChange={(e) => setNewSeatCount(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none"
                />

                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>5 Seats (Base)</span>
                  <span>25 Seats (Squad)</span>
                  <span>50 Seats (Scale)</span>
                </div>
              </div>

              {/* Cost Summary Breakdown */}
              <div className="p-4 rounded-2xl bg-black/50 border border-white/5 space-y-2">
                <div className="flex justify-between text-zinc-400">
                  <span>Base Plan (5 Seats Included):</span>
                  <span className="text-white font-bold">$75.00 / mo</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Extra Seats ({Math.max(0, newSeatCount - 5)} × $15):</span>
                  <span className="text-white font-bold">${Math.max(0, newSeatCount - 5) * 15}.00 / mo</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Monthly Free Compute Credits:</span>
                  <span className="text-emerald-400 font-bold">+$100.00 / mo included</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-bold">
                  <span className="text-white">New Monthly Total:</span>
                  <span className="text-cyan-300 font-black">${75 + Math.max(0, newSeatCount - 5) * 15}.00 USD</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustSeatsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSeatCount}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-bold font-mono transition-all cursor-pointer"
                >
                  Confirm Seat Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT MEMBER CAP MODAL */}
      {selectedMemberForCap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 space-y-4 border border-white/10 bg-[#0d101c] shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-sans">
                Set Monthly Spend Cap for {selectedMemberForCap.name}
              </h3>
              <button
                onClick={() => setSelectedMemberForCap(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Monthly Limit:</span>
                  <span className="text-amber-400 font-bold">${selectedMemberForCap.monthlySpendCapUsd} USD</span>
                </div>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  step="25"
                  value={selectedMemberForCap.monthlySpendCapUsd}
                  onChange={(e) => setSelectedMemberForCap({
                    ...selectedMemberForCap,
                    monthlySpendCapUsd: Number(e.target.value)
                  })}
                  className="w-full py-2 px-3 rounded-xl bg-black/60 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMemberForCap(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateCap(selectedMemberForCap.id, selectedMemberForCap.monthlySpendCapUsd)}
                  className="px-5 py-1.5 rounded-xl bg-amber-400 text-black font-bold"
                >
                  Save Cap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
