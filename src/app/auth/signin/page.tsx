'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Mail,
  X,
  Lock,
  Zap,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  ShieldCheck,
  Github
} from 'lucide-react';

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, signInWithPassword, signInWithOAuth, logout } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canQuickCreate, setCanQuickCreate] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const returnUrl = searchParams.get('next') || searchParams.get('returnUrl') || searchParams.get('redirect') || '/chat';

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');
    const emailParam = searchParams.get('email');

    if (errorDesc) {
      setError(errorDesc);
    } else if (errorParam) {
      setError(`Authentication notice: ${errorParam}`);
    }

    if (emailParam) {
      setEmailInput(emailParam);
    }
  }, [searchParams]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setCanQuickCreate(false);

    if (!emailInput || !emailInput.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!passwordInput || passwordInput.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await signInWithPassword({
        email: emailInput.trim(),
        password: passwordInput,
      });

      if (signInError) {
        setCanQuickCreate(true);
        throw new Error('Account not found or password incorrect. You can create an account or use Demo Sign In.');
      }

      setSuccessMessage('Successfully signed in! Redirecting...');
      setTimeout(() => {
        router.push(returnUrl);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };



  const handleOAuth = async (provider: 'github' | 'google') => {
    setOauthLoading(provider);
    setError(null);
    try {
      await signInWithOAuth(provider, {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`,
      });
    } catch (err: any) {
      setError(err.message || `Failed to authenticate with ${provider}.`);
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#07090e] text-zinc-100 selection:bg-cyan-500 selection:text-black relative">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-[#07090e]/80 border-b border-white/10 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 group cursor-pointer"
            title="Return to GALX AI Chat"
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <div className="flex items-baseline font-black tracking-tight text-base">
              <span className="text-white font-sans">GALX</span>
              <span className="text-cyan-400 font-sans ml-0.5">AI</span>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/chat"
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
            >
              ← Back to Chat
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[320px] bg-gradient-to-tr from-cyan-500/15 via-indigo-500/10 to-pink-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10 space-y-4 my-8">
          {user ? (
            <div className="bg-[#0c101c] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h1 className="text-2xl font-black text-white tracking-tight">You're Signed In</h1>
                <p className="text-xs text-zinc-400 font-mono">{user.email || user.name || 'Account Connected'}</p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{user.name}</span>
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {returnUrl && returnUrl !== '/chat' && returnUrl !== '/' ? (
                  <Link
                    href={returnUrl}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer font-mono"
                  >
                    <span>Continue to Destination ({returnUrl})</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ) : (
                  <Link
                    href="/chat"
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-indigo-400 to-cyan-500 hover:from-cyan-300 hover:to-indigo-300 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span>Launch GALX AI Chat</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs font-semibold font-mono">
                  <Link
                    href="/teams/seats"
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 transition-all text-center"
                  >
                    Teams &amp; Seats
                  </Link>
                  <Link
                    href="/billing"
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-300 transition-all text-center"
                  >
                    Compute Wallet
                  </Link>
                  <Link
                    href="/keys"
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-300 transition-all text-center"
                  >
                    API Keys
                  </Link>
                  <Link
                    href="/chat"
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 transition-all text-center"
                  >
                    AI Chat
                  </Link>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-xs font-medium text-rose-400/80 hover:text-rose-200 transition-all cursor-pointer font-mono"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#0c101c] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-5">
              {/* Header */}
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 p-[1px] mx-auto shadow-lg shadow-cyan-500/20 flex items-center justify-center">
                  <div className="w-full h-full bg-[#0c101c] rounded-[15px] flex items-center justify-center">
                    <Zap className="w-6 h-6 text-cyan-400 fill-cyan-400" />
                  </div>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Welcome to GALX AI
                </h1>
                <p className="text-xs text-zinc-400">
                  Sign in to save chats, create anime companions, and access 4K image studio.
                </p>
              </div>

              {/* Segmented Switcher */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/60 border border-white/10 text-xs font-bold shadow-inner">
                <div className="py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-indigo-600 text-white font-bold flex items-center justify-center gap-1.5 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>Sign In</span>
                </div>
                <Link
                  href={returnUrl && returnUrl !== '/' ? `/auth/signup?next=${encodeURIComponent(returnUrl)}` : '/auth/signup'}
                  className="py-2 px-3 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-white/5 font-semibold flex items-center justify-center transition-colors text-center"
                >
                  Create Account
                </Link>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <span>{error}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="text-rose-400 hover:text-rose-200 cursor-pointer"
                      aria-label="Dismiss error"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Success Alert */}
              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="developer@galx.ai"
                      autoComplete="email"
                      autoFocus
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/60 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-zinc-300">
                      Password
                    </label>
                    <Link
                      href="/device"
                      className="text-[11px] text-zinc-500 hover:text-cyan-300 transition-colors"
                    >
                      Terminal login?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/60 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Sign In with Password</span>
                    </>
                  )}
                </button>
              </form>

              {/* OAuth Providers Divider */}
              <div className="relative flex items-center justify-center my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <span className="relative px-2 bg-[#0c101c] text-[10px] uppercase font-mono text-zinc-500">
                  Or continue with
                </span>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOAuth('github')}
                  disabled={Boolean(oauthLoading)}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
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
                  onClick={() => handleOAuth('google')}
                  disabled={Boolean(oauthLoading)}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {oauthLoading === 'google' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.9C3.7 20.6 7.5 23.5 12 23.5z"
                      />
                    </svg>
                  )}
                  <span>Google</span>
                </button>
              </div>

              {/* Bottom Route Link */}
              <div className="pt-2 text-center">
                <Link
                  href={returnUrl && returnUrl !== '/' ? `/auth/signup?next=${encodeURIComponent(returnUrl)}` : '/auth/signup'}
                  className="text-xs text-zinc-400 hover:text-cyan-300 transition-colors"
                >
                  Don't have an account? <strong className="text-cyan-400 font-bold underline ml-1">Create one now →</strong>
                </Link>
              </div>

              {/* Terms & Privacy */}
              <p className="text-[11px] text-zinc-500 text-center leading-relaxed font-sans pt-1">
                By continuing, you agree to GALXAI's{' '}
                <Link href="/terms" className="underline hover:text-zinc-300">Terms</Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline hover:text-zinc-300">Privacy Policy</Link>.
              </p>
            </div>
          )}

          {/* Security Row */}
          <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-zinc-500 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>SOC 2 Type II</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>256-Bit TLS</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span>Sub-15ms Edge</span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#07090e] text-cyan-400">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 p-[1px] shadow-lg animate-pulse flex items-center justify-center">
              <div className="w-full h-full bg-[#0c101c] rounded-[15px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-cyan-400 fill-cyan-400" />
              </div>
            </div>
            <span className="text-xs font-mono text-zinc-400">Loading GALX AI Auth...</span>
          </div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
