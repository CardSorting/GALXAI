'use client';
import { BILLING_PATHS } from '@/lib/billing/navigation';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { Key } from 'lucide-react';

export default function KeysError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Keys Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="API Keys View Unavailable"
          subtitle="An error occurred while loading your developer API keys. Active gateway keys continue to route requests normally."
          badge="KEY VAULT ISOLATION ACTIVE"
          icon={Key}
          accentColor="indigo"
          primaryLinkHref={BILLING_PATHS.credits}
          primaryLinkLabel="View credits"
          autoRetrySeconds={6}
        />
      </main>
    </div>
  );
}
