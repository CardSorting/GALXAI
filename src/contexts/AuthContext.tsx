'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Provider, Session, User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { registerAccount, type SignupCredentials } from '@/lib/auth/signup';
import { safeAuthRedirect, authEntryPath } from '@/lib/auth/redirects';
import { LOGOUT_STATE_KEY, SessionRequestFence, logoutState, markLogout, rememberOwner } from '@/lib/auth/browser-session';
import { fetchBrowserSession } from '@/lib/auth/browser-verification';

export interface AuthUser { id: string; email?: string; name?: string; avatarUrl?: string; provider?: string; token?: string; role?: string; company?: string; }
export interface DemoUserParams { role?: 'dev' | 'lead' | 'enterprise'; email?: string; name?: string; }
export type AuthStatus = 'loading' | 'ready' | 'unavailable' | 'reconnecting' | 'signing_out' | 'signout_failed';
interface AuthContextType {
  status: AuthStatus; retrySession: () => Promise<void>;
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
const signInPath = () => authEntryPath(returnPath(), 'login', 'signed_out');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(createClient);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const candidate = useRef<Session | null>(null), currentUser = useRef<AuthUser | null>(null);
  const fence = useRef(new SessionRequestFence()), alive = useRef(false), logoutLock = useRef(false);
  const lastVerified = useRef(0);
  const lastAttempt = useRef(0);
  const verifying = useRef(false);
  const inFlight = useRef<{ key: string | null; promise: Promise<void> } | null>(null);
  const initialization = useRef(0);
  const clearUser = useCallback(() => { currentUser.current = null; setUser(null); setSession(null); rememberOwner(null); }, []);

  const verify = useCallback((next: Session | null): Promise<void> => {
    if (logoutState()) return Promise.resolve();
    const key = next?.access_token ?? null;
    if (inFlight.current?.key === key) return inFlight.current.promise;
    candidate.current = next;
    const request = fence.current.begin();
    lastAttempt.current = Date.now();
    verifying.current = true;
    if (currentUser.current && next?.user.id && currentUser.current.id !== next.user.id) { clearUser(); setStatus('loading'); }
    const promise = (async () => { try {
      const profile = await fetchBrowserSession(request.signal);
      if (!alive.current || !request.current() || logoutState()) return;
      if (!profile) { clearUser(); lastVerified.current = Date.now(); setStatus('ready'); return; }
      const matching = next?.user.id === profile.user.id ? next : null;
      // First-party requests use the current cookie, never a captured bearer token.
      const mapped: AuthUser = { ...profile.user, provider: 'account' };
      currentUser.current = mapped; setUser(mapped); setSession(matching); rememberOwner(profile.user);
      lastVerified.current = Date.now(); setStatus('ready');
    } catch {
      if (alive.current && request.current() && !logoutState()) {
        // An outage cannot create a session or overwrite an already verified same-account view.
        setStatus(currentUser.current ? 'reconnecting' : 'unavailable');
      }
    } finally { if (request.current()) { verifying.current = false; inFlight.current = null; } } })();
    inFlight.current = { key, promise };
    return promise;
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
    // Cookie verification cannot be held hostage by SDK initialization/refresh locks.
    if (!marker) void verify(null);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active()) return;
      const unchanged = candidate.current?.access_token === next?.access_token;
      candidate.current = next;
      if (event === 'SIGNED_OUT') { clearTimeout(scheduled); requestFence.invalidate(); inFlight.current = null; verifying.current = false; clearUser(); if (!logoutLock.current) setStatus(logoutState() === 'pending' ? 'signout_failed' : 'ready'); return; }
      if (logoutState()) return;
      if (event === 'SIGNED_IN' && unchanged && Date.now() - lastVerified.current < 30_000) return;
      // Fence immediately: a previous read can settle before the deferred callback.
      if (!unchanged) {
        requestFence.invalidate(); inFlight.current = null; verifying.current = false;
        if (currentUser.current && next?.user.id && currentUser.current.id !== next.user.id) { clearUser(); setStatus('loading'); }
      }
      // Never await another SDK call inside its locked auth-state callback.
      clearTimeout(scheduled); scheduled = setTimeout(() => { void verify(next); }, 0);
    });
    const storage = (event: StorageEvent) => {
      if (event.key !== LOGOUT_STATE_KEY || !event.newValue) return;
      clearTimeout(scheduled); candidate.current = null;
      requestFence.invalidate(); inFlight.current = null; verifying.current = false; clearUser(); void supabase.auth.stopAutoRefresh();
      if (event.newValue === 'complete') window.location.replace(signInPath());
      else setStatus('signout_failed');
    };
    let disconnected = !navigator.onLine;
    let needsRefresh = false;
    const resume = (force = false) => {
      needsRefresh ||= force;
      const marker = logoutState();
      // Storage events can be missed while a document is in the back/forward cache.
      if (marker) {
        clearTimeout(scheduled); requestFence.invalidate(); inFlight.current = null; verifying.current = false; candidate.current = null;
        clearUser(); void supabase.auth.stopAutoRefresh();
        if (!logoutLock.current) setStatus(marker === 'pending' ? 'signout_failed' : 'ready');
        return;
      }
      if (!verifying.current && document.visibilityState === 'visible' && navigator.onLine && (needsRefresh || Date.now() - lastAttempt.current >= 30_000)) {
        needsRefresh = false; void verify(candidate.current);
      }
    };
    const focus = () => resume();
    const offline = () => { disconnected = true; };
    const online = () => { const force = disconnected; disconnected = false; resume(force); };
    const pagehide = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      clearTimeout(scheduled); requestFence.invalidate(); inFlight.current = null; verifying.current = false;
    };
    const pageshow = (event: PageTransitionEvent) => { if (event.persisted) resume(true); };
    window.addEventListener('storage', storage); window.addEventListener('online', online); window.addEventListener('offline', offline); window.addEventListener('focus', focus); document.addEventListener('visibilitychange', focus);
    window.addEventListener('pagehide', pagehide); window.addEventListener('pageshow', pageshow);
    return () => { alive.current = false; requestFence.invalidate(); inFlight.current = null; verifying.current = false; clearTimeout(scheduled); subscription.unsubscribe(); window.removeEventListener('storage', storage); window.removeEventListener('online', online); window.removeEventListener('offline', offline); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); window.removeEventListener('pagehide', pagehide); window.removeEventListener('pageshow', pageshow); };
  }, [supabase, verify, clearUser]);

  const beginSignIn = () => { markLogout(null); fence.current.invalidate(); inFlight.current = null; verifying.current = false; };
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
  const retrySession = async () => { if (!logoutState()) await verify(candidate.current); };
  const value: AuthContextType = { status, retrySession, user, session, supabaseUser: session?.user ?? null, isAuthenticated: Boolean(user), isLoading: status === 'loading' || status === 'signing_out', signInWithOAuth, signInWithPassword, signUp, signInWithOtp, signInWithSSO, signOut, logout: signOut, loginWithOAuth: provider => signInWithOAuth(provider as Provider), signInWithDemo: () => location.assign('/login'), signInWithProviderKey: async () => ({ success: false, error: 'Sign in to your GALX account to manage connections.' }) };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;

}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within an AuthProvider'); return context; }
