'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { FileText } from 'lucide-react';

export default function DocsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Docs Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Documentation Page Interrupted"
          subtitle="An error occurred while compiling this documentation article. You can retry rendering or browse the API reference."
          badge="DOCUMENTATION GATEWAY"
          icon={FileText}
          accentColor="cyan"
          primaryLinkHref="/"
          primaryLinkLabel="Return Home"
          autoRetrySeconds={8}
        />
      </main>
    </div>
  );
}
