'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Building2,
  Globe,
  Mail,
  Users2,
  ShieldAlert,
  Trash2,
  ArrowRight,
  Check,
  Save
} from 'lucide-react';
import { useOrganizationStore } from '@/lib/storage/organizationStore';
import { JurisdictionType, RoleType } from '@/lib/data/organizationData';

export function TeamSettingsClient() {
  const { org, updateOrganization } = useOrganizationStore();
  const [orgName, setOrgName] = useState(org.name);
  const [orgSlug, setOrgSlug] = useState(org.slug);
  const [billingEmail, setBillingEmail] = useState(org.billingEmail);
  const [defaultRole, setDefaultRole] = useState<RoleType>(org.defaultRole);
  const [dataJurisdiction, setDataJurisdiction] = useState<JurisdictionType>(org.jurisdiction);
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    setOrgName(org.name);
    setOrgSlug(org.slug);
    setBillingEmail(org.billingEmail);
    setDefaultRole(org.defaultRole);
    setDataJurisdiction(org.jurisdiction);
  }, [org]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrganization({
      name: orgName,
      slug: orgSlug,
      billingEmail,
      defaultRole,
      jurisdiction: dataJurisdiction
    });
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden bg-gradient-to-r from-amber-500/5 via-black/40 to-orange-500/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-amber-400" />
                <span>Organization Preferences</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Organization Profile &amp; Workspace Settings
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl font-sans">
              Manage your organization identity, workspace slug, sovereign data routing jurisdiction, and default member permissions.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              {savedStatus ? <Check className="w-4 h-4 text-black" /> : <Save className="w-4 h-4 text-black" />}
              <span>{savedStatus ? 'Saved Changes!' : 'Save Organization'}</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-xs">
        {/* Profile Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              General Organization Identity
            </h2>
            <p className="text-xs text-zinc-400 font-sans">
              Public display information visible across member invites and invoices.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px] font-bold">Organization Display Name</label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white font-sans text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px] font-bold">Workspace URL Slug</label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 rounded-l-xl bg-white/5 border border-r-0 border-white/10 text-zinc-400 font-mono text-xs">
                  galx.ai/org/
                </span>
                <input
                  type="text"
                  required
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  className="flex-1 py-2.5 px-3 rounded-r-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 uppercase text-[10px] font-bold">Invoicing &amp; Security Email</label>
              <input
                type="email"
                required
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white font-sans text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Governance & Sovereign Routing */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white font-sans flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                Sovereign Data Jurisdiction &amp; Defaults
              </h2>
              <p className="text-xs text-zinc-400 font-sans">
                Control geolocation data boundaries and default onboarding privileges.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-zinc-400 uppercase text-[10px] font-bold">Default Invite Role</label>
                <select
                  value={defaultRole}
                  onChange={(e) => setDefaultRole(e.target.value as any)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white cursor-pointer"
                >
                  <option value="developer">Developer (Full inference access)</option>
                  <option value="viewer">Viewer (Read-only observability)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 uppercase text-[10px] font-bold">Data Residency Jurisdiction</label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setDataJurisdiction('us')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      dataJurisdiction === 'us'
                        ? 'border-cyan-500 bg-cyan-500/10 text-white font-bold'
                        : 'border-white/10 bg-black/40 text-zinc-400'
                    }`}
                  >
                    <div className="font-sans text-xs">US-East Gateway</div>
                    <div className="text-[10px] font-mono text-zinc-400">Lowest latency global</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDataJurisdiction('eu')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      dataJurisdiction === 'eu'
                        ? 'border-cyan-500 bg-cyan-500/10 text-white font-bold'
                        : 'border-white/10 bg-black/40 text-zinc-400'
                    }`}
                  >
                    <div className="font-sans text-xs">EU-Frankfurt Sovereign</div>
                    <div className="text-[10px] font-mono text-zinc-400">GDPR / EU AI Act Strict</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="md:col-span-2 glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-rose-500/30 bg-rose-500/5">
          <div className="flex items-center gap-2 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="text-base font-bold font-sans">Danger Zone</h3>
          </div>
          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            Transfer ownership of this organization or delete the entire workspace including all members, cost centers, and API keys. This action is irreversible.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold border border-white/10 transition-all cursor-pointer"
            >
              Transfer Organization Ownership
            </button>
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold border border-rose-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Organization</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
