'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SafeStorage } from '@/lib/resilience/SafeStorage';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'exchanging' | 'success' | 'error'>('exchanging');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function handleExchange() {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDesc = searchParams.get('error_description');

      if (errorParam) {
        setStatus('error');
        setErrorMessage(errorDesc || errorParam || 'OAuth Authorization was denied');
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('Missing authorization code in OAuth callback');
        return;
      }

      const storedPkce = SafeStorage.getJSON<{
        provider: 'openai' | 'xai-grok';
        codeVerifier: string;
        state: string;
        mode: 'pooled' | 'private';
      } | null>('galxai_oauth_pkce', null);

      if (!storedPkce || !storedPkce.codeVerifier) {
        setStatus('error');
        setErrorMessage('Session PKCE verifier state missing or expired. Please re-initiate login.');
        return;
      }

      if (state && storedPkce.state && state !== storedPkce.state) {
        setStatus('error');
        setErrorMessage('OAuth state mismatch detected (possible CSRF attempt).');
        return;
      }

      try {
        const res = await resilientFetch<{ success: boolean; user: any; error?: string }>('/api/auth/oauth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            codeVerifier: storedPkce.codeVerifier,
            provider: storedPkce.provider || 'openai',
            redirectUri: `${window.location.origin}/auth/callback`,
            mode: storedPkce.mode || 'pooled'
          }),
          enableCacheFallback: false
        });

        if (!res.data?.success || !res.data?.user) {
          throw new Error(res.data?.error || 'OAuth token exchange failed');
        }

        // Store user in storage
        SafeStorage.setJSON('galxai_auth_user', res.data.user);
        SafeStorage.removeItem('galxai_oauth_pkce');

        setStatus('success');
        setTimeout(() => {
          router.push('/playground');
        }, 800);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Failed to exchange authorization code for tokens');
      }
    }

    handleExchange();
  }, [searchParams, router]);

  return (
    <div className="max-w-md w-full mx-auto p-6 sm:p-8 glass-panel rounded-3xl border border-amber-500/20 shadow-2xl text-center space-y-6 bg-zinc-900/80 backdrop-blur-2xl">
      {status === 'exchanging' && (
        <div className="space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Signing you in...</h2>
          <p className="text-xs text-zinc-400">
            Completing authentication with your provider. Just a moment...
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Sign In Successful!</h2>
          <p className="text-xs text-zinc-400">
            Welcome to GALXAI. Redirecting to your workspace...
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="w-7 h-7 text-rose-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Sign In Failed</h2>
          <p className="text-xs text-rose-300">
            {errorMessage || 'An error occurred during sign-in.'}
          </p>
          <button
            onClick={() => router.push('/auth/connect')}
            className="mt-4 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="pt-4 border-t border-white/10 flex items-center justify-center gap-4 text-[11px] text-zinc-400">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> End-to-End Encrypted
        </span>
        <span className="flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Secure Sign In
        </span>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <Navigation />
      <Suspense fallback={<div className="text-white text-xs">Loading OAuth callback...</div>}>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
