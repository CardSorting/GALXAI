'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, Github } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { safeAuthRedirect } from '@/lib/auth/redirects';
import { authDestinationLabel, signInErrorMessage } from '@/lib/auth/signin';
import { AuthEntryShell } from './AuthEntryShell';
import styles from './auth-entry.module.css';

export function SignInForm({ destination, notice }: { destination: string; notice: string | null }) {
  const { signInWithPassword, signInWithOAuth, signInWithOtp } = useAuth();
  const returnTo = safeAuthRedirect(destination);
  const label = authDestinationLabel(returnTo);
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false), [method, setMethod] = useState<'password' | 'link'>('password');
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [sentTo, setSentTo] = useState(''), [retryAt, setRetryAt] = useState(0), [now, setNow] = useState(Date.now());
  const lock = useRef(false), alive = useRef(true), navigating = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null), passwordRef = useRef<HTMLInputElement>(null), headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const cooldown = Math.max(0, Math.ceil((retryAt - now) / 1000));

  useEffect(() => {
    alive.current = true;
    const resumed = (event: PageTransitionEvent) => { if (event.persisted) { navigating.current = false; lock.current = false; setBusy(null); } };
    window.addEventListener('pageshow', resumed);
    return () => { alive.current = false; window.removeEventListener('pageshow', resumed); };
  }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => { if (sentTo) headingRef.current?.focus(); }, [sentTo]);
  useEffect(() => {
    if (!retryAt) return;
    const timer = setInterval(() => { const time = Date.now(); setNow(time); if (time >= retryAt) setRetryAt(0); }, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);

  const callback = () => `${window.location.origin}/auth/callback?${new URLSearchParams({ next: returnTo })}`;
  const fail = (failure: unknown, type: 'password' | 'provider' | 'link') => {
    if (alive.current) setError(signInErrorMessage(failure, type));
  };
  async function sendLink() {
    const { error } = await signInWithOtp({ email: email.trim(), options: { emailRedirectTo: callback() } });
    // An unknown address receives the same confirmation; never create an account as a fallback.
    if (error && !['otp_disabled', 'user_not_found', 'signup_disabled'].includes(('code' in error ? String(error.code) : ''))) throw error;
    if (!alive.current) return;
    setSentTo(email.trim()); setNow(Date.now()); setRetryAt(Date.now() + 60_000);
  }
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (lock.current || (method === 'link' && cooldown)) return;
    const invalid = { email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : 'Enter a valid email address.', password: method === 'password' && !password ? 'Enter your password.' : undefined };
    setFieldErrors(invalid); setError('');
    if (invalid.email || invalid.password) { (invalid.email ? emailRef : passwordRef).current?.focus(); return; }
    lock.current = true; setBusy(method);
    try {
      if (method === 'link') await sendLink();
      else {
        const result = await signInWithPassword({ email: email.trim(), password });
        if (result.error || !result.data?.session?.access_token || !result.data?.user?.id) throw result.error || new Error('No verified session');
        // A fresh document request avoids prefetched anonymous redirects and rechecks server authority.
        if (alive.current) { navigating.current = true; window.location.replace(returnTo); return; }
      }
    } catch (failure) { fail(failure, method); }
    finally { if (!navigating.current) { lock.current = false; if (alive.current) setBusy(null); } }
  }
  async function oauth(provider: 'google' | 'github') {
    if (lock.current) return;
    lock.current = true; setBusy(provider); setError('');
    try { await signInWithOAuth(provider, { redirectTo: callback() }); navigating.current = true; }
    catch (failure) { fail(failure, 'provider'); }
    finally { if (!navigating.current) { lock.current = false; if (alive.current) setBusy(null); } }
  }

  return <AuthEntryShell>
    <div className={styles.intro}>
      <h1 ref={headingRef} tabIndex={-1}>{sentTo ? 'Check your email' : `Sign in to ${label}`}</h1>
      {sentTo ? <p>If an account exists for <span className={styles.email}>{sentTo}</span>, you’ll receive a sign-in link. Open it in this browser to continue.</p>
        : <p>Continue to your workspace with your GALX account.</p>}
    </div>
    {notice && !error && !sentTo && <p className={styles.notice}>{notice}</p>}
    {error && <div className={styles.error} role="alert" ref={errorRef} tabIndex={-1}>{error}</div>}
    {sentTo ? <div className={styles.actions}>
      <p className={styles.status}>If you don’t see it, check your spam folder or try another sign-in method.</p>
      <button className={styles.button} disabled={Boolean(busy) || cooldown > 0} onClick={() => void submit()}>{busy ? 'Sending link…' : cooldown ? `Resend link in ${cooldown}s` : 'Resend sign-in link'}</button>
      <button className={`${styles.link} ${styles.textButton}`} disabled={Boolean(busy)} onClick={() => { setSentTo(''); setError(''); }}>Use a different email</button>
      <button className={`${styles.link} ${styles.textButton}`} disabled={Boolean(busy)} onClick={() => { setSentTo(''); setError(''); setMethod('password'); }}>Use your password instead</button>
    </div> : <>
      <div className={styles.providers} aria-label="Sign-in methods">
        <button type="button" className={styles.button} disabled={Boolean(busy)} onClick={() => void oauth('google')}>{busy === 'google' ? 'Opening Google…' : 'Continue with Google'}</button>
        <button type="button" className={styles.button} disabled={Boolean(busy)} onClick={() => void oauth('github')}><Github aria-hidden="true" />{busy === 'github' ? 'Opening GitHub…' : 'Continue with GitHub'}</button>
      </div>
      <div className={styles.divider}>or use email</div>
      <form className={styles.form} onSubmit={submit} noValidate aria-label={method === 'password' ? 'Sign in with email' : 'Email a sign-in link'} aria-busy={Boolean(busy)}>
        <div className={styles.field}>
          <label htmlFor="signin-email">Email</label>
          <input ref={emailRef} id="signin-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} inputMode="email" required maxLength={254} value={email} onChange={event => { setEmail(event.target.value); setFieldErrors(value => ({ ...value, email: undefined })); }} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'signin-email-error' : undefined} />
          {fieldErrors.email && <span id="signin-email-error" className={styles.fieldError}>{fieldErrors.email}</span>}
        </div>
        {method === 'password' && <div className={styles.field}>
          <label htmlFor="signin-password">Password</label>
          <div className={styles.password}>
            <input ref={passwordRef} id="signin-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={event => { setPassword(event.target.value); setFieldErrors(value => ({ ...value, password: undefined })); }} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'signin-password-error' : undefined} />
            <button type="button" className={styles.reveal} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>
          </div>
          {fieldErrors.password && <span id="signin-password-error" className={styles.fieldError}>{fieldErrors.password}</span>}
        </div>}
        <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={Boolean(busy) || (method === 'link' && cooldown > 0)}>{busy === 'password' ? 'Signing in…' : busy === 'link' ? 'Sending link…' : method === 'link' ? cooldown ? `Send link in ${cooldown}s` : 'Email me a sign-in link' : 'Sign in'}{!busy && <ArrowRight aria-hidden="true" />}</button>
      </form>
      <div className={styles.switch}><button className={`${styles.link} ${styles.textButton}`} disabled={Boolean(busy)} onClick={() => { setMethod(value => value === 'password' ? 'link' : 'password'); setError(''); setFieldErrors({}); }}>{method === 'password' ? 'Use an email link instead' : 'Use your password instead'}</button></div>
      <p className={styles.signup}>New to GALX? <Link prefetch={false} className={styles.link} href={`/auth/signup?${new URLSearchParams({ next: returnTo })}`}>Create an account</Link></p>
    </>}
  </AuthEntryShell>;
}
