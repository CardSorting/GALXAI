'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Provider, Session, User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { registerAccount, type SignupCredentials } from '@/lib/auth/signup';
import { safeAuthRedirect } from '@/lib/auth/redirects';
import { LOGOUT_STATE_KEY, SessionRequestFence, logoutState, markLogout, readSessionProfile, rememberOwner } from '@/lib/auth/browser-session';
import { AuthEntryShell } from '@/components/auth/AuthEntryShell';
import styles from '@/components/auth/auth-entry.module.css';

export interface AuthUser { id: string; email?: string; name?: string; avatarUrl?: string; provider?: string; token?: string; role?: string; company?: string; }
export interface DemoUserParams { role?: 'dev' | 'lead' | 'enterprise'; email?: string; name?: string; }
type Status = 'loading' | 'ready' | 'unavailable' | 'signing_out' | 'signout_failed';
interface AuthContextType {
  user: AuthUser | null; session: Session | null; supabaseUser: User | null; isAuthenticated: boolean; isLoading: boolean;
  signInWithOAuth: (provider: Provider, options?: { redirectTo?: string; queryParams?: Record<string, string>; scopes?: string }) => Promise<void>;
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<{ error: Error | null; data?: any }>;
  signUp: (credentials: SignupCredentials) => ReturnType<typeof registerAccount>;
  signInWithOtp: (credentials: { email: string; options?: { emailRedirectTo?: string } }) => Promise<{ error: Error | null }>;
  signInWithDemo: (params?: DemoUserParams) => void;
  signInWithProviderKey: (params: { apiKey: string; provider?: string }) => Promise<{ success: boolean; error?: string }>;
  signInWithSSO: (params: { domain: string }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>; loginWithOAuth: (provider: string) => Promise<void>; logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const returnPath = () => safeAuthRedirect(location.pathname + location.search);
const signInPath = () => `/auth/signin?${new URLSearchParams({ next: returnPath(), error: 'signed_out' })}`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(createClient);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const candidate = useRef<Session | null>(null), currentUser = useRef<AuthUser | null>(null);
  const fence = useRef(new SessionRequestFence()), alive = useRef(false), logoutLock = useRef(false);
  const lastVerified = useRef(0);
  const verifying = useRef(false);
  const initialization = useRef(0);
  const recoveryHeading = useRef<HTMLHeadingElement>(null);
  const clearUser = useCallback(() => { currentUser.current = null; setUser(null); setSession(null); rememberOwner(null); }, []);

  const verify = useCallback(async (next: Session | null) => {
    if (logoutState()) return;
    candidate.current = next;
    const request = fence.current.begin();
    verifying.current = true;
    if (currentUser.current && next?.user.id && currentUser.current.id !== next.user.id) clearUser();
    try {
      const response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]), headers: next?.access_token ? { Authorization: `Bearer ${next.access_token}` } : undefined });
      if (!alive.current || !request.current() || logoutState()) return;
      if (response.status === 401) { clearUser(); setStatus('ready'); return; }
      if (!response.ok) throw new Error('Session unavailable');
      const profile = readSessionProfile(await response.json());
      if (!profile) throw new Error('Invalid session response');
      if (!alive.current || !request.current() || logoutState()) return;
      const matching = next?.user.id === profile.user.id ? next : null;
      const mapped: AuthUser = { ...profile.user, provider: 'account', ...(matching ? { token: matching.access_token } : {}) };
      currentUser.current = mapped; setUser(mapped); setSession(matching); rememberOwner(profile.user);
      lastVerified.current = Date.now(); setStatus('ready');
    } catch {
      if (alive.current && request.current() && !logoutState()) {
        // An outage cannot create a session or overwrite an already verified same-account view.
        if (!currentUser.current) setStatus('unavailable');
      }
    } finally { if (request.current()) verifying.current = false; }
  }, [clearUser]);

  useEffect(() => {
    alive.current = true;
    const requestFence = fence.current;
    const generation = ++initialization.current;
    const active = () => alive.current && initialization.current === generation;
    rememberOwner(null); // Discard old token/role-bearing local-storage mirrors before hydration.
    const marker = logoutState();
    if (marker) { clearUser(); setStatus(marker === 'pending' ? 'signout_failed' : 'ready'); }
    let scheduled: ReturnType<typeof setTimeout> | undefined;
    let authEventReceived = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active()) return;
      authEventReceived = true;
      candidate.current = next;
      if (event === 'SIGNED_OUT') { clearTimeout(scheduled); requestFence.invalidate(); verifying.current = false; clearUser(); if (!logoutLock.current) setStatus('ready'); return; }
      if (logoutState()) return;
      // Never await another SDK call inside its locked auth-state callback.
      clearTimeout(scheduled); scheduled = setTimeout(() => { void verify(next); }, 0);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!active() || authEventReceived) return;
      candidate.current = data.session;
      if (!logoutState()) void verify(data.session);
    }).catch(() => { if (active() && !authEventReceived && !logoutState()) setStatus('unavailable'); });
    const storage = (event: StorageEvent) => {
      if (event.key !== LOGOUT_STATE_KEY || !event.newValue) return;
      requestFence.invalidate(); clearUser(); void supabase.auth.stopAutoRefresh();
      if (event.newValue === 'complete') window.location.replace(signInPath());
      else setStatus('signout_failed');
    };
    const resume = () => { if (!verifying.current && document.visibilityState === 'visible' && navigator.onLine && Date.now() - lastVerified.current >= 30_000 && !logoutState()) void verify(candidate.current); };
    window.addEventListener('storage', storage); window.addEventListener('online', resume); window.addEventListener('focus', resume); document.addEventListener('visibilitychange', resume);
    return () => { alive.current = false; requestFence.invalidate(); clearTimeout(scheduled); subscription.unsubscribe(); window.removeEventListener('storage', storage); window.removeEventListener('online', resume); window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume); };
  }, [supabase, verify, clearUser]);
  useEffect(() => { if (status === 'signout_failed' || status === 'unavailable') recoveryHeading.current?.focus(); }, [status]);

  const beginSignIn = () => { markLogout(null); fence.current.invalidate(); };
  const signInWithOAuth: AuthContextType['signInWithOAuth'] = async (provider, options) => {
    beginSignIn();
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { ...options, redirectTo: options?.redirectTo || `${location.origin}/auth/callback` } });
    if (error) throw error;
  };
  const signInWithPassword: AuthContextType['signInWithPassword'] = async credentials => {
    beginSignIn();
    try { const result = await supabase.auth.signInWithPassword(credentials); return result; }
    catch (error) { return { error: error instanceof Error ? error : new Error('Sign-in unavailable') }; }
  };
  const signUp: AuthContextType['signUp'] = async credentials => { beginSignIn(); return registerAccount(supabase.auth, credentials, location.origin); };
  const signInWithOtp: AuthContextType['signInWithOtp'] = async ({ email, options }) => {
    beginSignIn(); return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: options?.emailRedirectTo || `${location.origin}/auth/callback`, shouldCreateUser: false } });
  };
  const signInWithSSO: AuthContextType['signInWithSSO'] = async ({ domain }) => {
    const cleanDomain = domain.trim().replace(/^@/, '').toLowerCase();
    if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(cleanDomain)) return { success: false, error: 'Enter your organization’s email domain.' };
    beginSignIn();
    try {
      const { data, error } = await supabase.auth.signInWithSSO({ domain: cleanDomain, options: { redirectTo: `${location.origin}/auth/callback?${new URLSearchParams({ next: returnPath() })}` } });
      if (error || !data?.url || new URL(data.url).protocol !== 'https:') throw new Error('SSO unavailable');
      location.assign(data.url); return { success: true };
    } catch { return { success: false, error: 'Organization sign-in could not be started. Try another sign-in method.' }; }
  };
  const signOut = async () => {
    if (logoutLock.current) return;
    logoutLock.current = true; markLogout('pending'); fence.current.invalidate(); clearUser(); setStatus('signing_out');
    void supabase.auth.stopAutoRefresh();
    try {
      const response = await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10_000) });
      if (!response.ok && response.status !== 401) throw new Error('Sign-out incomplete');
      // Server clears HttpOnly aliases and SDK cookies. A new document drops SDK in-memory credentials.
      rememberOwner(null); markLogout('complete'); window.location.replace(signInPath());
    } catch { if (alive.current) setStatus('signout_failed'); }
    finally { logoutLock.current = false; }
  };
  const value: AuthContextType = { user, session, supabaseUser: session?.user ?? null, isAuthenticated: Boolean(user), isLoading: status === 'loading' || status === 'signing_out', signInWithOAuth, signInWithPassword, signUp, signInWithOtp, signInWithSSO, signOut, logout: signOut, loginWithOAuth: provider => signInWithOAuth(provider as Provider), signInWithDemo: () => location.assign('/auth/signin'), signInWithProviderKey: async () => ({ success: false, error: 'Sign in to your GALX account to manage connections.' }) };
  const blocked = status === 'signing_out' || status === 'signout_failed' || status === 'unavailable';
  return <AuthContext.Provider value={value}>{blocked ? <AuthEntryShell>
    <div className={styles.intro}><h1 ref={recoveryHeading} tabIndex={-1}>{status === 'unavailable' ? 'We couldn’t check your session' : status === 'signing_out' ? 'Signing out…' : 'Finish signing out'}</h1>
      <p role={status === 'signing_out' ? 'status' : undefined}>{status === 'unavailable' ? 'Check your connection and try again.' : status === 'signing_out' ? 'Your workspace is hidden while we end this browser’s session.' : 'Your workspace is hidden. We couldn’t finish signing out. Try again to secure this browser.'}</p></div>
    {status !== 'signing_out' && <button className={`${styles.button} ${styles.primary}`} onClick={() => status === 'unavailable' ? void verify(candidate.current) : void signOut()}>{status === 'unavailable' ? 'Try again' : 'Retry sign-out'}</button>}
  </AuthEntryShell> : children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within an AuthProvider'); return context; }
