'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { CircleDollarSign } from 'lucide-react';

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
          title="Pricing could not be loaded"
          subtitle="Please try again. Review the current GALX Images plan."
          badge="GALX PLANS"
          icon={CircleDollarSign}
          accentColor="emerald"
          primaryLinkHref="/pricing"
          primaryLinkLabel="Back to pricing"
          autoRetrySeconds={0}
        />
      </main>
    </div>
  );
}
