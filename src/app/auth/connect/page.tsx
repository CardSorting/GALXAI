'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Terminal,
  AlertCircle,
  Mail,
  X,
} from 'lucide-react';
import type { Provider } from '@supabase/supabase-js';

function AuthConnectContent() {
  const searchParams = useSearchParams();
  const { user, signInWithOAuth, signInWithOtp, logout } = useAuth();

  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');

    if (errorDesc) {
      setError(errorDesc);
    } else if (errorParam === 'auth_exchange_failed') {
      setError('Authentication exchange failed. Please verify your redirect URL configuration and try again.');
    } else if (errorParam) {
      setError(`Authentication error: ${errorParam}`);
    }
  }, [searchParams]);

  const handleOAuthSignIn = async (provider: Provider) => {
    setLoadingProvider(provider);
    setError(null);
    try {
      await signInWithOAuth(provider);
    } catch (err: any) {
      setError(err.message || `Unable to authenticate with ${provider}. Please try again.`);
      setLoadingProvider(null);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoadingProvider('email');
    setError(null);
    try {
      const { error } = await signInWithOtp({ email: emailInput });
      if (error) throw error;
      setEmailSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send login link. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-zinc-100 selection:bg-zinc-800 selection:text-white">
      <Navigation />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[320px] bg-gradient-to-tr from-amber-500/10 via-orange-500/5 to-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10 space-y-6">
          {/* Authenticated State */}
          {user ? (
            <div className="bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-white tracking-tight">You're Signed In</h1>
                <p className="text-sm text-zinc-400">{user.email || user.name || 'Account Connected'}</p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{user.name}</span>
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Link
                  href="/playground"
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-semibold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Continue to App</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <button
                  type="button"
                  onClick={logout}
                  className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            /* Unauthenticated Login Card */
            <div className="bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles className="w-6 h-6 text-amber-400" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Welcome to GALXAI
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Sign in with your developer account to continue
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-rose-400 hover:text-rose-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Email Link Sent State */}
              {emailSent ? (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                  <Mail className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h3 className="text-sm font-bold text-white">Magic Link Sent!</h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Check your inbox at <span className="font-mono text-emerald-300">{emailInput}</span> to finish signing in.
                  </p>
                  <button
                    type="button"
                    onClick={() => setEmailSent(false)}
                    className="text-xs text-zinc-400 hover:text-white underline cursor-pointer pt-1"
                  >
                    Use another method
                  </button>
                </div>
              ) : (
                <>
                  {/* Standard Supabase OAuth Buttons */}
                  <div className="space-y-3 pt-1">
                    {/* Continue with GitHub */}
                    <button
                      type="button"
                      onClick={() => handleOAuthSignIn('github')}
                      disabled={loadingProvider !== null}
                      className="w-full h-12 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                    >
                      {loadingProvider === 'github' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                          <span>Connecting with GitHub...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                          </svg>
                          <span>Continue with GitHub</span>
                        </>
                      )}
                    </button>

                    {/* Continue with Google */}
                    <button
                      type="button"
                      onClick={() => handleOAuthSignIn('google')}
                      disabled={loadingProvider !== null}
                      className="w-full h-12 rounded-xl bg-zinc-800/90 hover:bg-zinc-700/90 border border-white/10 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                    >
                      {loadingProvider === 'google' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Connecting with Google...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                            <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.8 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                            <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
                          </svg>
                          <span>Continue with Google</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-white/10" />
                    <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-zinc-500 font-mono">or email magic link</span>
                    <div className="flex-grow border-t border-white/10" />
                  </div>

                  {/* Email Magic Link Form */}
                  <form onSubmit={handleEmailSignIn} className="space-y-3">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="developer@company.com"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all font-mono"
                    />
                    <button
                      type="submit"
                      disabled={loadingProvider !== null}
                      className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Mail className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Send Magic Link</span>
                    </button>
                  </form>
                </>
              )}

              {/* Terminal Device Login Link */}
              <div className="pt-3 border-t border-white/5 text-center">
                <Link
                  href="/device"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1 cursor-pointer group"
                >
                  <Terminal className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                  <span>Signing in from a terminal? Enter code &rarr;</span>
                </Link>
              </div>

              {/* Terms & Privacy Assurance */}
              <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
                By continuing, you agree to GALXAI's{' '}
                <Link href="/terms" className="underline hover:text-zinc-300">Terms of Service</Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline hover:text-zinc-300">Privacy Policy</Link>.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AuthConnectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090e]" />}>
      <AuthConnectContent />
    </Suspense>
  );
}
