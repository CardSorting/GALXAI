'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { resilientFetch, ResilientFetchOptions } from './ResilientClient';
import { BroccoliResilienceSubstrate } from './BroccoliResilienceSubstrate';

export interface UseResilientQueryOptions<T> extends ResilientFetchOptions {
  enabled?: boolean;
  refetchIntervalMs?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export interface UseResilientQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: Error | null;
  isStale: boolean;
  refetch: () => Promise<void>;
  status: number | null;
}

export function useResilientQuery<T = any>(
  url: string,
  options: UseResilientQueryOptions<T> = {}
): UseResilientQueryResult<T> {
  const {
    enabled = true,
    refetchIntervalMs,
    refetchOnWindowFocus = true,
    refetchOnReconnect = true,
    initialData = null,
    onSuccess,
    onError,
    ...fetchOptions
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [status, setStatus] = useState<number | null>(null);

  const isMountedRef = useRef(true);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const fetchOptionsRef = useRef(fetchOptions);
  fetchOptionsRef.current = fetchOptions;

  const executeFetch = useCallback(
    async (isBackground = false) => {
      if (!enabled || !url) return;

      if (isBackground) {
        setIsRefetching(true);
      } else {
        setIsLoading(true);
      }

      try {
        const result = await resilientFetch<T>(url, fetchOptionsRef.current);

        if (!isMountedRef.current) return;

        setData(result.data);
        setStatus(result.status);
        setIsStale(Boolean(result.fromCache));
        setIsError(false);
        setError(null);

        if (optionsRef.current.onSuccess) {
          optionsRef.current.onSuccess(result.data);
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;

        setIsError(true);
        setError(err);

        if (optionsRef.current.onError) {
          optionsRef.current.onError(err);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefetching(false);
        }
      }
    },
    [enabled, url]
  );

  // Initial Fetch & URL change
  useEffect(() => {
    isMountedRef.current = true;
    executeFetch(false);

    return () => {
      isMountedRef.current = false;
    };
  }, [executeFetch]);

  // Window Focus Revalidation
  useEffect(() => {
    if (!refetchOnWindowFocus || typeof window === 'undefined') return;

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        executeFetch(true);
      }
    };

    window.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  }, [executeFetch, refetchOnWindowFocus]);

  // Network Online Reconnect Trigger
  useEffect(() => {
    if (!refetchOnReconnect || typeof window === 'undefined') return;

    const handleOnline = () => {
      console.log('🌐 [GALXAI Resilient Client] Network reconnected — refreshing query for:', url);
      executeFetch(true);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [executeFetch, refetchOnReconnect, url]);

  // Periodic Polling Interval (tab visibility aware)
  useEffect(() => {
    if (!refetchIntervalMs || refetchIntervalMs <= 0 || typeof window === 'undefined') return;

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        executeFetch(true);
      }
    }, refetchIntervalMs);

    return () => clearInterval(intervalId);
  }, [executeFetch, refetchIntervalMs]);

  const refetch = useCallback(async () => {
    await executeFetch(true);
  }, [executeFetch]);

  return {
    data,
    isLoading,
    isRefetching,
    isError,
    error,
    isStale,
    refetch,
    status,
  };
}
