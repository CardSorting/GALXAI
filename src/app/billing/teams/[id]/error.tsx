'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { Building2 } from 'lucide-react';

export default function SingleTeamError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Single Team Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Team Cost Center Unresolved"
          subtitle="The requested department budget center or team allocation metrics could not be loaded."
          badge="ENTERPRISE COST CENTER SAFEGUARD"
          icon={Building2}
          accentColor="indigo"
          primaryLinkHref="/billing/teams"
          primaryLinkLabel="Back to Teams"
          autoRetrySeconds={6}
        />
      </main>
    </div>
  );
}
