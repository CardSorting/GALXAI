'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export function SkipToContent() {
  const { t } = useLanguage();

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-cyan-400 focus:text-black focus:font-black focus:text-xs focus:shadow-2xl focus:outline-none focus:ring-4 focus:ring-cyan-300 transition-all font-mono"
    >
      {t('a11y.skip_to_content', 'Skip to main content')}
    </a>
  );
}
