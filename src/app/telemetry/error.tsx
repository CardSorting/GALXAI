'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { Activity } from 'lucide-react';

export default function TelemetryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Telemetry Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Telemetry Stream Interrupted"
          subtitle="The live telemetry chart could not connect to the metrics aggregator. Upstream model routing remains at full capacity."
          badge="REAL-TIME GATEWAY OBSERVABILITY"
          icon={Activity}
          accentColor="cyan"
          primaryLinkHref="/models"
          primaryLinkLabel="Model Catalog"
          autoRetrySeconds={6}
        />
      </main>
    </div>
  );
}
