'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation } from '@/components/dashboard/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Mail,
  X,
  Lock,
  User,
  Zap,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';

function SignUpContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, signUp, logout } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!emailInput || !emailInput.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!passwordInput || passwordInput.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (confirmPassword && passwordInput !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await signUp({
        email: emailInput.trim(),
        password: passwordInput,
        name: fullName.trim() || emailInput.split('@')[0]
      });

      if (signUpError) throw signUpError;

      setSuccessMessage('Account created successfully! Redirecting to playground...');
      setTimeout(() => {
        router.push('/playground');
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isMinLength = passwordInput.length >= 8;
  const hasMixedChars = /[0-9!@#$%^&*]/.test(passwordInput);
  const passwordsMatch = confirmPassword.length > 0 && passwordInput === confirmPassword;

  const strengthScore = [
    passwordInput.length >= 6,
    passwordInput.length >= 8,
    hasMixedChars
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-zinc-100 selection:bg-zinc-800 selection:text-white">
      <Navigation />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <motion.div 
          animate={{ 
            scale: [1, 1.08, 1],
            opacity: [0.12, 0.22, 0.12]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[300px] bg-gradient-to-tr from-cyan-500/10 via-indigo-500/10 to-amber-500/10 rounded-full blur-[120px] pointer-events-none" 
        />

        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md relative z-10 space-y-4"
        >
          {user ? (
            <div className="bg-[#0c0e18] border border-white/15 rounded-3xl p-8 shadow-2xl shadow-black/80 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h1 className="text-2xl font-black text-white tracking-tight">You're Signed In</h1>
                <p className="text-sm text-zinc-400 font-mono">{user.email || user.name || 'Account Connected'}</p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{user.name}</span>
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Link
                  href="/playground"
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 text-black font-black text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Continue to Compute Playground</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <Link
                    href="/keys"
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 transition-all text-center"
                  >
                    API Keys
                  </Link>
                  <Link
                    href="/billing"
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-300 transition-all text-center"
                  >
                    Wallet &amp; Billing
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
            <div className="bg-[#0c0e18] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-5">
              {/* Header */}
              <div className="text-center space-y-1.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-amber-400 p-[1px] mx-auto shadow-md shadow-indigo-500/20 flex items-center justify-center">
                  <div className="w-full h-full bg-[#0c0e18] rounded-[15px] flex items-center justify-center">
                    <Zap className="w-5 h-5 text-cyan-400 fill-cyan-400" />
                  </div>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Create an Account
                </h1>
                <p className="text-xs text-zinc-400">
                  Enter your details below to create your developer account
                </p>
              </div>

              {/* Dedicated Route Segmented Switcher with Shared Layout Spring */}
              <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-black/80 border border-white/15 text-xs font-bold shadow-inner relative z-20">
                <Link
                  href="/auth/signin"
                  className="relative py-2.5 px-4 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-white/5 font-semibold opacity-70 hover:opacity-100 flex items-center justify-center gap-2 transition-all cursor-pointer select-none"
                >
                  <span className="relative z-10">Sign In</span>
                </Link>
                <div className="relative py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 select-none">
                  <motion.div
                    layoutId="auth-active-tab-pill"
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-indigo-500 to-indigo-600 rounded-xl shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/50"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                  <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="relative z-10 text-white font-black">Create Account</span>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs space-y-2 animate-in fade-in">
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
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Will Cruz"
                      autoComplete="name"
                      autoFocus
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/60 transition-all font-sans"
                    />
                  </div>
                </div>

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
                      placeholder="willcruzdesigner@gmail.com"
                      autoComplete="email"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/60 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
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

                  {/* Dynamic Password Strength Indicator */}
                  {passwordInput.length > 0 && (
                    <div className="pt-2 space-y-1.5 animate-in fade-in">
                      <div className="grid grid-cols-3 gap-1.5 h-1">
                        <div
                          className={`rounded-full transition-all duration-300 ${
                            strengthScore >= 1 ? (strengthScore === 1 ? 'bg-rose-500' : strengthScore === 2 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-white/10'
                          }`}
                        />
                        <div
                          className={`rounded-full transition-all duration-300 ${
                            strengthScore >= 2 ? (strengthScore === 2 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-white/10'
                          }`}
                        />
                        <div
                          className={`rounded-full transition-all duration-300 ${
                            strengthScore >= 3 ? 'bg-emerald-400' : 'bg-white/10'
                          }`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                        <span className={isMinLength ? 'text-emerald-400' : 'text-zinc-500'}>
                          {isMinLength ? '✓' : '○'} 8+ characters
                        </span>
                        <span className={hasMixedChars ? 'text-emerald-400' : 'text-zinc-500'}>
                          {hasMixedChars ? '✓' : '○'} Number or symbol
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/60 transition-all font-mono"
                    />
                  </div>
                  {confirmPassword.length > 0 && (
                    <p className={`text-[10px] font-mono mt-1 ${passwordsMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {passwordsMatch ? '✓ Passwords match' : '✕ Passwords do not match'}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Create Account &amp; Sign In</span>
                    </>
                  )}
                </button>

                {/* Bottom Route Link */}
                <div className="pt-2 text-center">
                  <Link
                    href="/auth/signin"
                    className="text-xs text-zinc-400 hover:text-cyan-300 transition-colors"
                  >
                    Already have an account? <strong className="text-cyan-400 font-bold underline ml-1">Sign In →</strong>
                  </Link>
                </div>
              </form>

              {/* Terms & Privacy Assurance */}
              <p className="text-[11px] text-zinc-500 text-center leading-relaxed font-sans pt-1">
                By continuing, you agree to GALXAI's{' '}
                <Link href="/terms" className="underline hover:text-zinc-300">Terms</Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline hover:text-zinc-300">Privacy Policy</Link>.
              </p>
            </div>
          )}

          {/* Enterprise Trust Row */}
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
              <span>Zero PHI</span>
            </span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090e]" />}>
      <SignUpContent />
    </Suspense>
  );
}
