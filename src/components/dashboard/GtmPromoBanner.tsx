'use client';

import React from 'react';
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

function BaseGtmPromoBanner() {
  return null;
}

export const GtmPromoBanner = withErrorBoundary(BaseGtmPromoBanner, {
  name: 'GTM Promo Banner',
  fallback: null
});

