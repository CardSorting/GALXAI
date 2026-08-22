'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export function AccessibilityAnnouncer() {
  const { announceMessage } = useLanguage();

  if (!announceMessage) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announceMessage}
    </div>
  );
}
