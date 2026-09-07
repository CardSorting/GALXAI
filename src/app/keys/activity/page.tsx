'use client';

import React from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { KeysSubNav } from '@/components/dashboard/KeysSubNav';
import { KeyActivityClient } from '@/components/keys/KeyActivityClient';
import { ErrorBoundary, withErrorBoundary } from '@/components/common/ErrorBoundary';

function BaseKeyActivityPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-zinc-100 font-sans">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Breadcrumbs
          items={[
            { label: 'API Keys', href: '/keys' },
            { label: 'Activity' }
          ]}
        />

        <ErrorBoundary name="Keys Navigation">
          <KeysSubNav />
        </ErrorBoundary>

        <KeyActivityClient />
      </main>
    </div>
  );
}

export default withErrorBoundary(BaseKeyActivityPage, {
  name: 'Key Activity Page'
});
