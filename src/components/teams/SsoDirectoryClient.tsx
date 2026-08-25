'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users2,
  ArrowRight,
  Copy,
  Check,
  Globe,
  Key,
  Sliders,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { useOrganizationStore } from '@/lib/storage/organizationStore';

export function SsoDirectoryClient() {
  const { org } = useOrganizationStore();
  const ssoConfig = org.ssoConfig;

  const [idpProvider, setIdpProvider] = useState<'okta' | 'google' | 'azure'>(ssoConfig.idpProvider);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (field: string, text: string) => {
    await safeCopyToClipboard(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden bg-gradient-to-r from-cyan-500/5 via-black/40 to-indigo-500/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Enterprise Identity &amp; Directory Sync</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              SAML 2.0 Single Sign-On &amp; SCIM
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl font-sans">
              Connect your corporate Identity Provider (Okta, Google Workspace, Azure AD) for centralized authentication, automated user provisioning, and instant de-provisioning.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <Link
              href="/solutions/enterprise"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <span>Enterprise Fleet Setup</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Step Integration Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
        {/* 1. Verified Domain Capture */}
        <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Step 1: Domain Capture</span>
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>
            <h3 className="text-sm font-bold text-white font-sans">Company Domain Capture</h3>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              Auto-enroll any employee creating an account with your company domain into this workspace.
            </p>

            <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">@{ssoConfig.domain}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                  ● Verified
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-sans">DNS TXT record: <code className="text-zinc-300">{ssoConfig.dnsTxtRecord}</code></p>
            </div>
          </div>

          <div className="pt-2 text-emerald-400 text-[11px] font-bold flex items-center gap-1 font-sans">
            <CheckCircle2 className="w-4 h-4" />
            <span>Automatic Enrollment Active</span>
          </div>
        </div>

        {/* 2. SAML 2.0 Single Sign-On */}
        <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Step 2: SAML 2.0 SSO</span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-sm font-bold text-white font-sans">Identity Provider (IdP)</h3>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              Enforce SSO via Okta, Google Workspace, or Microsoft Azure Active Directory.
            </p>

            <div className="grid grid-cols-3 gap-2 text-center">
              <button
                onClick={() => setIdpProvider('okta')}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  idpProvider === 'okta'
                    ? 'bg-amber-400/10 border-amber-400 text-amber-300 font-bold'
                    : 'bg-black/40 border-white/5 text-zinc-400'
                }`}
              >
                Okta
              </button>
              <button
                onClick={() => setIdpProvider('google')}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  idpProvider === 'google'
                    ? 'bg-amber-400/10 border-amber-400 text-amber-300 font-bold'
                    : 'bg-black/40 border-white/5 text-zinc-400'
                }`}
              >
                Google
              </button>
              <button
                onClick={() => setIdpProvider('azure')}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  idpProvider === 'azure'
                    ? 'bg-amber-400/10 border-amber-400 text-amber-300 font-bold'
                    : 'bg-black/40 border-white/5 text-zinc-400'
                }`}
              >
                Azure AD
              </button>
            </div>
          </div>

          <div className="pt-2 text-emerald-400 text-[11px] font-bold flex items-center gap-1 font-sans">
            <CheckCircle2 className="w-4 h-4" />
            <span>SAML 2.0 Connected</span>
          </div>
        </div>

        {/* 3. SCIM User Provisioning */}
        <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Step 3: SCIM Sync</span>
              <RefreshCw className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white font-sans">Automated De-provisioning</h3>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              When an employee departs your company, SCIM automatically revokes their API keys and frees their seat.
            </p>

            <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-1">
              <div className="flex justify-between text-zinc-300">
                <span>SCIM Endpoint:</span>
                <span className="text-cyan-300 font-bold">Active</span>
              </div>
              <div className="text-[10px] text-zinc-400 font-sans truncate">
                {ssoConfig.scimEndpoint}
              </div>
            </div>
          </div>

          <div className="pt-2 text-emerald-400 text-[11px] font-bold flex items-center gap-1 font-sans">
            <CheckCircle2 className="w-4 h-4" />
            <span>Real-time Directory Sync</span>
          </div>
        </div>
      </div>

      {/* SAML Configuration Endpoint Details */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white font-sans flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            SAML 2.0 Service Provider (SP) Metadata
          </h2>
          <p className="text-xs text-zinc-400 font-sans">
            Provide these endpoints to your Identity Provider (IdP) administrator to configure the SAML integration.
          </p>
        </div>

        <div className="space-y-4 font-mono text-xs">
          <div className="space-y-1">
            <div className="flex justify-between text-zinc-400 text-[10px] uppercase font-bold">
              <span>Assertion Consumer Service (ACS) URL:</span>
              <button
                onClick={() => handleCopy('acs', ssoConfig.acsUrl)}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                {copiedField === 'acs' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'acs' ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
            <input
              type="text"
              readOnly
              value={ssoConfig.acsUrl}
              className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-zinc-400 text-[10px] uppercase font-bold">
              <span>Entity ID / Audience URI:</span>
              <button
                onClick={() => handleCopy('entity', ssoConfig.entityId)}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                {copiedField === 'entity' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'entity' ? 'Copied' : 'Copy Entity ID'}</span>
              </button>
            </div>
            <input
              type="text"
              readOnly
              value={ssoConfig.entityId}
              className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
