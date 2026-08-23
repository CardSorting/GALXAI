'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { Key } from 'lucide-react';

export default function AuthConnectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Auth Connect Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Account Connection Interrupted"
          subtitle="An error occurred during account authorization. You can retry the login or connect as a developer guest."
          badge="IDENTITY AUTH SAFEGUARD"
          icon={Key}
          accentColor="indigo"
          primaryLinkHref="/"
          primaryLinkLabel="Return Home"
          autoRetrySeconds={6}
        />
      </main>
    </div>
  );
}
