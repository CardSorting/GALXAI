'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { Wallet } from 'lucide-react';

export default function BillingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Billing Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Billing Ledger Sync Interrupted"
          subtitle="The billing telemetry feed encountered a temporary synchronization issue. Your prepaid balance and ongoing inference requests remain secure."
          badge="COMPUTE WALLET SAFEGUARD"
          icon={Wallet}
          accentColor="amber"
          primaryLinkHref="/keys"
          primaryLinkLabel="View API Keys"
          autoRetrySeconds={6}
        />
      </main>
    </div>
  );
}
