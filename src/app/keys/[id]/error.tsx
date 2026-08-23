'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { Key } from 'lucide-react';

export default function SingleKeyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Single Key Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Gateway Key Unresolved"
          subtitle="The requested API key metadata or rate limit configuration could not be loaded from the registry."
          badge="GATEWAY KEY AUDIT SAFEGUARD"
          icon={Key}
          accentColor="indigo"
          primaryLinkHref="/keys"
          primaryLinkLabel="Back to API Keys"
          autoRetrySeconds={6}
        />
      </main>
    </div>
  );
}
