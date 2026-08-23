'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { CreditCard } from 'lucide-react';

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Checkout Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Checkout Session Interrupted"
          subtitle="An error occurred during the deposit session initialization. No charges have been made to your payment method."
          badge="PAYMENT INTEGRITY SAFEGUARD"
          icon={CreditCard}
          accentColor="emerald"
          primaryLinkHref="/billing"
          primaryLinkLabel="Compute Wallet"
          autoRetrySeconds={8}
        />
      </main>
    </div>
  );
}
