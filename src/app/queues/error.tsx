'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { Layers } from 'lucide-react';

export default function QueuesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Queues Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Task Queue Dashboard Interrupted"
          subtitle="An error occurred while synchronizing background queues. Queued jobs and asynchronous workers continue processing in PostgreSQL."
          badge="TASK QUEUE PERSISTENCE SAFEGUARD"
          icon={Layers}
          accentColor="emerald"
          primaryLinkHref="/"
          primaryLinkLabel="Return Home"
          autoRetrySeconds={6}
        />
      </main>
    </div>
  );
}
