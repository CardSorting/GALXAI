'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { Lock } from 'lucide-react';

export default function SingleVaultKeyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Key Error Boundary Caught]:', error.message || 'Key resolution error');
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Encrypted Key View Unresolved"
          subtitle="The cryptographic key record or isolated tenant enclave could not be decrypted in the browser session."
          badge="ZERO-RETENTION KEY SAFEGUARD"
          icon={Lock}
          accentColor="cyan"
          primaryLinkHref="/keys"
          primaryLinkLabel="Back to Keys"
          autoRetrySeconds={6}
        />
      </main>
    </div>
  );
}
