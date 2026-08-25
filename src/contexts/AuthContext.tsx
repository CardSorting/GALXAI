'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import type { Session, User, Provider } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  provider?: string;
  token?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  supabaseUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithOAuth: (provider: Provider, options?: { redirectTo?: string }) => Promise<void>;
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<{ error: Error | null }>;
  signUp: (credentials: { email: string; password: string }) => Promise<{ error: Error | null }>;
  signInWithOtp: (credentials: { email: string; options?: { emailRedirectTo?: string } }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  // Backwards-compatible ergonomics
  loginWithOAuth: (provider: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 1. Initial user & session load from Supabase client
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    // 2. Reactive Auth State Listener for cross-tab synchrony
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithOAuth = async (provider: Provider, options?: { redirectTo?: string }) => {
    setIsLoading(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectTo = options?.redirectTo || `${origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async ({ email, password }: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });
      return { error };
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

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setSupabaseUser(null);
      router.push('/auth/connect');
    } finally {
      setIsLoading(false);
    }
  };

  // Backwards-compatible aliases
  const loginWithOAuth = async (provider: string) => {
    const validProvider = (provider === 'grok' || provider === 'xai-grok' ? 'twitter' : provider) as Provider;
    return signInWithOAuth(validProvider);
  };

  const logout = signOut;

  const mappedUser = mapSupabaseUser(supabaseUser, session);

  return (
    <AuthContext.Provider
      value={{
        user: mappedUser,
        session,
        supabaseUser,
        isAuthenticated: !!supabaseUser,
        isLoading,
        signInWithOAuth,
        signInWithPassword,
        signUp,
        signInWithOtp,
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
