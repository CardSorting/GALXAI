'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { Play } from 'lucide-react';

export default function PlaygroundError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Playground Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Playground Stream Interrupted"
          subtitle="The interactive prompt sandbox encountered an unexpected state. You can reset the editor workspace or explore the model catalog."
          badge="PLAYGROUND RUNTIME SAFEGUARD"
          icon={Play}
          accentColor="indigo"
          primaryLinkHref="/models"
          primaryLinkLabel="Explore Models"
          autoRetrySeconds={8}
        />
      </main>
    </div>
  );
}
