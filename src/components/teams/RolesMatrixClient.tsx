'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Check,
  X,
  UserPlus,
  Key,
  Lock,
  DollarSign,
  Activity,
  ArrowRight,
  Sparkles,
  Layers,
  HelpCircle,
  Users2
} from 'lucide-react';
import { ROLE_PERMISSIONS, type RolePermission } from '@/lib/data/pricingData';

export function RolesMatrixClient() {
  const [selectedRole, setSelectedRole] = useState<string>('all');

  const filteredRoles = selectedRole === 'all'
    ? ROLE_PERMISSIONS
    : ROLE_PERMISSIONS.filter(r => r.role === selectedRole);

  const capabilities = [
    { key: 'canExecuteInference', label: 'Execute API Inference', category: 'Compute', description: 'Make authenticated LLM and image generation requests' },
    { key: 'canCreateKeys', label: 'Mint & Revoke API Keys', category: 'Access', description: 'Create personal and squad gateway API keys' },
    { key: 'canManageMembers', label: 'Invite & Manage Seats', category: 'Governance', description: 'Add team members, assign roles, and revoke seats' },
    { key: 'canViewBilling', label: 'Manage Billing Records', category: 'Finance', description: 'View financial records, download tax invoices, and review existing account credit' },
    { key: 'canTopUpWallet', label: 'Manage Account-Credit Records', category: 'Finance', description: 'Review historical credit adjustments and related billing records' },
    { key: 'canConfigureSSO', label: 'Configure SAML SSO & SCIM', category: 'Security', description: 'Set up Okta / Google Workspace identity providers' },
    { key: 'canViewAuditLogs', label: 'View SOC 2 Audit Logs', category: 'Compliance', description: 'Inspect immutable cryptographic session and key access logs' },
    { key: 'canManageVaultSecrets', label: 'Manage API Keys', category: 'Security', description: 'Manage authorized API credentials' },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden bg-gradient-to-r from-emerald-500/5 via-black/40 to-cyan-500/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero-Trust Role-Based Access Control</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              RBAC Roles &amp; Deterministic Permissions
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl font-sans">
              Enforce least-privilege security across your engineering organization. Restrict API key generation, budget modifications, and audit access with granular role assignments.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <Link
              href="/teams/seats"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Users2 className="w-4 h-4 text-black" />
              <span>Assign Roles to Seats</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Role Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 font-mono text-xs">
        <button
          onClick={() => setSelectedRole('all')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
            selectedRole === 'all'
              ? 'bg-white/15 text-white border border-white/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          All 5 Roles
        </button>
        {ROLE_PERMISSIONS.map((r) => (
          <button
            key={r.role}
            onClick={() => setSelectedRole(r.role)}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedRole === r.role
                ? 'bg-amber-400 text-black shadow-md shadow-amber-500/10'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{r.title}</span>
          </button>
        ))}
      </div>

      {/* Roles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoles.map((role) => (
          <div
            key={role.role}
            className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white font-sans">{role.title}</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${role.color}`}>
                  {role.badge}
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">{role.description}</p>
            </div>

            <div className="space-y-2 pt-3 border-t border-white/5 font-mono text-xs">
              <span className="text-[10px] text-zinc-500 uppercase font-bold">Granted Capabilities:</span>
              <ul className="space-y-1.5 text-[11px]">
                {capabilities.map((cap) => {
                  const hasAccess = (role as any)[cap.key];
                  return (
                    <li key={cap.key} className="flex items-center justify-between gap-2">
                      <span className={hasAccess ? 'text-zinc-200 font-sans' : 'text-zinc-600 line-through font-sans'}>
                        {cap.label}
                      </span>
                      {hasAccess ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="pt-2">
              <Link
                href={`/teams/seats?role=${role.role}`}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all border border-white/10"
              >
                <span>Filter Seats with this Role</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
