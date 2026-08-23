'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { Activity } from 'lucide-react';

export default function HowItWorksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI How It Works Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Walkthrough View Interrupted"
          subtitle="An error occurred while compiling the interactive walkthrough guide."
          badge="GATEWAY DISCOVERY SAFEGUARD"
          icon={Activity}
          accentColor="cyan"
          primaryLinkHref="/"
          primaryLinkLabel="Return Home"
          autoRetrySeconds={8}
        />
      </main>
    </div>
  );
}
