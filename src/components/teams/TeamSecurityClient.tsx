'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Lock,
  Key,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Check,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useOrganizationStore } from '@/lib/storage/organizationStore';

export function TeamSecurityClient() {
  const {
    org,
    updateSecurityPolicy,
    addAllowedIpCidr,
    removeAllowedIpCidr
  } = useOrganizationStore();

  const [newIpInput, setNewIpInput] = useState('');
  const [savedStatus, setSavedStatus] = useState(false);

  const securityPolicy = org.securityPolicy;

  const handleAddIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIpInput.trim()) return;
    addAllowedIpCidr(newIpInput.trim());
    setNewIpInput('');
  };

  const handleRemoveIp = (index: number) => {
    removeAllowedIpCidr(index);
  };

  const handleToggle2FA = () => {
    updateSecurityPolicy({ enforce2FA: !securityPolicy.enforce2FA });
  };

  const handleSessionTimeoutChange = (val: string) => {
    const hours = parseInt(val, 10);
    updateSecurityPolicy({ sessionTimeoutHours: hours });
  };

  const handleKeyMaxAgeChange = (val: string) => {
    const days = parseInt(val, 10);
    updateSecurityPolicy({ apiKeyMaxAgeDays: days });
  };

  const handleSave = () => {
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden bg-gradient-to-r from-cyan-500/5 via-black/40 to-indigo-500/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Zero-Trust Organization Security</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Security Policies, 2FA &amp; IP Allowlisting
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl font-sans">
              Enforce corporate security baselines across all workspace members. Restrict API execution to trusted corporate IP ranges and enforce mandatory two-factor authentication.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              {savedStatus ? <Check className="w-4 h-4 text-black" /> : <ShieldCheck className="w-4 h-4 text-black" />}
              <span>{savedStatus ? 'Saved Policies!' : 'Apply Security Rules'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-xs">
        {/* 1. Mandatory 2FA Enforcement */}
        <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Authentication Baseline</span>
              <Lock className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-sm font-bold text-white font-sans">Mandatory 2FA Enforcement</h3>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              Require all members to authenticate with a hardware key (WebAuthn / YubiKey) or TOTP authenticator app before accessing workspace keys.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
            <span className="text-white font-bold font-sans">Enforce 2FA for all members:</span>
            <button
              onClick={handleToggle2FA}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${securityPolicy.enforce2FA ? 'bg-emerald-500' : 'bg-zinc-700'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${securityPolicy.enforce2FA ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* 2. Session & Key Rotation Policies */}
        <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Session Expiration</span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <h3 className="text-sm font-bold text-white font-sans">Web Console &amp; Key Rotation</h3>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              Configure maximum browser session length and automated key retirement policies.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-zinc-300 font-sans">Session Timeout:</span>
              <select
                value={`${securityPolicy.sessionTimeoutHours}h`}
                onChange={(e) => handleSessionTimeoutChange(e.target.value)}
                className="py-1 px-2.5 rounded-lg bg-black/60 border border-white/10 text-white cursor-pointer"
              >
                <option value="12h">12 Hours</option>
                <option value="24h">24 Hours (Recommended)</option>
                <option value="168h">7 Days</option>
                <option value="720h">30 Days</option>
              </select>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-300 font-sans">API Key Max Age:</span>
              <select
                value={securityPolicy.apiKeyMaxAgeDays.toString()}
                onChange={(e) => handleKeyMaxAgeChange(e.target.value)}
                className="py-1 px-2.5 rounded-lg bg-black/60 border border-white/10 text-white cursor-pointer"
              >
                <option value="90">90 Days (SOC 2 Standard)</option>
                <option value="180">180 Days</option>
                <option value="365">1 Year</option>
                <option value="0">Never Expire</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. IP CIDR Allowlisting */}
        <div className="md:col-span-2 glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white font-sans flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                Corporate IP / CIDR Allowlisting
              </h2>
              <span className="px-2.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                {securityPolicy.allowedIpCidrs.length} Active CIDR Rules
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              Restrict API gateway traffic to corporate IP addresses, VPC NAT gateways, and VPN subnets. Requests from unlisted IPs will receive 403 Forbidden.
            </p>
          </div>

          {/* Add IP Form */}
          <form onSubmit={handleAddIp} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 198.51.100.0/24 (Production VPC)"
              value={newIpInput}
              onChange={(e) => setNewIpInput(e.target.value)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold border border-white/15 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add CIDR Range</span>
            </button>
          </form>

          {/* IP List */}
          <div className="space-y-2 pt-2">
            {securityPolicy.allowedIpCidrs.map((ip, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between font-mono text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-zinc-200">{ip}</span>
                </div>
                <button
                  onClick={() => handleRemoveIp(idx)}
                  className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Remove Rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
