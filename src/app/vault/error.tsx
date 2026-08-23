'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { Lock } from 'lucide-react';

export default function VaultError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Cryptographic Vault Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Cryptographic Vault View Interrupted"
          subtitle="An error occurred while loading the secure shard enclave. Your encrypted secrets and zero-retention parameters remain sealed in memory."
          badge="ENCLAVE PRIVACY SAFEGUARD"
          icon={Lock}
          accentColor="cyan"
          primaryLinkHref="/keys"
          primaryLinkLabel="View API Keys"
          autoRetrySeconds={6}
        />
      </main>
    </div>
  );
}
