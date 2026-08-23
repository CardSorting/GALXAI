'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { SafeStorage } from '@/lib/resilience/SafeStorage';

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
      const parsed = SafeStorage.getJSON<AuthUser | null>(AUTH_STORAGE_KEY, null);
      if (parsed) {
        setUser(parsed);

        // Background session verification against Supabase PostgreSQL
        if (parsed.token && parsed.token.startsWith('galx_sess_')) {
          resilientFetch<{ valid: boolean }>('/api/auth/session', {
            method: 'GET',
            headers: { Authorization: `Bearer ${parsed.token}` },
            enableCacheFallback: false,
          })
            .then(({ data }) => {
              if (data && !data.valid) {
                // Session expired or revoked in database - log out
                setUser(null);
                SafeStorage.removeItem(AUTH_STORAGE_KEY);
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
      const res = await resilientFetch<{ success: boolean; user: AuthUser; error?: string }>('/api/auth/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: options?.apiKey,
          email: options?.email || 'creator@openai.user',
          displayName: options?.displayName || 'OpenAI Creator',
          mode: options?.mode || 'pooled'
        })
      });
      const data = res.data;
      if (!data?.success || !data?.user) {
        throw new Error(data?.error || 'Failed to authenticate with OpenAI');
      }

      const authUser: AuthUser = data.user;
      setUser(authUser);
      SafeStorage.setJSON(AUTH_STORAGE_KEY, authUser);
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
      const res = await resilientFetch<{ success: boolean; user: AuthUser; error?: string }>('/api/auth/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: options?.apiKey,
          email: options?.email || 'creator@x.ai',
          displayName: options?.displayName || 'Grok Creator',
          mode: options?.mode || 'pooled'
        })
      });
      const data = res.data;
      if (!data?.success || !data?.user) {
        throw new Error(data?.error || 'Failed to authenticate with xAI Grok');
      }

      const authUser: AuthUser = data.user;
      setUser(authUser);
      SafeStorage.setJSON(AUTH_STORAGE_KEY, authUser);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsGuest = async () => {
    setIsLoading(true);
    try {
      const res = await resilientFetch<{ success: boolean; user: AuthUser }>('/api/auth/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'guest@galxai.demo',
          displayName: 'Guest Creator',
          mode: 'pooled'
        })
      });
      const data = res.data;
      if (data?.success && data?.user) {
        const guestUser: AuthUser = {
          ...data.user,
          provider: 'guest'
        };
        setUser(guestUser);
        SafeStorage.setJSON(AUTH_STORAGE_KEY, guestUser);
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
    SafeStorage.removeItem(AUTH_STORAGE_KEY);

    // Asynchronously revoke session in Supabase PostgreSQL
    if (activeToken) {
      resilientFetch('/api/auth/session', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${activeToken}` }
      }).catch(() => {});
    }

    if (activeShardId) {
      try {
        await resilientFetch(`/api/shards/${activeShardId}/retract`, {
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
