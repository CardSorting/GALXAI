'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Terminal,
  AlertCircle,
  X
} from 'lucide-react';

export default function AuthConnectPage() {
  const router = useRouter();
  const { user, loginWithOAuth, logout } = useAuth();

  const [loadingProvider, setLoadingProvider] = useState<'openai' | 'grok' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthSignIn = async (provider: 'openai' | 'grok') => {
    setLoadingProvider(provider);
    setError(null);
    try {
      await loginWithOAuth(provider);
    } catch (err: any) {
      setError(err.message || `Unable to connect to ${provider === 'grok' ? 'xAI' : 'OpenAI'}. Please try again.`);
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
                    {user.provider === 'xai-grok' || user.provider === 'grok' ? 'xAI Account' : 'OpenAI Account'}
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
                  Sign in with your provider to continue
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

              {/* Traditional OAuth Buttons */}
              <div className="space-y-3 pt-1">
                {/* Continue with OpenAI */}
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('openai')}
                  disabled={loadingProvider !== null}
                  className="w-full h-12 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                >
                  {loadingProvider === 'openai' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                      <span>Connecting to OpenAI...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.259 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7466-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.6669zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
                      </svg>
                      <span>Continue with OpenAI</span>
                    </>
                  )}
                </button>

                {/* Continue with xAI */}
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('grok')}
                  disabled={loadingProvider !== null}
                  className="w-full h-12 rounded-xl bg-zinc-800/90 hover:bg-zinc-700/90 border border-white/10 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                >
                  {loadingProvider === 'grok' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Connecting to xAI...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <span>Continue with xAI</span>
                    </>
                  )}
                </button>
              </div>

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
