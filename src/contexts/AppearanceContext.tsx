'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SafeStorage } from '@/lib/resilience/SafeStorage';

export type ThemePreset = 'dark' | 'obsidian' | 'emerald' | 'synthwave' | 'contrast';
export type AccentColor = 'cyan' | 'indigo' | 'emerald' | 'amber' | 'purple' | 'rose';
export type InterfaceDensity = 'compact' | 'standard' | 'spacious';
export type CodeFontFamily = 'jetbrains' | 'fira' | 'inter';

export interface AppearanceSettings {
  theme: ThemePreset;
  accentColor: AccentColor;
  density: InterfaceDensity;
  fontFamily: CodeFontFamily;
  ambientGlow: boolean;
  glassmorphism: boolean;
  animationsEnabled: boolean;
  lineNumbers: boolean;
}

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: 'dark',
  accentColor: 'cyan',
  density: 'standard',
  fontFamily: 'jetbrains',
  ambientGlow: true,
  glassmorphism: true,
  animationsEnabled: true,
  lineNumbers: true,
};

interface AppearanceContextType {
  settings: AppearanceSettings;
  setTheme: (theme: ThemePreset) => void;
  setAccentColor: (accent: AccentColor) => void;
  setDensity: (density: InterfaceDensity) => void;
  setFontFamily: (font: CodeFontFamily) => void;
  setAmbientGlow: (enabled: boolean) => void;
  setGlassmorphism: (enabled: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setLineNumbers: (enabled: boolean) => void;
  updateSettings: (newSettings: Partial<AppearanceSettings>) => void;
  resetAppearance: () => void;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

const APPEARANCE_STORAGE_KEY = 'galx_appearance_settings_v1';

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<AppearanceSettings>(DEFAULT_APPEARANCE_SETTINGS);

  // Apply DOM attributes to document.documentElement
  const applyDomAttributes = (s: AppearanceSettings) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.setAttribute('data-theme', s.theme);
    root.setAttribute('data-accent', s.accentColor);
    root.setAttribute('data-density', s.density);
    root.setAttribute('data-font', s.fontFamily);
    root.setAttribute('data-glow', s.ambientGlow ? 'true' : 'false');
    root.setAttribute('data-glass', s.glassmorphism ? 'true' : 'false');
    root.setAttribute('data-animations', s.animationsEnabled ? 'true' : 'false');
  };

  useEffect(() => {
    // 1. Initial load from SafeStorage
    const saved = SafeStorage.getJSON<AppearanceSettings | null>(APPEARANCE_STORAGE_KEY, null);
    if (saved) {
      const merged = { ...DEFAULT_APPEARANCE_SETTINGS, ...saved };
      setSettingsState(merged);
      applyDomAttributes(merged);
    } else {
      applyDomAttributes(DEFAULT_APPEARANCE_SETTINGS);
    }

    // 2. Cross-tab storage change sync
    const unsubscribe = SafeStorage.onStorageChange((key, val) => {
      if (key === APPEARANCE_STORAGE_KEY && val) {
        try {
          const parsed = JSON.parse(val);
          const merged = { ...DEFAULT_APPEARANCE_SETTINGS, ...parsed };
          setSettingsState(merged);
          applyDomAttributes(merged);
        } catch {}
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const persistAndApply = (updated: AppearanceSettings) => {
    setSettingsState(updated);
    SafeStorage.setJSON(APPEARANCE_STORAGE_KEY, updated);
    applyDomAttributes(updated);
  };

  const setTheme = (theme: ThemePreset) => {
    persistAndApply({ ...settings, theme });
  };

  const setAccentColor = (accentColor: AccentColor) => {
    persistAndApply({ ...settings, accentColor });
  };

  const setDensity = (density: InterfaceDensity) => {
    persistAndApply({ ...settings, density });
  };

  const setFontFamily = (fontFamily: CodeFontFamily) => {
    persistAndApply({ ...settings, fontFamily });
  };

  const setAmbientGlow = (ambientGlow: boolean) => {
    persistAndApply({ ...settings, ambientGlow });
  };

  const setGlassmorphism = (glassmorphism: boolean) => {
    persistAndApply({ ...settings, glassmorphism });
  };

  const setAnimationsEnabled = (animationsEnabled: boolean) => {
    persistAndApply({ ...settings, animationsEnabled });
  };

  const setLineNumbers = (lineNumbers: boolean) => {
    persistAndApply({ ...settings, lineNumbers });
  };

  const updateSettings = (newSettings: Partial<AppearanceSettings>) => {
    persistAndApply({ ...settings, ...newSettings });
  };

  const resetAppearance = () => {
    persistAndApply(DEFAULT_APPEARANCE_SETTINGS);
  };

  return (
    <AppearanceContext.Provider
      value={{
        settings,
        setTheme,
        setAccentColor,
        setDensity,
        setFontFamily,
        setAmbientGlow,
        setGlassmorphism,
        setAnimationsEnabled,
        setLineNumbers,
        updateSettings,
        resetAppearance,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
}
