'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { Cpu } from 'lucide-react';

export default function ModelsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Models Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Model Catalog Sync Interrupted"
          subtitle="The model specification matrix could not be rendered. Try loading the model page again."
          badge="MODEL CATALOG GUARANTEE"
          icon={Cpu}
          accentColor="cyan"
          primaryLinkHref="/"
          primaryLinkLabel="Return Home"
          autoRetrySeconds={8}
        />
      </main>
    </div>
  );
}
