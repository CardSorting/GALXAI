'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { Activity } from 'lucide-react';

export default function StatusError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Status Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="System Status Unreachable"
          subtitle="The status page is temporarily unavailable. Please try again in a moment."
          badge="EDGE HEALTH STATUS"
          icon={Activity}
          accentColor="emerald"
          primaryLinkHref="/"
          primaryLinkLabel="Return Home"
          autoRetrySeconds={6}
        />
      </main>
    </div>
  );
}
