'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { FileText } from 'lucide-react';

export default function SingleInvoiceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Single Invoice Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Invoice Record Unresolved"
          subtitle="The requested tax invoice or receipt statement could not be rendered from the cryptographic ledger."
          badge="TAX & INVOICE SAFEGUARD"
          icon={FileText}
          accentColor="amber"
          primaryLinkHref="/billing/invoices"
          primaryLinkLabel="Back to Invoices"
          autoRetrySeconds={6}
        />
      </main>
    </div>
  );
}
