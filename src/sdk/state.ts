/**
 * GALXAI Reactive AI State Primitives
 * Observable, persistent AI generation signals for React & Vanilla JS.
 */

'use client';

import { useState, useEffect } from 'react';
import type { ImageGenerateParams } from './resources/images';

export interface AISignalConfig<T = any> {
  prompt: string;
  type?: 'image' | 'chat';
  aspectRatio?: string;
  model?: string;
  persistKey?: string;
  initialValue?: T;
  endpoint?: string;
}

export interface AISignal<T = any> {
  get: () => T | null;
  subscribe: (listener: (val: T | null) => void) => () => void;
  synthesize: (newPrompt?: string) => Promise<T | null>;
  isLoading: () => boolean;
}

export function createAISignal<T = any>(config: AISignalConfig<T>): AISignal<T> {
  let value: T | null = config.initialValue || null;
  let isLoading = false;
  const listeners = new Set<(val: T | null) => void>();

  // Check LocalStorage persistence
  if (config.persistKey && typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(config.persistKey);
      if (saved) {
        value = JSON.parse(saved);
      }
    } catch {}
  }

  const notify = () => {
    listeners.forEach(l => l(value));
  };

  const synthesize = async (newPrompt?: string): Promise<T | null> => {
    const targetPrompt = newPrompt || config.prompt;
    isLoading = true;
    notify();

    try {
      const endpoint = config.endpoint || (config.type === 'chat' ? '/api/galxai/chat' : '/api/galxai');
      const payload: ImageGenerateParams = {
        prompt: targetPrompt,
        model: config.model,
        aspectRatio: config.aspectRatio
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        value = (data.data?.[0]?.url || data.text || data) as T;
        if (config.persistKey && typeof window !== 'undefined') {
          window.localStorage.setItem(config.persistKey, JSON.stringify(value));
        }
      }
    } catch (e) {
      console.warn('[AISignal] Synthesis failed:', e);
    } finally {
      isLoading = false;
      notify();
    }

    return value;
  };

  return {
    get: () => value,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    synthesize,
    isLoading: () => isLoading
  };
}

/**
 * React Hook to consume an AISignal with automatic re-renders.
 */
export function useAISignal<T = any>(signal: AISignal<T>) {
  const [val, setVal] = useState<T | null>(signal.get());
  const [loading, setLoading] = useState(signal.isLoading());

  useEffect(() => {
    return signal.subscribe((newVal) => {
      setVal(newVal);
      setLoading(signal.isLoading());
    });
  }, [signal]);

  return {
    value: val,
    isLoading: loading,
    synthesize: signal.synthesize
  };
}
