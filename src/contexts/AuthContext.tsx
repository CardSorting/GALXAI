'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: 'openai' | 'grok' | 'guest';
  shardId?: string;
  shardMode?: 'pooled' | 'private';
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithOpenAI: (options?: { apiKey?: string; email?: string; displayName?: string; mode?: 'pooled' | 'private' }) => Promise<void>;
  loginWithGrok: (options?: { apiKey?: string; email?: string; displayName?: string; mode?: 'pooled' | 'private' }) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'galxai_auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed: AuthUser = JSON.parse(stored);
        setUser(parsed);

        // Background session verification against Supabase PostgreSQL
        if (parsed.token && parsed.token.startsWith('galx_sess_')) {
          fetch('/api/auth/session', {
            method: 'GET',
            headers: { Authorization: `Bearer ${parsed.token}` }
          })
            .then(res => res.json())
            .then(data => {
              if (!data.valid) {
                // Session expired or revoked in database - log out
                setUser(null);
                localStorage.removeItem(AUTH_STORAGE_KEY);
              }
            })
            .catch(() => {
              // Ignore network offline errors for offline-first resilience
            });
        }
      }
    } catch {} finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithOpenAI = async (options?: {
    apiKey?: string;
    email?: string;
    displayName?: string;
    mode?: 'pooled' | 'private';
  }) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: options?.apiKey,
          email: options?.email || 'creator@openai.user',
          displayName: options?.displayName || 'OpenAI Creator',
          mode: options?.mode || 'pooled'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to authenticate with OpenAI');
      }

      const authUser: AuthUser = data.user;
      setUser(authUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGrok = async (options?: {
    apiKey?: string;
    email?: string;
    displayName?: string;
    mode?: 'pooled' | 'private';
  }) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: options?.apiKey,
          email: options?.email || 'creator@x.ai',
          displayName: options?.displayName || 'Grok Creator',
          mode: options?.mode || 'pooled'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to authenticate with xAI Grok');
      }

      const authUser: AuthUser = data.user;
      setUser(authUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsGuest = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'guest@galxai.demo',
          displayName: 'Guest Creator',
          mode: 'pooled'
        })
      });
      const data = await res.json();
      if (data.success) {
        const guestUser: AuthUser = {
          ...data.user,
          provider: 'guest'
        };
        setUser(guestUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(guestUser));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const activeToken = user?.token;
    const activeShardId = user?.shardId;
    const activeUserId = user?.id;

    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);

    // Asynchronously revoke session in Supabase PostgreSQL
    if (activeToken) {
      fetch('/api/auth/session', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${activeToken}` }
      }).catch(() => {});
    }

    if (activeShardId) {
      try {
        await fetch(`/api/shards/${activeShardId}/retract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: activeUserId })
        });
      } catch {}
    }

    router.push('/auth/connect');
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithOpenAI,
        loginWithGrok,
        loginAsGuest,
        logout
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
