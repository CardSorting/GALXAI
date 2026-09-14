'use client';
import { authEntryPath } from '@/lib/auth/redirects';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Mail,
  ArrowRight,
  Loader2,
  Zap,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { GalxGalaxyLogo } from '@/components/brand/GalxGalaxyLogo';
import { ArtisanalSignalSection } from '@/components/home/ArtisanalSignalSection';
import { DEFAULT_POST_AUTH_PATH } from '@/lib/auth/redirects';

export function GalxScenicHero() {
  const router = useRouter();
  const { user, signInWithPassword, signUp, signInWithOAuth } = useAuth();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuth = async (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    setError(null);
    try {
      await signInWithOAuth(provider, {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(DEFAULT_POST_AUTH_PATH)}`,
      });
    } catch (err: any) {
      setError(err.message || `Failed to authenticate with ${provider}.`);
      setOauthLoading(null);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      if (authMode === 'signup') {
        const { error: signUpErr } = await signUp({
          email: emailInput.trim(),
          password: passwordInput,
          name: emailInput.split('@')[0],
        });
        if (signUpErr) throw signUpErr;
      } else {
        const { error: signInErr } = await signInWithPassword({
          email: emailInput.trim(),
          password: passwordInput,
        });
        if (signInErr) throw signInErr;
      }

      router.replace(DEFAULT_POST_AUTH_PATH);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#07090e] text-white flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* Top Header / Navigation */}
      <header className="w-full px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between z-20">
        {/* Brand Logo: Galaxy Style Emblem + galx.ai */}
        <Link
          href="/"
          className="hover:opacity-95 transition-all group"
          aria-label="GALX AI Home"
        >
          <GalxGalaxyLogo size={34} textClassName="text-xl sm:text-2xl" />
        </Link>

        {/* Right CTA / Auth Links */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <Link
              href={DEFAULT_POST_AUTH_PATH}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all group"
            >
              <span>Open Gateway</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <>
              <Link
                href={authEntryPath(DEFAULT_POST_AUTH_PATH, 'signup')}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                Enter the Galaxy
              </Link>
              <Link
                href={authEntryPath(DEFAULT_POST_AUTH_PATH)}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              >
                Login
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-4 flex flex-col justify-center">
        {/* Stage Card with Scenic Backdrop */}
        <div className="relative w-full rounded-3xl sm:rounded-[36px] overflow-hidden border border-white/10 shadow-2xl bg-[#090d1a] min-h-[620px] lg:min-h-[680px] flex items-center">
          {/* Scenic Atmospheric Video / Artwork Backdrop */}
          <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden bg-[#07090e]">
            <video
              autoPlay
              loop
              muted
              playsInline
              poster="/brand/galaxy-hero-banner.jpg"
              className="w-full h-full object-cover object-center scale-100 sm:scale-105 transition-transform duration-1000"
            >
              <source src="/brand/improve_the_loop_it_further.mp4" type="video/mp4" />
            </video>

            {/* Soft left gradient strictly behind the sign-up card for legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#07090e]/85 via-[#07090e]/30 to-transparent w-full md:w-1/2 pointer-events-none" />
            {/* Soft bottom edge fade */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07090e]/40 to-transparent h-20 pointer-events-none" />
          </div>

          {/* Foreground Hero Content Grid */}
          <div className="relative z-10 w-full p-4 sm:p-8 lg:p-12 flex flex-col lg:flex-row items-center lg:items-stretch justify-between gap-8">
            {/* Left Floating Sign-Up Card */}
            <div className="w-full max-w-[420px] bg-white text-zinc-900 rounded-[28px] p-6 sm:p-8 shadow-2xl shadow-black/80 flex flex-col justify-between space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-300">
              {/* Card Title & Single-Line Value Prop */}
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 leading-tight">
                  Get access to Frontier AI
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 font-medium leading-relaxed">
                  Route, observe, and optimize OpenAI GPT-5.6 inference.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Primary Auth Buttons */}
              <div className="space-y-2.5">
                {/* Continue with Google */}
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  disabled={Boolean(oauthLoading) || loading}
                  className="w-full py-3 px-4 rounded-2xl bg-[#131416] hover:bg-[#202226] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
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
                  <span>Continue with Google</span>
                </button>

                {/* Continue with GitHub */}
                <button
                  type="button"
                  onClick={() => handleOAuth('github')}
                  disabled={Boolean(oauthLoading) || loading}
                  className="w-full py-3 px-4 rounded-2xl bg-[#131416] hover:bg-[#202226] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {oauthLoading === 'github' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  ) : (
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  )}
                  <span>Continue with GitHub</span>
                </button>
              </div>

              {/* OR Divider */}
              <div className="relative flex items-center justify-center my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200" />
                </div>
                <span className="relative px-3 bg-white text-[11px] font-bold tracking-wider uppercase text-zinc-400">
                  OR
                </span>
              </div>

              {/* Continue with Email / Expanded Form */}
              {!showEmailForm ? (
                <button
                  type="button"
                  onClick={() => setShowEmailForm(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-zinc-500" />
                  <span>Continue with email</span>
                </button>
              ) : (
                <form onSubmit={handleEmailAuth} className="space-y-2.5 pt-1">
                  <div className="flex rounded-xl bg-zinc-100 p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setAuthMode('signup')}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        authMode === 'signup' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
                      }`}
                    >
                      Create Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        authMode === 'signin' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
                      }`}
                    >
                      Sign In
                    </button>
                  </div>

                  <div>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="developer@company.com"
                      required
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-800 transition-all font-mono"
                    />
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Password (min. 6 characters)"
                      required
                      className="w-full px-3.5 pr-9 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-800 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#131416] hover:bg-black text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>{authMode === 'signup' ? 'Create Account & Open Gateway' : 'Sign In & Open Gateway'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Terms and Privacy Policy Note */}
              <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
                By continuing, you agree with GALXAI's{' '}
                <Link href="/terms" className="underline hover:text-zinc-600">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline hover:text-zinc-600">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Artisanal Pure-Signal Section */}
        <ArtisanalSignalSection />
      </main>

      {/* Merged Hyper-Competitive SEO & Platform Footer */}
      <footer className="w-full border-t border-white/10 bg-[#05070d]/95 backdrop-blur-2xl relative z-20 mt-16 pt-12 pb-8 text-xs">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 space-y-12">
          
          {/* Top Primary Strategic Navigation Strip */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pb-8 border-b border-white/10">
            {/* Primary Navigation Links (Exact Invariants) */}
            <nav className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-zinc-200 font-semibold text-sm">
              <Link href="/models" className="hover:text-cyan-400 transition-colors">
                Models
              </Link>
              <Link href="/keys" className="hover:text-cyan-400 transition-colors">
                Gateway API
              </Link>
              <Link href="/pricing" className="hover:text-cyan-400 transition-colors">
                Pricing
              </Link>
              <Link href="/telemetry" className="hover:text-cyan-400 transition-colors">
                Telemetry
              </Link>
              <span className="hidden sm:inline text-zinc-700 select-none">|</span>
              <Link href="/about" className="hover:text-white transition-colors text-zinc-400">
                About
              </Link>
              <Link href="/careers" className="hover:text-white transition-colors text-zinc-400">
                Careers
              </Link>
              <Link href="/security" className="hover:text-white transition-colors text-zinc-400">
                Safety Center
              </Link>
              <Link href="/docs" className="hover:text-white transition-colors text-zinc-400">
                Blog &amp; Docs
              </Link>
            </nav>

            {/* Live Telemetry & SLA Indicator */}
            <div className="flex items-center gap-3">
              <Link
                href="/status"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium hover:bg-emerald-500/20 transition-all shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>All Systems Operational • Sub-15ms Anycast SLA</span>
              </Link>
            </div>
          </div>

          {/* Hyper-Competitive 5-Column SEO Discovery Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10 text-xs">
            
            {/* Column 1: Frontier Models */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-mono font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Frontier Models</span>
              </h4>
              <ul className="space-y-2 text-zinc-400 font-mono text-[11px]">
                <li>
                  <Link href="/models/gpt-5.6-sol" className="hover:text-cyan-300 transition-colors block">
                    <span className="text-zinc-200 font-semibold block">GPT-5.6 Sol</span>
                    <span className="text-[10px] text-zinc-500 font-sans">Reasoning &amp; Coding SOTA</span>
                  </Link>
                </li>
                <li>
                  <Link href="/models/gpt-5.6-terra" className="hover:text-cyan-300 transition-colors block">
                    <span className="text-zinc-200 font-semibold block">GPT-5.6 Terra</span>
                    <span className="text-[10px] text-zinc-500 font-sans">Balanced Frontier</span>
                  </Link>
                </li>
                <li>
                  <Link href="/models/gpt-5.6-luna" className="hover:text-cyan-300 transition-colors block">
                    <span className="text-zinc-200 font-semibold block">GPT-5.6 Luna</span>
                    <span className="text-[10px] text-zinc-500 font-sans">Sub-second Speed</span>
                  </Link>
                </li>
                <li>
                  <Link href="/models/openai-gpt-image-latest" className="hover:text-cyan-300 transition-colors block">
                    <span className="text-zinc-200 font-semibold block">OpenAI Image Generation</span>
                    <span className="text-[10px] text-zinc-500 font-sans">Text-to-image generation</span>
                  </Link>
                </li>
                <li className="pt-1">
                  <Link href="/models/compare" className="text-cyan-400 hover:text-cyan-300 font-sans font-medium flex items-center gap-1">
                    <span>Compare All Models →</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: Developer Tools & pSEO */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-mono font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>Developer Tools</span>
              </h4>
              <ul className="space-y-2 text-zinc-400 text-xs">
                <li>
                  <Link href="/tools/roi-calculator" className="hover:text-white transition-colors flex items-center justify-between">
                    <span>Savings Calculator</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">ROI</span>
                  </Link>
                </li>
                <li>
                  <Link href="/tools/stream-benchmark" className="hover:text-white transition-colors flex items-center justify-between">
                    <span>Stream Benchmark</span>
                    <span className="text-[10px] font-mono text-zinc-500">TTFT</span>
                  </Link>
                </li>
                <li>
                  <Link href="/tools/context-window-visualizer" className="hover:text-white transition-colors flex items-center justify-between">
                    <span>1M Context Visualizer</span>
                    <span className="text-[10px] font-mono text-indigo-400">1.05M</span>
                  </Link>
                </li>
                <li>
                  <Link href="/tools/token-counter" className="hover:text-white transition-colors flex items-center justify-between">
                    <span>BPE Token Counter</span>
                    <span className="text-[10px] font-mono text-zinc-500">TikToken</span>
                  </Link>
                </li>
                <li>
                  <Link href="/tools/prompt-compressor" className="hover:text-white transition-colors flex items-center justify-between">
                    <span>Prompt Compressor</span>
                    <span className="text-[10px] font-mono text-amber-400">-70%</span>
                  </Link>
                </li>
                <li>
                  <Link href="/tools/json-schema-generator" className="hover:text-white transition-colors">
                    <span>JSON Schema to Zod</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Framework Recipes & SDKs */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-mono font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Frameworks &amp; SDKs</span>
              </h4>
              <ul className="space-y-2 text-zinc-400 text-xs">
                <li>
                  <Link href="/cookbook/streaming-sse-nextjs" className="hover:text-white transition-colors flex items-center justify-between">
                    <span>Next.js 15 Streaming</span>
                    <span className="text-[10px] font-mono text-cyan-400">Recipe</span>
                  </Link>
                </li>
                <li>
                  <Link href="/docs/integrations/cursor" className="hover:text-white transition-colors flex items-center justify-between">
                    <span>Cursor &amp; Windsurf</span>
                    <span className="text-[10px] font-mono text-zinc-500">IDE</span>
                  </Link>
                </li>
                <li>
                  <Link href="/docs/integrations/claude-code" className="hover:text-white transition-colors flex items-center justify-between">
                    <span>Claude Code Agent</span>
                    <span className="text-[10px] font-mono text-amber-400">CLI</span>
                  </Link>
                </li>
                <li>
                  <Link href="/docs/sdks/typescript" className="hover:text-white transition-colors">
                    <span>TypeScript &amp; React SDK</span>
                  </Link>
                </li>
                <li>
                  <Link href="/docs/sdks/python" className="hover:text-white transition-colors">
                    <span>Python &amp; FastAPI SDK</span>
                  </Link>
                </li>
                <li>
                  <Link href="/docs/api-reference" className="hover:text-white transition-colors">
                    <span>REST &amp; SSE API Docs</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Alternatives & Comparisons (AEO) */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-mono font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Comparisons &amp; AEO</span>
              </h4>
              <ul className="space-y-2 text-zinc-400 text-xs">
                <li>
                  <Link href="/alternatives/openrouter" className="hover:text-white transition-colors flex items-center justify-between">
                    <span>vs OpenRouter</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">0% Fee</span>
                  </Link>
                </li>
                <li>
                  <Link href="/alternatives/portkey" className="hover:text-white transition-colors flex items-center justify-between">
                    <span>vs Portkey</span>
                    <span className="text-[10px] font-mono text-zinc-500">No Seats</span>
                  </Link>
                </li>
                <li>
                  <Link href="/alternatives/together-ai" className="hover:text-white transition-colors flex items-center justify-between">
                    <span>vs Together AI</span>
                    <span className="text-[10px] font-mono text-amber-400">Wholesale</span>
                  </Link>
                </li>
                <li>
                  <Link href="/alternatives/litellm" className="hover:text-white transition-colors flex items-center justify-between">
                    <span>vs LiteLLM</span>
                    <span className="text-[10px] font-mono text-zinc-500">Managed</span>
                  </Link>
                </li>
                <li>
                  <Link href="/migrate/openai-direct" className="hover:text-white transition-colors">
                    <span>Migrate from OpenAI Direct</span>
                  </Link>
                </li>
                <li>
                  <Link href="/glossary" className="hover:text-white transition-colors">
                    <span>AI Gateway Glossary</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 5: Enterprise, Security & Governance */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-mono font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>Trust &amp; Governance</span>
              </h4>
              <ul className="space-y-2 text-zinc-400 text-xs">
                <li>
                  <Link href="/billing/audit-logs" className="hover:text-white transition-colors flex items-center justify-between">
                    <span>SOC 2 Type II Audit</span>
                    <span className="text-[10px] font-mono text-zinc-500">Tamper-Proof</span>
                  </Link>
                </li>
                <li>
                  <Link href="/industries/healthcare-and-lifesciences" className="hover:text-white transition-colors flex items-center justify-between">
                    <span>HIPAA &amp; BAA Eligible</span>
                    <span className="text-[10px] font-mono text-emerald-400">BAA</span>
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="hover:text-white transition-colors">
                    <span>Zero Content Retention</span>
                  </Link>
                </li>
                <li>
                  <Link href="/reliability/preventing-outages-during-openai-downtime" className="hover:text-white transition-colors">
                    <span>99.99% Failover SLA</span>
                  </Link>
                </li>
                <li>
                  <Link href="/postmortems/openai-major-outage-failover" className="hover:text-white transition-colors">
                    <span>OpenAI Outage Postmortems</span>
                  </Link>
                </li>
                <li>
                  <Link href="/compliance" className="hover:text-white transition-colors">
                    <span>Enterprise DPA &amp; GDPR</span>
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          {/* Tier 2: Legal, Privacy & Compliance (Exact Invariants) */}
          <div className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500 font-sans">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2">
              <span>&copy; {new Date().getFullYear()} GALX AI, Inc.</span>
              <span className="text-zinc-700">•</span>
              <Link href="/privacy#cookies" className="hover:text-zinc-300 transition-colors">
                Cookie Policy
              </Link>
              <Link href="/privacy" className="hover:text-zinc-300 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-zinc-300 transition-colors">
                Terms of Service
              </Link>
              <Link href="/terms#compute" className="hover:text-zinc-300 transition-colors">
                Compute Terms of Use
              </Link>
              <Link
                href="/privacy#choices"
                className="inline-flex items-center gap-1 text-cyan-400/90 hover:text-cyan-300 transition-colors font-medium"
              >
                <span>Your Privacy Choices</span>
                <svg className="w-3 h-3 text-cyan-400" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 12.5a5.5 5.5 0 110-11 5.5 5.5 0 010 11zM8 4a1 1 0 100 2 1 1 0 000-2zm1 4H7v4h2V8z" />
                </svg>
              </Link>
            </div>

            <div className="flex items-center gap-3 text-zinc-600 font-mono text-[10px]">
              <span>GPT-5.6 Engine</span>
              <span>•</span>
              <span className="text-zinc-500">GALX API</span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
