'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Lock,
  ShieldCheck,
  Zap,
  Users2,
  Building2,
  Key,
  ArrowRight,
  Sparkles,
  Github,
  Loader2,
  CheckCircle2,
  Sliders,
  Mail,
  Activity
} from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';

interface TeamsAuthGuardProps {
  children: React.ReactNode;
}

export function TeamsAuthGuard({ children }: TeamsAuthGuardProps) {
  const { user, isLoading, signInWithDemo, signInWithOAuth, signInWithSSO } = useAuth();
  const currentPath = usePathname() || '/teams/seats';
  const targetPath = currentPath === '/teams' ? '/teams/seats' : currentPath;
  const [ssoDomain, setSsoDomain] = useState('');
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [isDemoSigningIn, setIsDemoSigningIn] = useState(false);

  // 1. Sleek Loading State while verifying session
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#07090e] text-zinc-100">
        <Navigation />
        <main className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10 animate-pulse">
              <Users2 className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-white tracking-wide font-sans">
              Authenticating Workspace Session...
            </p>
            <p className="text-xs text-zinc-400 font-mono">
              Verifying RBAC permissions &amp; seat allocation ledger
            </p>
          </div>
        </main>
      </div>
    );
  }

  // 2. Unauthenticated Gate: Enterprise Workspace Gateway
  if (!user) {
    const handleQuickDemo = () => {
      setIsDemoSigningIn(true);
      setTimeout(() => {
        signInWithDemo({
          role: 'lead',
          name: 'Alexander Chen (Lead Engineer)',
          email: 'alexander.chen@acme.ai'
        });
        setIsDemoSigningIn(false);
      }, 350);
    };

    const handleOAuthLogin = async (provider: 'github' | 'google') => {
      setOauthLoading(provider);
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        await signInWithOAuth(provider, {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(targetPath)}`
        });
      } catch {
        setOauthLoading(null);
      }
    };

    const handleSsoSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!ssoDomain.trim()) return;
      setSsoLoading(true);
      setSsoError(null);
      try {
        const res = await signInWithSSO({ domain: ssoDomain.trim() });
        if (!res.success) {
          setSsoError(res.error || 'Failed to authenticate with corporate SSO domain.');
        }
      } catch (err: any) {
        setSsoError(err.message || 'SSO authentication error.');
      } finally {
        setSsoLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex flex-col bg-[#07090e] text-zinc-100 selection:bg-amber-400 selection:text-black">
        <Navigation />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
          {/* Main Glass Card */}
          <div className="relative rounded-3xl border border-amber-500/25 bg-gradient-to-b from-[#0f1422] via-[#0b0e17] to-[#07090e] shadow-2xl p-6 sm:p-10 overflow-hidden space-y-8">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Top Header Badge */}
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>WORKSPACE AUTHENTICATION REQUIRED</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Sign In to Access Team Seats &amp; Governance
              </h1>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                Seat allocation meters, member invitations, role-based access control (RBAC), and compute spend limits are private to verified workspace members.
              </p>
            </div>

            {/* 3 Value Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Sliders className="w-4 h-4" />
                  <span>Dynamic Seat Scaling</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-sans leading-normal">
                  Scale seats on-demand with instant prorated billing and team compute pooling.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Granular RBAC Policies</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-sans leading-normal">
                  Assign Owner, Admin, Developer, or Viewer permissions with hardware-level isolation.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Zap className="w-4 h-4" />
                  <span>Individual Spend Caps</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-sans leading-normal">
                  Set strict monthly dollar thresholds per developer to prevent budget overruns.
                </p>
              </div>
            </div>

            {/* Authentication Methods Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Left Column: Instant 1-Click Access & Standard Sign In */}
              <div className="space-y-4 flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-black/40 border border-white/10">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>INSTANT SANDBOX &amp; ACCOUNTS</span>
                  </div>

                  {/* 1-Click Demo Sandbox Access */}
                  <button
                    type="button"
                    onClick={handleQuickDemo}
                    disabled={isDemoSigningIn}
                    className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.99] font-mono"
                  >
                    {isDemoSigningIn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Launching Demo Workspace...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 fill-black" />
                        <span>Launch Sandbox Workspace (Demo Admin)</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-zinc-400 text-center font-sans">
                    Instantly loads a full Acme AI Corp workspace with active seats, sliders, and invites.
                  </p>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <span className="relative px-2 bg-[#0b0e17] text-[10px] uppercase font-mono text-zinc-500">
                    Or sign in with existing account
                  </span>
                </div>

                {/* Social Login Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOAuthLogin('github')}
                    disabled={Boolean(oauthLoading)}
                    className="py-3 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {oauthLoading === 'github' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    ) : (
                      <Github className="w-4 h-4" />
                    )}
                    <span>GitHub</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOAuthLogin('google')}
                    disabled={Boolean(oauthLoading)}
                    className="py-3 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {oauthLoading === 'google' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                        <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9z" />
                        <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.9C3.7 20.6 7.5 23.5 12 23.5z" />
                      </svg>
                    )}
                    <span>Google</span>
                  </button>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <Link
                    href={`/auth/signin?next=${encodeURIComponent(targetPath)}`}
                    className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Sign in with Email &amp; Password</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    href={`/auth/signup?next=${encodeURIComponent(targetPath)}`}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    Create Account
                  </Link>
                </div>
              </div>

              {/* Right Column: Corporate SSO / SAML Domain Access */}
              <div className="space-y-4 flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-black/40 border border-white/10">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    <span>ENTERPRISE SSO / SAML LOGIN</span>
                  </div>

                  <p className="text-xs text-zinc-400 font-sans">
                    Have an existing enterprise workspace configured with Okta, Azure AD, or Google Workspace? Enter your company domain:
                  </p>

                  <form onSubmit={handleSsoSubmit} className="space-y-3">
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={ssoDomain}
                        onChange={(e) => setSsoDomain(e.target.value)}
                        placeholder="company.com (e.g. acme.ai)"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-zinc-500 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/60 transition-all"
                      />
                    </div>

                    {ssoError && (
                      <p className="text-[11px] text-rose-400 font-mono">{ssoError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={ssoLoading || !ssoDomain.trim()}
                      className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-bold text-xs font-mono flex items-center justify-center gap-2 border border-white/20 transition-all cursor-pointer"
                    >
                      {ssoLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                          <span>Routing to SAML IdP...</span>
                        </>
                      ) : (
                        <>
                          <Key className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Continue with Corporate SSO</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Trust Badges */}
                <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>SOC 2 Type II Security</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>ZDR Zero Data Retention</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Hardware Enclave RBAC</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Instant Proration</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 3. Authenticated: Render children directly
  return <>{children}</>;
}
