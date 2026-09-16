'use client';
import { BILLING_PATHS } from '@/lib/billing/navigation';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { Gift } from 'lucide-react';

export default function GrantsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Grants Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Grant Claim Service Interrupted"
          subtitle="An error occurred while resolving promotional codes. Your existing compute wallet credits remain untouched."
          badge="DEVELOPER COMPUTE GRANTS"
          icon={Gift}
          accentColor="amber"
          primaryLinkHref={BILLING_PATHS.credits}
          primaryLinkLabel="View credits"
          autoRetrySeconds={8}
        />
      </main>
    </div>
  );
}
