'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resilientFetch } from '@/lib/resilience/ResilientClient';
import { SafeStorage } from '@/lib/resilience/SafeStorage';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: 'openai' | 'grok' | 'xai-grok';
  shardId?: string;
  shardMode?: 'pooled' | 'private';
  token: string;
  accountId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithOAuth: (provider: 'openai' | 'grok', options?: { mode?: 'pooled' | 'private' }) => Promise<void>;
  loginWithTokens: (options: {
    provider: 'openai' | 'grok';
    accessToken: string;
    refreshToken?: string;
    accountId?: string;
    email?: string;
    displayName?: string;
    mode?: 'pooled' | 'private';
  }) => Promise<void>;
  loginWithOpenAI: (options?: { apiKey?: string; accessToken?: string; refreshToken?: string; accountId?: string; email?: string; displayName?: string; mode?: 'pooled' | 'private' }) => Promise<void>;
  loginWithGrok: (options?: { apiKey?: string; accessToken?: string; refreshToken?: string; accountId?: string; email?: string; displayName?: string; mode?: 'pooled' | 'private' }) => Promise<void>;
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

  const loginWithOAuth = async (provider: 'openai' | 'grok', options?: { mode?: 'pooled' | 'private' }) => {
    setIsLoading(true);
    try {
      const providerParam = provider === 'grok' ? 'xai-grok' : 'openai';
      const redirectUri = `${window.location.origin}/auth/callback`;
      const res = await resilientFetch<{ success: boolean; url: string; codeVerifier: string; state: string }>(
        `/api/auth/oauth/url?provider=${providerParam}&redirectUri=${encodeURIComponent(redirectUri)}`,
        { enableCacheFallback: false }
      );

      if (!res.data?.success || !res.data?.url) {
        throw new Error('Failed to generate OAuth login URL');
      }

      // Store PKCE verifier and state for callback verification
      SafeStorage.setJSON('galxai_oauth_pkce', {
        provider: providerParam,
        codeVerifier: res.data.codeVerifier,
        state: res.data.state,
        mode: options?.mode || 'pooled'
      });

      // Redirect to provider OAuth authorize page
      window.location.href = res.data.url;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithTokens = async (options: {
    provider: 'openai' | 'grok';
    accessToken: string;
    refreshToken?: string;
    accountId?: string;
    email?: string;
    displayName?: string;
    mode?: 'pooled' | 'private';
  }) => {
    setIsLoading(true);
    try {
      const endpoint = options.provider === 'grok' ? '/api/auth/grok' : '/api/auth/openai';
      const res = await resilientFetch<{ success: boolean; user: AuthUser; error?: string }>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: options.accessToken,
          refreshToken: options.refreshToken,
          accountId: options.accountId,
          email: options.email,
          displayName: options.displayName,
          mode: options.mode || 'pooled',
          authType: 'oauth'
        }),
        enableCacheFallback: false
      });

      const data = res.data;
      if (!data?.success || !data?.user) {
        throw new Error(data?.error || `Failed to authenticate with ${options.provider}`);
      }

      const authUser: AuthUser = data.user;
      setUser(authUser);
      SafeStorage.setJSON(AUTH_STORAGE_KEY, authUser);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOpenAI = async (options?: {
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    accountId?: string;
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
          accessToken: options?.accessToken,
          refreshToken: options?.refreshToken,
          accountId: options?.accountId,
          email: options?.email,
          displayName: options?.displayName,
          mode: options?.mode || 'pooled'
        }),
        enableCacheFallback: false
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
    accessToken?: string;
    refreshToken?: string;
    accountId?: string;
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
          accessToken: options?.accessToken,
          refreshToken: options?.refreshToken,
          accountId: options?.accountId,
          email: options?.email,
          displayName: options?.displayName,
          mode: options?.mode || 'pooled'
        }),
        enableCacheFallback: false
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
        loginWithOAuth,
        loginWithTokens,
        loginWithOpenAI,
        loginWithGrok,
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
