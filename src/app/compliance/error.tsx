'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { ShieldCheck } from 'lucide-react';

export default function ComplianceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Compliance Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Compliance Ledger Interrupted"
          subtitle="An error occurred while compiling compliance evidence artifacts. The cryptographic audit trail in PostgreSQL remains immutable and intact."
          badge="SOC2 • HIPAA • GDPR AUDIT VAULT"
          icon={ShieldCheck}
          accentColor="emerald"
          primaryLinkHref="/"
          primaryLinkLabel="Return Home"
          autoRetrySeconds={8}
        />
      </main>
    </div>
  );
}
