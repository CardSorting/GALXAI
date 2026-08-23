'use client';

import React, { useEffect } from 'react';
import { RouteErrorBoundaryCard } from '@/components/common/RouteErrorBoundaryCard';
import { Navigation } from '@/components/dashboard/Navigation';
import { ShieldCheck } from 'lucide-react';

export default function SingleComplianceEvidenceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('💥 [GALXAI Single Compliance Evidence Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <RouteErrorBoundaryCard
          error={error}
          reset={reset}
          title="Compliance Evidence Artifact Unresolved"
          subtitle="The requested SOC2/HIPAA cryptographic evidence certificate could not be rendered from the vault."
          badge="AUDIT ATTESTATION SAFEGUARD"
          icon={ShieldCheck}
          accentColor="emerald"
          primaryLinkHref="/compliance"
          primaryLinkLabel="Back to Compliance"
          autoRetrySeconds={6}
        />
      </main>
    </div>
  );
}
