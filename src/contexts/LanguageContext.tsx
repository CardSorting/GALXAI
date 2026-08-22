'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  LanguageInfo
} from '@/lib/i18n/translations';

interface LanguageContextType {
  language: SupportedLanguage;
  details: LanguageInfo;
  isAutoDetected: boolean;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;
  announceMessage: string;
  announce: (message: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');
  const [isAutoDetected, setIsAutoDetected] = useState(true);
  const [announceMessage, setAnnounceMessage] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if user previously chose a preference manually
    const saved = localStorage.getItem('galx_language_preference') as SupportedLanguage | null;
    if (saved && SUPPORTED_LANGUAGES[saved]) {
      setLanguageState(saved);
      setIsAutoDetected(false);
      applyHtmlLanguage(saved);
      return;
    }

    // Zero-Manual: Automatically Detect Browser Native Language
    const browserLangs = navigator.languages || [navigator.language || 'en'];
    let detected: SupportedLanguage = 'en';

    for (const lang of browserLangs) {
      const code = lang.toLowerCase();
      if (code.startsWith('es')) { detected = 'es'; break; }
      if (code.startsWith('zh')) { detected = 'zh'; break; }
      if (code.startsWith('ja')) { detected = 'ja'; break; }
      if (code.startsWith('de')) { detected = 'de'; break; }
      if (code.startsWith('fr')) { detected = 'fr'; break; }
      if (code.startsWith('pt')) { detected = 'pt'; break; }
      if (code.startsWith('ko')) { detected = 'ko'; break; }
      if (code.startsWith('ar')) { detected = 'ar'; break; }
      if (code.startsWith('en')) { detected = 'en'; break; }
    }

    setLanguageState(detected);
    setIsAutoDetected(true);
    applyHtmlLanguage(detected);
  }, []);

  const applyHtmlLanguage = (lang: SupportedLanguage) => {
    if (typeof document !== 'undefined') {
      const info = SUPPORTED_LANGUAGES[lang];
      document.documentElement.lang = lang;
      document.documentElement.dir = info.dir;
    }
  };

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    setIsAutoDetected(false);
    localStorage.setItem('galx_language_preference', lang);
    applyHtmlLanguage(lang);
  };

  const t = (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    if (dict && dict[key]) {
      return dict[key];
    }
    const enDict = TRANSLATIONS.en;
    if (enDict && enDict[key]) {
      return enDict[key];
    }
    return fallback || key;
  };

  const announce = (message: string) => {
    setAnnounceMessage('');
    setTimeout(() => {
      setAnnounceMessage(message);
    }, 50);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        details: SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.en,
        isAutoDetected,
        setLanguage,
        t,
        announceMessage,
        announce,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
