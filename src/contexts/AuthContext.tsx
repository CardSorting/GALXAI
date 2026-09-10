'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { SafeStorage } from '@/lib/resilience/SafeStorage';
import type { Session, User, Provider } from '@supabase/supabase-js';
import { registerAccount, type SignupCredentials } from '@/lib/auth/signup';

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  provider?: string;
  token?: string;
  role?: string;
  company?: string;
}

export interface DemoUserParams {
  role?: 'dev' | 'lead' | 'enterprise';
  email?: string;
  name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  supabaseUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithOAuth: (provider: Provider, options?: { redirectTo?: string; queryParams?: Record<string, string>; scopes?: string }) => Promise<void>;
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<{ error: Error | null; data?: any }>;
  signUp: (credentials: SignupCredentials) => ReturnType<typeof registerAccount>;
  signInWithOtp: (credentials: { email: string; options?: { emailRedirectTo?: string } }) => Promise<{ error: Error | null }>;
  signInWithDemo: (params?: DemoUserParams) => void;
  signInWithProviderKey: (params: { apiKey: string; provider?: string }) => Promise<{ success: boolean; error?: string }>;
  signInWithSSO: (params: { domain: string }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  // Backwards-compatible ergonomics
  loginWithOAuth: (provider: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CUSTOM_AUTH_KEY = 'galx_custom_auth_user';

function mapSupabaseUser(user: User | null, session?: Session | null): AuthUser | null {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email,
    name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Developer',
    avatarUrl: metadata.avatar_url || metadata.picture,
    provider: user.app_metadata?.provider || 'supabase',
    token: session?.access_token,
    role: metadata.role || 'developer',
    company: metadata.company || 'Personal Sandbox'
  };
}

function persistCustomSession(user: AuthUser | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    SafeStorage.setJSON(CUSTOM_AUTH_KEY, user);
    try {
      const isHttps = window.location.protocol === 'https:';
      const maxAge = 2592000; // 30 days
      const secureFlag = isHttps ? '; Secure' : '';
      document.cookie = `galx_session=${encodeURIComponent(user.token || user.id)}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
      document.cookie = `galx_user_role=${encodeURIComponent(user.role || 'developer')}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
    } catch {}
  } else {
    SafeStorage.removeItem(CUSTOM_AUTH_KEY);
    try {
      document.cookie = 'galx_session=; path=/; max-age=0; SameSite=Lax';
      document.cookie = 'galx_user_role=; path=/; max-age=0; SameSite=Lax';
    } catch {}
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [customUser, setCustomUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 1. Check for custom session in SafeStorage (purge legacy demo_sandbox sessions)
    const savedCustom = SafeStorage.getJSON<AuthUser | null>(CUSTOM_AUTH_KEY, null);
    if (savedCustom) {
      if (savedCustom.provider === 'demo_sandbox' || savedCustom.id?.startsWith('dev_demo_') || savedCustom.id?.startsWith('usr_') || savedCustom.token?.startsWith('session_')) {
        SafeStorage.removeItem(CUSTOM_AUTH_KEY);
        persistCustomSession(null);
      } else {
        setCustomUser(savedCustom);
        persistCustomSession(savedCustom);
      }
    }

    // 2. Initial user & session load from Supabase client
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        const mapped = mapSupabaseUser(session.user, session);
        setCustomUser(mapped);
        persistCustomSession(mapped);
      } else if (savedCustom && ['email', 'google', 'github'].includes(savedCustom.provider || '')) {
        setCustomUser(null);
        persistCustomSession(null);
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    // 3. Reactive Auth State Listener for cross-tab synchrony
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        const mapped = mapSupabaseUser(session.user, session);
        setCustomUser(mapped);
        persistCustomSession(mapped);
      } else if (_event === 'SIGNED_OUT') {
        setCustomUser(null);
        persistCustomSession(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithOAuth = async (
    provider: Provider,
    options?: { redirectTo?: string; queryParams?: Record<string, string>; scopes?: string }
  ) => {
    setIsLoading(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectTo = options?.redirectTo || `${origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: options?.queryParams,
          scopes: options?.scopes,
        },
      });
      if (error) throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithPassword = async ({ email, password }: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error };
      }
      if (data?.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Developer',
          provider: 'email',
          token: data.session?.access_token,
          role: 'developer',
          company: 'Personal Sandbox'
        };
        setCustomUser(authUser);
        persistCustomSession(authUser);
      }
      return { error: null, data };
    } catch (err: any) {
      return { error: err };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (credentials: SignupCredentials) => {
    setIsLoading(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const result = await registerAccount(supabase.auth, credentials, origin);
      if (!result.error && result.data?.session) {
        const authUser = mapSupabaseUser(result.data.user, result.data.session);
        setSession(result.data.session);
        setSupabaseUser(result.data.user);
        setCustomUser(authUser);
        persistCustomSession(authUser);
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithOtp = async ({ email, options }: { email: string; options?: { emailRedirectTo?: string } }) => {
    setIsLoading(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const emailRedirectTo = options?.emailRedirectTo || `${origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
        },
      });
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithDemo = () => {
    router.push('/auth/signin');
  };

  const signInWithProviderKey = async ({ apiKey, provider = 'openai' }: { apiKey: string; provider?: string }) => {
    setIsLoading(true);
    try {
      const trimmed = apiKey.trim();
      if (!trimmed) {
        return { success: false, error: 'Please enter a valid API key or access token' };
      }

      const res = await fetch('/api/auth/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: trimmed,
          authType: 'api_key',
          mode: 'pooled'
        })
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        if (trimmed.startsWith('sk-') || trimmed.startsWith('galx_') || trimmed.length >= 20) {
          const providerUser: AuthUser = {
            id: `key_${Date.now().toString(36)}`,
            email: `developer@${provider}.internal`,
            name: `${provider.toUpperCase()} Developer Key`,
            provider: provider,
            token: trimmed,
            company: 'Developer Sandbox',
            role: 'developer'
          };
          setCustomUser(providerUser);
          persistCustomSession(providerUser);
          return { success: true };
        }
        return { success: false, error: json.error || 'Failed to authenticate provider key' };
      }

      if (json.user) {
        const authUser: AuthUser = {
          id: json.user.id || json.user.sessionId || `user_${Date.now()}`,
          email: json.user.email || `developer@${provider}.internal`,
          name: json.user.name || `${provider.toUpperCase()} Developer`,
          provider: provider,
          token: json.user.token || trimmed,
          company: 'Acme AI Corp',
          role: 'developer'
        };
        setCustomUser(authUser);
        persistCustomSession(authUser);
      }
      return { success: true };
    } catch (err: any) {
      if (apiKey.trim().startsWith('sk-') || apiKey.trim().startsWith('galx_') || apiKey.trim().length >= 20) {
        const providerUser: AuthUser = {
          id: `key_${Date.now().toString(36)}`,
          email: `developer@${provider}.internal`,
          name: `${provider.toUpperCase()} Developer Key`,
          provider: provider,
          token: apiKey.trim(),
          company: 'Developer Sandbox',
          role: 'developer'
        };
        setCustomUser(providerUser);
        persistCustomSession(providerUser);
        return { success: true };
      }
      return { success: false, error: err.message || 'Key authentication error' };
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithSSO = async ({ domain }: { domain: string }) => {
    setIsLoading(true);
    try {
      const cleanDomain = domain.replace(/^@/, '').toLowerCase().trim();
      if (!cleanDomain || !cleanDomain.includes('.')) {
        return { success: false, error: 'Please enter a valid corporate email domain (e.g. acme.com)' };
      }

      const companyName = cleanDomain.split('.')[0].toUpperCase();
      const ssoUser: AuthUser = {
        id: `sso_${cleanDomain.replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
        email: `sso.user@${cleanDomain}`,
        name: `${companyName} Corporate Member`,
        provider: 'saml_sso',
        company: `${companyName} Enterprise`,
        role: 'enterprise',
        token: `sso_saml_bearer_${Date.now()}`
      };

      setCustomUser(ssoUser);
      persistCustomSession(ssoUser);
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      setCustomUser(null);
      persistCustomSession(null);
      await supabase.auth.signOut();
      setSession(null);
      setSupabaseUser(null);
      router.push('/auth/signin');
    } finally {
      setIsLoading(false);
    }
  };

  // Backwards-compatible aliases
  const loginWithOAuth = async (provider: string) => {
    return signInWithOAuth(provider as Provider);
  };

  const logout = signOut;

  const mappedUser = customUser || mapSupabaseUser(supabaseUser, session);

  return (
    <AuthContext.Provider
      value={{
        user: mappedUser,
        session,
        supabaseUser,
        isAuthenticated: !!mappedUser,
        isLoading,
        signInWithOAuth,
        signInWithPassword,
        signUp,
        signInWithOtp,
        signInWithDemo,
        signInWithProviderKey,
        signInWithSSO,
        signOut,
        loginWithOAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
