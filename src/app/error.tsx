'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { AlertTriangle } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Root Page Error Boundary Caught]:', error);
  }, [error]);

  return (
    <main className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <RouteErrorBoundaryCard
        error={error}
        reset={reset}
        title="Page View Encountered an Error"
        subtitle="The requested page state could not be rendered, but your session, API keys, and compute wallet remain protected."
        badge="GATEWAY RESILIENCE ACTIVE"
        icon={AlertTriangle}
        accentColor="rose"
        primaryLinkHref="/"
        primaryLinkLabel="Return to Safe Home"
        autoRetrySeconds={8}
      />
    </main>
  );
}
