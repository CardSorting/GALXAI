'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { TrendingDown } from 'lucide-react';

export default function PricingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Pricing Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Pricing Calculator Interrupted"
          subtitle="An error occurred while compiling wholesale token rates. Standard 25%–40% wholesale discounts remain active across all model routes."
          badge="DISRUPTOR WHOLESALE MATRIX"
          icon={TrendingDown}
          accentColor="emerald"
          primaryLinkHref="/models"
          primaryLinkLabel="Model Catalog"
          autoRetrySeconds={8}
        />
      </main>
    </div>
  );
}
